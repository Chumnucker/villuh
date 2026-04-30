import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { testTenantData } from '../schema/landlords.js'
import { createAppClient, createOwnerClient, withTestTenant } from './setup.js'

const LANDLORD_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const LANDLORD_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const ROW_A_ID = 'a0000001-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const ROW_B_ID = 'b0000001-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

const owner = createOwnerClient()
const app = createAppClient()

beforeAll(async () => {
  await owner.db
    .insert(testTenantData)
    .values({ id: ROW_A_ID, landlordId: LANDLORD_A, data: 'landlord-a-data' })
    .onConflictDoNothing()

  await owner.db
    .insert(testTenantData)
    .values({ id: ROW_B_ID, landlordId: LANDLORD_B, data: 'landlord-b-data' })
    .onConflictDoNothing()
})

const AUDIT_LANDLORD = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

afterAll(async () => {
  await owner.db.delete(testTenantData).where(eq(testTenantData.landlordId, LANDLORD_A))
  await owner.db.delete(testTenantData).where(eq(testTenantData.landlordId, LANDLORD_B))
  await owner.db.delete(testTenantData).where(eq(testTenantData.landlordId, AUDIT_LANDLORD))
  await owner.end()
  await app.end()
})

describe('RLS: cross-tenant isolation', () => {
  it('landlord A cannot see landlord B rows', async () => {
    const results = await withTestTenant(app.db, LANDLORD_A, 'system', async (tx) => {
      return tx.select().from(testTenantData)
    })
    expect(results.some((row) => row.landlordId === LANDLORD_B)).toBe(false)
  })

  it('landlord A sees only their own rows', async () => {
    const results = await withTestTenant(app.db, LANDLORD_A, 'system', async (tx) => {
      return tx.select().from(testTenantData)
    })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((row) => row.landlordId === LANDLORD_A)).toBe(true)
  })

  it('landlord B sees only their own rows', async () => {
    const results = await withTestTenant(app.db, LANDLORD_B, 'system', async (tx) => {
      return tx.select().from(testTenantData)
    })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((row) => row.landlordId === LANDLORD_B)).toBe(true)
  })

  it('no context set = zero rows visible (RLS blocks all)', async () => {
    // When app.current_landlord_id is unset, current_setting returns ''.
    // Casting '' to uuid raises an error — which is still a complete access denial.
    // Either 0 rows or a uuid-cast error satisfies the security invariant.
    try {
      const results = await app.db.execute(sql`SELECT * FROM test_tenant_data`)
      expect(results.length).toBe(0)
    } catch (e) {
      const err = e as Error & { cause?: Error }
      const msg = err.message + (err.cause?.message ?? '')
      expect(msg).toMatch(/uuid|permission|denied/)
    }
  })
})

describe('Audit log: write and immutability', () => {
  const TEST_ACTOR = 'test-user-integration-123'
  const AUDIT_ROW_ID = 'c0000001-cccc-cccc-cccc-cccccccccccc'

  it('writes an audit row on INSERT with correct actor_id', async () => {
    await owner.db.delete(testTenantData).where(eq(testTenantData.id, AUDIT_ROW_ID))

    const before = await owner.db.execute(
      sql`SELECT count(*) FROM audit_log WHERE row_id = ${AUDIT_ROW_ID}::uuid AND operation = 'INSERT'`
    )
    const countBefore = Number((before[0] as Record<string, unknown>)['count'])

    await withTestTenant(app.db, AUDIT_LANDLORD, TEST_ACTOR, async (tx) => {
      await tx.insert(testTenantData).values({
        id: AUDIT_ROW_ID,
        landlordId: AUDIT_LANDLORD,
        data: 'audit-test-data',
      })
    })

    const after = await owner.db.execute(
      sql`SELECT * FROM audit_log WHERE row_id = ${AUDIT_ROW_ID}::uuid AND operation = 'INSERT' ORDER BY created_at DESC LIMIT 1`
    )

    expect(after.length).toBe(1)
    const row = after[0] as Record<string, unknown>
    expect(row['table_name']).toBe('test_tenant_data')
    expect(row['operation']).toBe('INSERT')
    expect(row['actor_id']).toBe(TEST_ACTOR)
    expect(row['landlord_id']).toBe(AUDIT_LANDLORD)

    const countAfter = await owner.db.execute(
      sql`SELECT count(*) FROM audit_log WHERE row_id = ${AUDIT_ROW_ID}::uuid AND operation = 'INSERT'`
    )
    expect(Number((countAfter[0] as Record<string, unknown>)['count'])).toBe(countBefore + 1)
  })

  it('audit_log rows are immutable — UPDATE raises an exception', async () => {
    const auditRows = await owner.db.execute(sql`SELECT id FROM audit_log LIMIT 1`)

    if (auditRows.length === 0) {
      console.warn('No audit rows found — skipping immutability test')
      return
    }

    const auditId = (auditRows[0] as Record<string, unknown>)['id']

    await expect(
      owner.db.execute(sql`UPDATE audit_log SET actor_id = 'tampered' WHERE id = ${auditId}::uuid`)
    ).rejects.toSatisfy((err: unknown) => {
      const e = err as Error & { cause?: Error }
      return /immutable/.test(e.message) || /immutable/.test(e.cause?.message ?? '')
    })
  })
})
