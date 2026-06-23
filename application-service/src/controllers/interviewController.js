const prisma = require('../utils/prisma')

// POST /interviews
const createInterview = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        if (!userId) return res.status(401).json({ error: 'Unauthorized' })

        const { applicationId, stageName, scheduledAt, notes } = req.body

        if (!applicationId || !stageName) {
            return res.status(400).json({ error: 'applicationId and stageName are required' })
        }

        // Confirm the application belongs to this user
        const application = await prisma.application.findFirst({ where: { id: applicationId, userId } })
        if (!application) return res.status(404).json({ error: 'Application not found' })

        const interview = await prisma.interview.create({
            data: {
                applicationId,
                stageName,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                notes: notes || null,
            },
        })

        return res.status(201).json({ success: true, data: interview })
    } catch (err) {
        console.error('[createInterview]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

// GET /interviews?applicationId=xxx
const getInterviews = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        const { applicationId } = req.query

        if (!applicationId) return res.status(400).json({ error: 'applicationId query param is required' })

        // Ownership check
        const application = await prisma.application.findFirst({ where: { id: applicationId, userId } })
        if (!application) return res.status(404).json({ error: 'Application not found' })

        const interviews = await prisma.interview.findMany({
            where: { applicationId },
            orderBy: { scheduledAt: 'asc' },
        })

        return res.status(200).json({ success: true, data: interviews })
    } catch (err) {
        console.error('[getInterviews]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

// PUT /interviews/:id
const updateInterview = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        const { id } = req.params
        const { stageName, scheduledAt, notes } = req.body

        const interview = await prisma.interview.findFirst({
            where: { id },
            include: { application: { select: { userId: true } } },
        })

        if (!interview || interview.application.userId !== userId) {
            return res.status(404).json({ error: 'Interview not found' })
        }

        const updated = await prisma.interview.update({
            where: { id },
            data: {
                ...(stageName && { stageName }),
                ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
                ...(notes !== undefined && { notes }),
            },
        })

        return res.status(200).json({ success: true, data: updated })
    } catch (err) {
        console.error('[updateInterview]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

// DELETE /interviews/:id
const deleteInterview = async (req, res) => {
    try {
        const userId = req.headers['x-user-id']
        const { id } = req.params

        const interview = await prisma.interview.findFirst({
            where: { id },
            include: { application: { select: { userId: true } } },
        })

        if (!interview || interview.application.userId !== userId) {
            return res.status(404).json({ error: 'Interview not found' })
        }

        await prisma.interview.delete({ where: { id } })
        return res.status(200).json({ success: true, message: 'Interview deleted' })
    } catch (err) {
        console.error('[deleteInterview]', err)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

module.exports = { createInterview, getInterviews, updateInterview, deleteInterview }
