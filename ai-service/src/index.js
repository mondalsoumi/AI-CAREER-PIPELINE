require('./config') // validates env on boot

const express = require('express')
const cors = require('cors')
const config = require('./config')
const aiRoutes = require('./routes/aiRoutes')

const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' })) // resume text can be large

// Health check
app.get('/health', (req, res) =>
    res.json({ status: 'ok', service: 'ai-service', model: 'gemini-1.5-flash' })
)

// AI routes
app.use('/ai', aiRoutes)

// Global error handler
app.use((err, req, res, next) => {
    console.error('[AI Service Error]', err.message)
    res.status(500).json({ error: 'Internal server error' })
})

app.listen(config.port, () => {
    console.log(`AI Service running on port ${config.port}`)
    console.log(`Model: gemini-1.5-flash`)
})

module.exports = app