// calculator.js
// Reads raw applications from application_db and computes all metrics.
// Called when a Redis event arrives OR when the cache misses on GET /analytics.

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

// ─── Main compute function ────────────────────────────────────────────────────

async function computeAndStore(userId) {
    console.log(`[Calculator] Computing analytics for user ${userId}`)

    // Fetch all applications for this user from application_db
    // We use $queryRaw because analytics-service doesn't own the Application model
    const applications = await appPrisma.$queryRaw`
    SELECT
      id,
      company,
      "jobTitle",
      "sourcePlatform",
      stage,
      "resumeId",
      "appliedAt",
      "createdAt"
    FROM "Application"
    WHERE "userId" = ${userId}
  `

    const total = applications.length

    if (total === 0) {
        // Store an empty snapshot — avoids recomputing on every empty request
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
        await invalidateCache(userId)
        return snapshot
    }

    // ── Rates ──────────────────────────────────────────────────────────────────
    const interviewCount = applications.filter((a) =>
        INTERVIEW_STAGES.includes(a.stage)
    ).length
    const offerCount = applications.filter((a) => a.stage === 'OFFER').length
    const rejectedCount = applications.filter((a) => a.stage === 'REJECTED').length

    const interviewRate = parseFloat(((interviewCount / total) * 100).toFixed(1))
    const offerRate = parseFloat(((offerCount / total) * 100).toFixed(1))
    const rejectionRate = parseFloat(((rejectedCount / total) * 100).toFixed(1))

    // ── Source breakdown ───────────────────────────────────────────────────────
    // e.g. { "LinkedIn": 12, "Naukri": 5, "Referral": 3 }
    const sourceBreakdown = applications.reduce((acc, a) => {
        const src = a.sourcePlatform || 'Unknown'
        acc[src] = (acc[src] || 0) + 1
        return acc
    }, {})

    // ── Stage breakdown ────────────────────────────────────────────────────────
    // e.g. { "APPLIED": 10, "REJECTED": 8, "OFFER": 2 }
    const stageBreakdown = applications.reduce((acc, a) => {
        acc[a.stage] = (acc[a.stage] || 0) + 1
        return acc
    }, {})

    // ── Monthly trends ─────────────────────────────────────────────────────────
    // e.g. { "Jan 2026": 4, "Feb 2026": 8, "Mar 2026": 12 }
    const monthlyTrends = applications.reduce((acc, a) => {
        const date = new Date(a.createdAt)
        const key = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})

    // ── Resume breakdown ───────────────────────────────────────────────────────
    // For each resume, count total applications and how many reached interview+
    // e.g. { "Resume v1": { total: 10, interviews: 3, offers: 1 } }
    const resumeBreakdown = {}
    applications.forEach((a) => {
        if (!a.resumeId) return
        if (!resumeBreakdown[a.resumeId]) {
            resumeBreakdown[a.resumeId] = { total: 0, interviews: 0, offers: 0 }
        }
        resumeBreakdown[a.resumeId].total++
        if (INTERVIEW_STAGES.includes(a.stage)) resumeBreakdown[a.resumeId].interviews++
        if (a.stage === 'OFFER') resumeBreakdown[a.resumeId].offers++
    })

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

    // Invalidate cache so next GET reads this fresh snapshot
    await invalidateCache(userId)

    console.log(`[Calculator] Snapshot stored for ${userId}: ${total} apps, ${interviewRate}% interview rate`)
    return snapshot
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function cacheKey(userId) {
    return `analytics:${userId}`
}

async function invalidateCache(userId) {
    try {
        await cache.del(cacheKey(userId))
    } catch (err) {
        console.error('[Calculator] Cache invalidation failed:', err.message)
    }
}

async function getCached(userId) {
    try {
        const raw = await cache.get(cacheKey(userId))
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

async function setCached(userId, data) {
    try {
        await cache.set(cacheKey(userId), JSON.stringify(data), 'EX', config.cacheExpiry)
    } catch (err) {
        console.error('[Calculator] Cache set failed:', err.message)
    }
}

module.exports = { computeAndStore, getCached, setCached, cacheKey }