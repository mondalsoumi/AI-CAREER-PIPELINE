require('dotenv').config()

const required = ['DATABASE_URL', 'APPLICATION_DATABASE_URL', 'REDIS_URL', 'PORT']

required.forEach((key) => {
    if (!process.env[key]) {
        console.error(`FATAL: Missing required environment variable: ${key}`)
        process.exit(1)
    }
})

module.exports = {
    port: parseInt(process.env.PORT, 10) || 8003,
    databaseUrl: process.env.DATABASE_URL,
    applicationDatabaseUrl: process.env.APPLICATION_DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    nodeEnv: process.env.NODE_ENV || 'development',
    cacheExpiry: 60, // seconds
}