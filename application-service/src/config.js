require('dotenv').config()

const required = ['DATABASE_URL', 'REDIS_URL', 'PORT']

required.forEach((key) => {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`)
    process.exit(1)
  }
})

module.exports = {
  port: parseInt(process.env.PORT, 10) || 8002,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  uploadsDir: process.env.UPLOADS_DIR || '/app/uploads',
  nodeEnv: process.env.NODE_ENV || 'development',
}
