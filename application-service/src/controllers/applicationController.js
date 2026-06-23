const prisma = require('../utils/prisma')
const { publishEvent } = require('../services/redisPublisher')

// POST /applications
const createApplication = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        if (!userId) return res.status(401).json({ error: 'Unauthorized' })

        const { company, jobTitle, location, jobUrl, sourcePlatform, salaryRange, notes, resumeId } = req.body

        if (!company || !jobTitle || !sourcePlatform) {
            return res.status(400).json({ error: 'company, jobTitle, and sourcePlatform are required' })
        }

        const application = await prisma.application.create({
            data: {
                userId,
                company,
                jobTitle,
                location,
                jobUrl,
                sourcePlatform,
                salaryRange,
                notes,
                resumeId: resumeId || null,
            },
            include: { resume: true, interviews: true },
        })

        await publishEvent('application.created', {
            userId,
            applicationId: application.id,
            sourcePlatform: application.sourcePlatform,
        })

        return res.status(201).json({ success: true, data: application })
    } catch (err) {
        console.error('[createApplication]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

// GET /applications
const getApplications = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        if (!userId) return res.status(401).json({ error: 'Unauthorized' })

        const { stage, sourcePlatform, page = 1, limit = 50 } = req.query
        const where = { userId }
        if (stage) where.stage = stage
        if (sourcePlatform) where.sourcePlatform = sourcePlatform

        const [applications, total] = await Promise.all([
            prisma.application.findMany({
                where,
                include: { resume: true, interviews: true },
                orderBy: { createdAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
            }),
            prisma.application.count({ where }),
        ])

        return res.status(200).json({ success: true, data: applications, total, page: parseInt(page) })
    } catch (err) {
        console.error('[getApplications]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

// GET /applications/:id
const getApplicationById = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        const { id } = req.params

        const application = await prisma.application.findFirst({
            where: { id, userId },
            include: { resume: true, interviews: true },
        })

        if (!application) return res.status(404).json({ error: 'Application not found' })
        return res.status(200).json({ success: true, data: application })
    } catch (err) {
        console.error('[getApplicationById]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

// PUT /applications/:id
const updateApplication = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        const { id } = req.params

        const existing = await prisma.application.findFirst({ where: { id, userId } })
        if (!existing) return res.status(404).json({ error: 'Application not found' })

        const { company, jobTitle, location, jobUrl, sourcePlatform, salaryRange, notes, resumeId, appliedAt } = req.body

        const updated = await prisma.application.update({
            where: { id },
            data: {
                ...(company && { company }),
                ...(jobTitle && { jobTitle }),
                ...(location !== undefined && { location }),
                ...(jobUrl !== undefined && { jobUrl }),
                ...(sourcePlatform && { sourcePlatform }),
                ...(salaryRange !== undefined && { salaryRange }),
                ...(notes !== undefined && { notes }),
                ...(resumeId !== undefined && { resumeId }),
                ...(appliedAt && { appliedAt: new Date(appliedAt) }),
            },
            include: { resume: true, interviews: true },
        })

        await publishEvent('application.updated', {
            userId,
            applicationId: id,
            fieldsChanged: Object.keys(req.body),
        })

        return res.status(200).json({ success: true, data: updated })
    } catch (err) {
        console.error('[updateApplication]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

// PATCH /applications/:id/stage  — dedicated stage-change endpoint
const updateStage = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        const { id } = req.params
        const { stage } = req.body

        const validStages = [
            'SAVED', 'APPLIED', 'ONLINE_ASSESSMENT', 'TECHNICAL_INTERVIEW',
            'MANAGER_ROUND', 'HR_ROUND', 'OFFER', 'REJECTED', 'WITHDRAWN',
        ]

        if (!stage || !validStages.includes(stage)) {
            return res.status(400).json({ error: `Invalid stage. Must be one of: ${validStages.join(', ')}` })
        }

        const existing = await prisma.application.findFirst({ where: { id, userId } })
        if (!existing) return res.status(404).json({ error: 'Application not found' })

        const oldStage = existing.stage

        const updated = await prisma.application.update({
            where: { id },
            data: {
                stage,
                // Auto-set appliedAt when first moved to APPLIED
                ...(stage === 'APPLIED' && !existing.appliedAt && { appliedAt: new Date() }),
            },
            include: { resume: true, interviews: true },
        })

        // This is the ONLY place application.status.changed is published
        await publishEvent('application.status.changed', {
            userId,
            applicationId: id,
            oldStage,
            newStage: stage,
            company: existing.company,
            jobTitle: existing.jobTitle,
        })

        return res.status(200).json({ success: true, data: updated })
    } catch (err) {
        console.error('[updateStage]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

// DELETE /applications/:id
const deleteApplication = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        const { id } = req.params

        const existing = await prisma.application.findFirst({ where: { id, userId } })
        if (!existing) return res.status(404).json({ error: 'Application not found' })

        await prisma.application.delete({ where: { id } })

        return res.status(200).json({ success: true, message: 'Application deleted' })
    } catch (err) {
        console.error('[deleteApplication]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

module.exports = { createApplication, getApplications, getApplicationById, updateApplication, updateStage, deleteApplication }
