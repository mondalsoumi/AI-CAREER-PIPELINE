
const express = require('express')
const cors = require('cors')

const analyticsRouter = require('./routes/analytics')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'analytics-service' }))

app.use('/analytics', analyticsRouter)

module.exports = app