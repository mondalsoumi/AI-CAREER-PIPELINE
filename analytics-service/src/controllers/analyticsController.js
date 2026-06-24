const analyticsPrisma = require('../../utils/analyticsPrisma')
const { computeAndStore, getCached, setCached } = require('../services/calculator')

const getAnalytics = async (req, res) => {
    const userId = req.headers['x-user-id']
    if (!userId) return res.status(400).json({ error: 'Missing x-user-id header' })

    try {
        const cached = await getCached(userId)
        if (cached) return res.json({ source: 'cache', data: cached })

        const snapshot = await analyticsPrisma.analyticsSnapshot.findFirst({
            where: { userId },
            orderBy: { computedAt: 'desc' },
        })

        if (snapshot) {
            await setCached(userId, snapshot)
            return res.json({ source: 'db', data: snapshot })
        }

        const fresh = await computeAndStore(userId)
        await setCached(userId, fresh)
        return res.json({ source: 'computed', data: fresh })
    } catch (err) {
        console.error('[analyticsController]', err.message)
        return res.status(500).json({ error: 'Failed to fetch analytics' })
    }
}

module.exports = { getAnalytics }