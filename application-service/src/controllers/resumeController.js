const prisma = require('../utils/prisma')
const { publishEvent } = require('../services/redisPublisher')
const { uploadFile, getFileUrl, deleteFile } = require('../utils/minio')
const { PdfReader } = require('pdfreader')
const fs = require('fs')
const path = require('path')

// ─── Helper: extract text from PDF buffer using pdfreader ─────────────────────
function extractTextFromBuffer(buffer) {
    return new Promise((resolve, reject) => {
        const lines = {}

        new PdfReader().parseBuffer(buffer, (err, item) => {
            if (err) { reject(err); return }

            if (!item) {
                // End of file — join all collected lines sorted by Y position
                const fullText = Object.keys(lines)
                    .sort((a, b) => parseFloat(a) - parseFloat(b))
                    .map((y) => lines[y].join(' '))
                    .join('\n')
                resolve(fullText)
                return
            }

            if (item.text) {
                const y = String(item.y)
                if (!lines[y]) lines[y] = []
                lines[y].push(item.text)
            }
        })
    })
}

// ─── POST /resumes ────────────────────────────────────────────────────────────
// Uploads PDF to MinIO, extracts text snippet, saves record to DB
const uploadResume = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        if (!userId) return res.status(401).json({ error: 'Unauthorized' })
        if (!req.file) return res.status(400).json({ error: 'No resume file uploaded' })

        const versionName = req.body.versionName || req.file.originalname
        const filename = `resume_${userId}_${Date.now()}.pdf`

        // 1. Upload to MinIO
        await uploadFile(req.file.buffer, filename, req.file.mimetype)

        // 2. Extract text from the same buffer for AI matching later
        let textSnippet = null
        try {
            const fullText = await extractTextFromBuffer(req.file.buffer)
            // Store first 2000 chars as snippet — enough for AI matching
            textSnippet = fullText.trim().slice(0, 2000) || null
        } catch (extractErr) {
            // Text extraction failing should NOT block the upload
            console.warn('[uploadResume] Text extraction failed:', extractErr.message)
        }

        // 3. Save record to DB — store filename as key, generate URL on demand
        const resume = await prisma.resume.create({
            data: {
                userId,
                versionName,
                fileUrl: filename, // MinIO object key
                textSnippet,
            },
        })

        await publishEvent('resume.uploaded', {
            userId,
            resumeId: resume.id,
            versionName: resume.versionName,
        })

        return res.status(201).json({ success: true, data: resume })
    } catch (err) {
        console.error('[uploadResume]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

// ─── POST /resumes/extract-text ───────────────────────────────────────────────
// Accepts PDF upload, extracts and returns text — does NOT save to DB
// Used by AI Center to populate resume textarea before analysis
const extractResumeText = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        if (!userId) return res.status(401).json({ error: 'Unauthorized' })
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
        if (req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({ error: 'Only PDF files are supported' })
        }

        const text = await extractTextFromBuffer(req.file.buffer)

        const cleaned = text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim()

        return res.status(200).json({
            success: true,
            data: { text: cleaned },
        })
    } catch (err) {
        console.error('[extractResumeText]', err)
        return res.status(500).json({ error: 'Failed to extract text from PDF' })
    }
}

// ─── GET /resumes ─────────────────────────────────────────────────────────────
const getResumes = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        if (!userId) return res.status(401).json({ error: 'Unauthorized' })

        const resumes = await prisma.resume.findMany({
            where: { userId },
            include: { _count: { select: { applications: true } } },
            orderBy: { createdAt: 'desc' },
        })

        // Generate presigned download URLs for each resume
        const resumesWithUrls = await Promise.all(
            resumes.map(async (r) => {
                let downloadUrl = null
                try {
                    downloadUrl = await getFileUrl(r.fileUrl)
                } catch {
                    // URL generation failing shouldn't break the list
                }
                return { ...r, downloadUrl }
            })
        )

        return res.status(200).json({ success: true, data: resumesWithUrls })
    } catch (err) {
        console.error('[getResumes]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

// ─── GET /resumes/:id ─────────────────────────────────────────────────────────
const getResumeById = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        const { id } = req.params
        const resume = await prisma.resume.findFirst({
            where: { id, userId },
            include: {
                applications: {
                    select: {
                        id: true,
                        company: true,
                        jobTitle: true,
                        stage: true,
                        appliedAt: true,
                        sourcePlatform: true,
                    },
                    orderBy: { appliedAt: 'desc' },  // ← moved inside applications, not a sibling of it
                },
                _count: { select: { applications: true } },
            },
        })

        if (!resume) return res.status(404).json({ error: 'Resume not found' })

        let downloadUrl = null
        try {
            downloadUrl = await getFileUrl(resume.fileUrl)
        } catch { }

        return res.status(200).json({ success: true, data: { ...resume, downloadUrl } })
    } catch (err) {
        console.error('[getResumeById]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

// ─── DELETE /resumes/:id ──────────────────────────────────────────────────────
const deleteResume = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        const { id } = req.params

        const existing = await prisma.resume.findFirst({ where: { id, userId } })
        if (!existing) return res.status(404).json({ error: 'Resume not found' })

        // Delete from MinIO
        try {
            await deleteFile(existing.fileUrl)
        } catch (minioErr) {
            console.warn('[deleteResume] MinIO delete failed:', minioErr.message)
        }

        await prisma.resume.delete({ where: { id } })

        return res.status(200).json({ success: true, message: 'Resume deleted' })
    } catch (err) {
        console.error('[deleteResume]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

module.exports = {
    uploadResume,
    extractResumeText,
    getResumes,
    getResumeById,
    deleteResume,
}