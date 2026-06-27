require('./config') // validates env vars on boot

const express = require('express')
const { ensureBucket } = require('./utils/minio')
const cors = require('cors')
const path = require('path')
const config = require('./config')

const applicationRoutes = require('./routes/applicationRoutes')
const resumeRoutes = require('./routes/resumeRoutes')
const interviewRoutes = require('./routes/interviewRoutes')

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded files statically (so frontend can download resumes)
app.use('/uploads', express.static(config.uploadsDir))

// Routes
app.use('/applications', applicationRoutes)
app.use('/resumes', resumeRoutes)
app.use('/interviews', interviewRoutes)

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'application-service' }))

// Global error handler
app.use((err, req, res, next) => {
    console.error('[Unhandled Error]', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
})
async function start() {
    try {
        await ensureBucket()
    } catch (err) {
        // MinIO not available — log warning but don't crash
        // Service still works for non-resume endpoints
        console.warn('[Startup] MinIO not available:', err.message)
        console.warn('[Startup] Resume upload to MinIO will fail until MinIO is running')
    }

    app.listen(config.port, () => {
        console.log(`Application Service running on port ${config.port}`)
    })
}

start()
module.exports = app
