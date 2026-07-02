// minio.js — MinIO client wrapper
// Uses @aws-sdk/client-s3 which speaks the same API as MinIO
// forcePathStyle: true is required for MinIO (S3 uses virtual-hosted style)

const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    CreateBucketCommand,
    HeadBucketCommand,
} = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const BUCKET = process.env.MINIO_BUCKET || 'resumes'
const ENDPOINT = process.env.MINIO_ENDPOINT || 'http://localhost:9000'
const USER = process.env.MINIO_ROOT_USER || 'minioadmin'
const PASS = process.env.MINIO_ROOT_PASSWORD || 'minioadmin'

const s3 = new S3Client({
    endpoint: ENDPOINT,
    region: process.env.MINIO_REGION || 'us-east-1', // MinIO ignores region; R2 uses 'auto'
    credentials: {
        accessKeyId: USER,
        secretAccessKey: PASS,
    },
    forcePathStyle: true, // required for MinIO; harmless for R2
    // Required for Cloudflare R2 compatibility — newer SDK versions send
    // checksum headers by default that R2 doesn't fully support.
    // No effect on MinIO, safe to keep for both.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
})

// ─── Ensure bucket exists on startup ─────────────────────────────────────────
async function ensureBucket() {
    try {
        await s3.send(new HeadBucketCommand({ Bucket: BUCKET }))
        console.log(`[MinIO] Bucket "${BUCKET}" exists`)
    } catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            await s3.send(new CreateBucketCommand({ Bucket: BUCKET }))
            console.log(`[MinIO] Bucket "${BUCKET}" created`)
        } else {
            console.error('[MinIO] Error checking bucket:', err.message)
        }
    }
}

// ─── Upload file buffer to MinIO ──────────────────────────────────────────────
async function uploadFile(buffer, filename, mimetype) {
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: mimetype,
    }))
    return filename // return the key — generate URL on demand
}

// ─── Generate a presigned download URL (valid 1 hour) ────────────────────────
async function getFileUrl(filename) {
    return getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: filename }),
        { expiresIn: 3600 }
    )
}

// ─── Delete file from MinIO ───────────────────────────────────────────────────
async function deleteFile(filename) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: filename }))
}

module.exports = { ensureBucket, uploadFile, getFileUrl, deleteFile }