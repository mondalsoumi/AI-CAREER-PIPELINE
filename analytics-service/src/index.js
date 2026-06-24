require('dotenv').config()
const config = require('./config')
const app = require('./app')
const { startSubscriber } = require('./services/subscriber')
const analyticsPrisma = require('../utils/analyticsPrisma')
const appPrisma = require('../utils/appPrisma')

async function main() {
    await analyticsPrisma.$connect()
    console.log('[Prisma] analyticsPrisma connected')

    await appPrisma.$connect()
    console.log('[Prisma] appPrisma connected')

    await startSubscriber()

    app.listen(config.port, () => {
        console.log(`[Server] analytics-service running on port ${config.port}`)
    })
}

main().catch((err) => {
    console.error('[FATAL] Startup failed:', err)
    process.exit(1)
})