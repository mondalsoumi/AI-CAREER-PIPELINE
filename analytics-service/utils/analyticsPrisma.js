// Connects to analytics_db — for reading/writing AnalyticsSnapshot
const { PrismaClient } = require('@prisma/client')

const analyticsPrisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
})

module.exports = analyticsPrisma