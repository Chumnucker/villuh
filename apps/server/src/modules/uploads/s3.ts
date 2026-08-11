import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Lazy singleton — avoids constructing a real S3Client (and touching AWS_* env) at
// module import time; only needed when a gallery mutation actually runs.
let client: S3Client | null = null

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION,
      ...(process.env.S3_ENDPOINT
        ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
        : {}),
    })
  }
  return client
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET
  if (!bucket) throw new Error('S3_BUCKET is not configured')
  return bucket
}

export async function presignPut(opts: {
  objectKey: string
  contentType: string
  expiresIn?: number
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: opts.objectKey,
    ContentType: opts.contentType,
  })
  return getSignedUrl(getClient(), command, { expiresIn: opts.expiresIn ?? 900 })
}

export async function presignGet(opts: { objectKey: string; expiresIn?: number }): Promise<string> {
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: opts.objectKey })
  return getSignedUrl(getClient(), command, { expiresIn: opts.expiresIn ?? 300 })
}

export async function deleteObject(opts: { objectKey: string }): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: opts.objectKey }))
}
