// api-gateway/src/index.js
const express = require('express')
const cors = require('cors')
const { createProxyMiddleware } = require('http-proxy-middleware')
const { authenticateGateway } = require('./middleware/gatewayAuthMiddleware')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 8000

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8001'
const APPLICATION_SERVICE_URL = process.env.APPLICATION_SERVICE_URL || 'http://localhost:8002'
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8003'
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8004'

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allow: the frontend URL, localhost variants for dev, and Chrome extensions
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true)

    const allowed = [
      ALLOWED_ORIGIN,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ]

    // Allow any Chrome extension origin
    if (origin.startsWith('chrome-extension://')) return callback(null, true)

    if (allowed.includes(origin)) return callback(null, true)

    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))

// ─── Public routes whitelist ──────────────────────────────────────────────────
const PUBLIC_PATHS = [
  { method: 'POST', path: '/api/auth/register' },
  { method: 'POST', path: '/api/auth/login' },
  { method: 'GET', path: '/health' }
]
const isPublicPath = (req) =>
  PUBLIC_PATHS.some((p) => p.method === req.method && req.path.startsWith(p.path))
// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'UP', service: 'api-gateway', timestamp: new Date() })
)
// ─── Global auth middleware ───────────────────────────────────────────────────
app.use((req, res, next) => {
  if (isPublicPath(req)) return next()
  return authenticateGateway(req, res, next)
})

// ─── Inject user id helper ────────────────────────────────────────────────────
const injectUserId = (proxyReq, req) => {
  if (req.user && req.user.id) {
    proxyReq.setHeader('x-user-id', req.user.id)
  }
}



// ─── Auth Service ─────────────────────────────────────────────────────────────
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => '/auth' + path,
  on: { proxyReq: injectUserId },
}))

// ─── Application Service ──────────────────────────────────────────────────────
app.use('/api/applications', createProxyMiddleware({
  target: APPLICATION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => '/applications' + path,
  on: { proxyReq: injectUserId },
}))

app.use('/api/resumes', createProxyMiddleware({
  target: APPLICATION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => '/resumes' + path,
  on: { proxyReq: injectUserId },
}))

app.use('/api/interviews', createProxyMiddleware({
  target: APPLICATION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => '/interviews' + path,
  on: { proxyReq: injectUserId },
}))

// ─── Analytics Service ────────────────────────────────────────────────────────
app.use('/api/analytics', createProxyMiddleware({
  target: ANALYTICS_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => '/analytics' + path,
  on: { proxyReq: injectUserId },
}))

// ─── AI Service ───────────────────────────────────────────────────────────────
app.use('/api/ai', createProxyMiddleware({
  target: AI_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => '/ai' + path,
  on: { proxyReq: injectUserId },
}))

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[API Gateway Error]', err.message)
  res.status(500).json({ error: 'Gateway error' })
})

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`)
  console.log(`Auth        → ${AUTH_SERVICE_URL}`)
  console.log(`Application → ${APPLICATION_SERVICE_URL}`)
  console.log(`Analytics   → ${ANALYTICS_SERVICE_URL}`)
  console.log(`AI          → ${AI_SERVICE_URL}`)
  console.log(`CORS origin → ${ALLOWED_ORIGIN} + chrome-extension://*`)
})