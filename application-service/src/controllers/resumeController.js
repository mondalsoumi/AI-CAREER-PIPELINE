const prisma = require('../utils/prisma')
const { publishEvent } = require('../services/redisPublisher')
const fs = require('fs')
const path = require('path')

// POST /resumes  (multipart/form-data with field "resume")
const uploadResume = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        if (!userId) return res.status(401).json({ error: 'Unauthorized' })

        if (!req.file) {
            return res.status(400).json({ error: 'No resume file uploaded' })
        }

        const versionName = req.body.versionName || req.file.originalname

        const resume = await prisma.resume.create({
            data: {
                userId,
                versionName,
                fileUrl: `/uploads/${req.file.filename}`,
                textSnippet: req.body.textSnippet || null,
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

// GET /resumes
const getResumes = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        if (!userId) return res.status(401).json({ error: 'Unauthorized' })

        const resumes = await prisma.resume.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        })

        return res.status(200).json({ success: true, data: resumes })
    } catch (err) {
        console.error('[getResumes]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

// GET /resumes/:id
const getResumeById = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        const { id } = req.params

        const resume = await prisma.resume.findFirst({
            where: { id, userId },
            include: { applications: true },
        })

        if (!resume) return res.status(404).json({ error: 'Resume not found' })
        return res.status(200).json({ success: true, data: resume })
    } catch (err) {
        console.error('[getResumeById]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

// DELETE /resumes/:id
const deleteResume = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        const { id } = req.params

        const existing = await prisma.resume.findFirst({ where: { id, userId } })
        if (!existing) return res.status(404).json({ error: 'Resume not found' })

        // Remove the physical file if it exists
        const config = require('../config')
        const filePath = path.join(config.uploadsDir, path.basename(existing.fileUrl))
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }

        await prisma.resume.delete({ where: { id } })

        return res.status(200).json({ success: true, message: 'Resume deleted' })
    } catch (err) {
        console.error('[deleteResume]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

module.exports = { uploadResume, getResumes, getResumeById, deleteResume }
