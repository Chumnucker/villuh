import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import {
  signUpTestUser,
  markUserEmailVerified,
  signInAndActivateOrg,
  clearTestUsers,
  getCurrentUserId,
  createTrpcCaller,
} from './setup.js'

// S3 is mocked for all gallery tests — no real bucket required (Assumption A6).
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function S3ClientMock() {
    return { send: vi.fn() }
  }),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}))
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.mock/presigned-url'),
}))

vi.mock('../modules/email/index.js', () => ({
  resend: { emails: { send: vi.fn().mockResolvedValue({ id: 'mock' }) } },
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendResetPasswordEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}))

beforeAll(async () => {
  await clearTestUsers()
})
afterAll(async () => {
  await clearTestUsers()
})

async function setupOwnerWithProperty(email: string) {
  await signUpTestUser(email, 'TestPass123!', 'Owner')
  const userId = await getCurrentUserId(email)
  await markUserEmailVerified(userId)
  const { cookie } = await signInAndActivateOrg(email, 'TestPass123!')
  const caller = await createTrpcCaller(cookie)
  const { property } = await caller.properties.create({ name: 'Gallery Property' })
  return { caller, property }
}

describe('PROP-01 Gallery: Presign + upload limits (D-34, D-36, D-38)', () => {
  it('presignPropertyImage rejects when the property already has 25 images (D-34)', async () => {
    const { caller, property } = await setupOwnerWithProperty('gallery1@test.local')

    for (let i = 0; i < 25; i++) {
      await caller.properties.gallery.add({
        propertyId: property.id,
        objectKey: `orgtest/properties/${property.id}/gallery/img-${i}.jpg`,
        contentType: 'image/jpeg',
        byteLength: 1000,
      })
    }

    await expect(
      caller.uploads.presignPropertyImage({
        propertyId: property.id,
        contentType: 'image/jpeg',
        byteLength: 1000,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('presignPropertyImage rejects unsupported MIME types (only JPEG/PNG/WebP/GIF allowed)', async () => {
    const { caller, property } = await setupOwnerWithProperty('gallery2@test.local')

    await expect(
      caller.uploads.presignPropertyImage({
        propertyId: property.id,
        // @ts-expect-error — intentionally invalid MIME to exercise the Zod allowlist rejection
        contentType: 'image/heic',
        byteLength: 1000,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('presignPropertyImage rejects files over 10MB before signing (D-36)', async () => {
    const { caller, property } = await setupOwnerWithProperty('gallery3@test.local')

    await expect(
      caller.uploads.presignPropertyImage({
        propertyId: property.id,
        contentType: 'image/jpeg',
        byteLength: 11 * 1024 * 1024,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('presigned response never includes a full URL for storage — only objectKey is persisted (D-38)', async () => {
    const { caller, property } = await setupOwnerWithProperty('gallery4@test.local')

    const { uploadUrl, objectKey } = await caller.uploads.presignPropertyImage({
      propertyId: property.id,
      contentType: 'image/jpeg',
      byteLength: 2048,
    })
    expect(uploadUrl).toBe('https://s3.mock/presigned-url')
    expect(objectKey).not.toMatch(/^https?:\/\//)
    expect(objectKey).toContain(`properties/${property.id}/gallery/`)

    const { image } = await caller.properties.gallery.add({
      propertyId: property.id,
      objectKey,
      contentType: 'image/jpeg',
      byteLength: 2048,
    })
    expect(image.objectKey).toBe(objectKey)

    const { images } = await caller.properties.gallery.list({ propertyId: property.id })
    const found = images.find((img) => img.id === image.id)
    expect(found?.url).toBe('https://s3.mock/presigned-url')
  })
})

describe('PROP-01 Gallery: Cover + ordering (D-35)', () => {
  it('the first image in sort order is treated as the property cover image', async () => {
    const { caller, property } = await setupOwnerWithProperty('gallery5@test.local')

    const { image: img1 } = await caller.properties.gallery.add({
      propertyId: property.id,
      objectKey: 'k1.jpg',
      contentType: 'image/jpeg',
      byteLength: 1000,
    })
    const { image: img2 } = await caller.properties.gallery.add({
      propertyId: property.id,
      objectKey: 'k2.jpg',
      contentType: 'image/jpeg',
      byteLength: 1000,
    })

    await caller.properties.gallery.reorder({ propertyId: property.id, imageIds: [img2.id, img1.id] })

    const { images } = await caller.properties.gallery.list({ propertyId: property.id })
    const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder)
    expect(sorted[0]?.id).toBe(img2.id)
    expect(sorted[0]?.sortOrder).toBe(0)
  })
})

describe('PROP-01 Gallery: Delete (D-37)', () => {
  it('deleting a gallery image issues an S3 DeleteObjectCommand and removes the DB row in the same operation', async () => {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
    const { caller, property } = await setupOwnerWithProperty('gallery6@test.local')

    const { image } = await caller.properties.gallery.add({
      propertyId: property.id,
      objectKey: 'to-delete.jpg',
      contentType: 'image/jpeg',
      byteLength: 1000,
    })

    await caller.properties.gallery.remove({ propertyId: property.id, imageId: image.id })

    expect(DeleteObjectCommand).toHaveBeenCalled()

    const { images } = await caller.properties.gallery.list({ propertyId: property.id })
    expect(images.find((img) => img.id === image.id)).toBeUndefined()
  })
})
