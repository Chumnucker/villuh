import { describe, it, expect, vi } from 'vitest'

// S3 is mocked for all gallery tests — no real bucket required (Assumption A6).
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: vi.fn() })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}))
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.mock/presigned-url'),
}))

describe('PROP-01 Gallery: Presign + upload limits (D-34, D-36, D-38)', () => {
  it('presignPropertyImage rejects when the property already has 25 images (D-34)', () => {
    expect.fail('TODO: Plan 03-03 implements uploads.presignPropertyImage max-25 check')
  })
  it('presignPropertyImage rejects unsupported MIME types (only JPEG/PNG/WebP/GIF allowed)', () => {
    expect.fail('TODO: Plan 03-03 implements uploads.presignPropertyImage MIME allowlist')
  })
  it('presignPropertyImage rejects files over 10MB before signing (D-36)', () => {
    expect.fail('TODO: Plan 03-03 implements uploads.presignPropertyImage byte-size check')
  })
  it('presigned response never includes a full URL for storage — only objectKey is persisted (D-38)', () => {
    expect.fail('TODO: Plan 03-03 implements gallery.add storing objectKey only')
  })
})

describe('PROP-01 Gallery: Cover + ordering (D-35)', () => {
  it('the first image in sort order is treated as the property cover image', () => {
    expect.fail('TODO: Plan 03-07 implements gallery reorder + cover semantics')
  })
})

describe('PROP-01 Gallery: Delete (D-37)', () => {
  it('deleting a gallery image issues an S3 DeleteObjectCommand and removes the DB row in the same operation', () => {
    expect.fail('TODO: Plan 03-03 implements gallery.delete (S3 + row, no soft-delete)')
  })
})
