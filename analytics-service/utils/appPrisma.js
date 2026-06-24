// Connects to application_db — read-only access to compute metrics
// We use PrismaClient with a raw URL override so this service
// doesn't need the application-service schema file.
// We use $queryRaw for all reads here.

const { PrismaClient } = require('@prisma/client')

const appPrisma = new PrismaClient({
    datasources: { db: { url: process.env.APPLICATION_DATABASE_URL } },
    log: ['error'],
})

module.exports = appPrisma