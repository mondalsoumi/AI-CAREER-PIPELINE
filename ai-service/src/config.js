require('dotenv').config()

const required = ['GEMINI_API_KEY', 'PORT']

required.forEach((key) => {
    if (!process.env[key]) {
        console.error(`FATAL: Missing required environment variable: ${key}`)
        process.exit(1)
    }
})

module.exports = {
    port: parseInt(process.env.PORT, 10) || 8004,
    geminiApiKey: process.env.GEMINI_API_KEY,
    nodeEnv: process.env.NODE_ENV || 'development',
}