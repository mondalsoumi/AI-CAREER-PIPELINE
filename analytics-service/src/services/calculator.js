// calculator.js — fixed version
// Changes from original:
// 1. resumeBreakdown now computed and stored (which was missing from main snapshot)
// 2. Old snapshots deleted after each new one — prevents infinite accumulation
// 3. resumeBreakdown uses resume versionName, not raw resumeId UUID

const appPrisma = require('../../utils/appPrisma')
const analyticsPrisma = require('../../utils/analyticsPrisma')
const { cache } = require('../../utils/redis')
const config = require('../config')

const INTERVIEW_STAGES = [
    'ONLINE_ASSESSMENT',
    'TECHNICAL_INTERVIEW',
    'MANAGER_ROUND',
    'HR_ROUND',
]

async function computeAndStore(userId) {
    console.log(`[Calculator] Computing analytics for user ${userId}`)

    const applications = await appPrisma.$queryRaw`
    SELECT
      a.id,
      a.company,
      a."jobTitle",
      a."sourcePlatform",
      a.stage,
      a."resumeId",
      a."appliedAt",
      a."createdAt",
      r."versionName" AS "resumeVersionName"
    FROM "Application" a
    LEFT JOIN "Resume" r ON r.id = a."resumeId"
    WHERE a."userId" = ${userId}
  `

    const total = applications.length

    if (total === 0) {
        const snapshot = await analyticsPrisma.analyticsSnapshot.create({
            data: {
                userId,
                totalApplications: 0,
                interviewRate: 0,
                offerRate: 0,
                rejectionRate: 0,
                sourceBreakdown: {},
                stageBreakdown: {},
                monthlyTrends: {},
                resumeBreakdown: {},
            },
        })
        // Cleanup old snapshots — keep only this one
        await analyticsPrisma.analyticsSnapshot.deleteMany({
            where: { userId, id: { not: snapshot.id } },
        })
        await invalidateCache(userId)
        return snapshot
    }

    // ── Rates ──────────────────────────────────────────────────────────────────
    const interviewCount = applications.filter((a) => INTERVIEW_STAGES.includes(a.stage)).length
    const offerCount = applications.filter((a) => a.stage === 'OFFER').length
    const rejectedCount = applications.filter((a) => a.stage === 'REJECTED').length

    const interviewRate = parseFloat(((interviewCount / total) * 100).toFixed(1))
    const offerRate = parseFloat(((offerCount / total) * 100).toFixed(1))
    const rejectionRate = parseFloat(((rejectedCount / total) * 100).toFixed(1))

    // ── Source breakdown ───────────────────────────────────────────────────────
    const sourceBreakdown = applications.reduce((acc, a) => {
        const src = a.sourcePlatform || 'Unknown'
        acc[src] = (acc[src] || 0) + 1
        return acc
    }, {})

    // ── Stage breakdown ────────────────────────────────────────────────────────
    const stageBreakdown = applications.reduce((acc, a) => {
        acc[a.stage] = (acc[a.stage] || 0) + 1
        return acc
    }, {})

    // ── Monthly trends ─────────────────────────────────────────────────────────
    const monthlyTrends = applications.reduce((acc, a) => {
        const date = new Date(a.createdAt)
        const key = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})

    // ── Resume breakdown ───────────────────────────────────────────────────────
    // Key: resume version name (e.g. "Software Engineer v2"), not the UUID
    // Value: { total, interviews, offers }
    // Applications with no resume linked are counted under "No resume"
    const resumeBreakdown = applications.reduce((acc, a) => {
        const key = a.resumeVersionName || 'No resume'
        if (!acc[key]) acc[key] = { total: 0, interviews: 0, offers: 0 }
        acc[key].total++
        if (INTERVIEW_STAGES.includes(a.stage)) acc[key].interviews++
        if (a.stage === 'OFFER') acc[key].offers++
        return acc
    }, {})

    // ── Store snapshot ─────────────────────────────────────────────────────────
    const snapshot = await analyticsPrisma.analyticsSnapshot.create({
        data: {
            userId,
            totalApplications: total,
            interviewRate,
            offerRate,
            rejectionRate,
            sourceBreakdown,
            stageBreakdown,
            monthlyTrends,
            resumeBreakdown,
        },
    })

    // Cleanup — keep only the snapshot we just created, delete all previous ones
    await analyticsPrisma.analyticsSnapshot.deleteMany({
        where: { userId, id: { not: snapshot.id } },
    })

    await invalidateCache(userId)
    console.log(`[Calculator] Snapshot stored for ${userId}: ${total} apps, ${interviewRate}% interview rate`)
    return snapshot
}

// ─── Cache helpers ────────────────────────────────────────────────────────────
function cacheKey(userId) { return `analytics:${userId}` }

async function invalidateCache(userId) {
    try { await cache.del(cacheKey(userId)) }
    catch (err) { console.error('[Calculator] Cache invalidation failed:', err.message) }
}

async function getCached(userId) {
    try {
        const raw = await cache.get(cacheKey(userId))
        return raw ? JSON.parse(raw) : null
    } catch { return null }
}

async function setCached(userId, data) {
    try { await cache.set(cacheKey(userId), JSON.stringify(data), 'EX', config.cacheExpiry) }
    catch (err) { console.error('[Calculator] Cache set failed:', err.message) }
}

module.exports = { computeAndStore, getCached, setCached, cacheKey }