const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticateGateway } = require('./middleware/gatewayAuthMiddleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Service URLs — use Docker service names in container, localhost for local dev
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8001';
const APPLICATION_SERVICE_URL = process.env.APPLICATION_SERVICE_URL || 'http://localhost:8002';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8003';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8004';

app.use(cors());

// ─── Health check (no auth) ───────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'api-gateway', timestamp: new Date() });
});

// ─── Public routes whitelist ──────────────────────────────────────────────────
// These are the ONLY paths that skip JWT validation.
// Everything else is protected by default.
const PUBLIC_PATHS = [
  { method: 'POST', path: '/api/auth/register' },
  { method: 'POST', path: '/api/auth/login' },
];

const isPublicPath = (req) =>
  PUBLIC_PATHS.some(
    (p) => p.method === req.method && req.path.startsWith(p.path)
  );

// ─── Global auth middleware ───────────────────────────────────────────────────
// Runs before every proxy. Skips only whitelisted paths.
app.use((req, res, next) => {
  if (isPublicPath(req)) return next();
  return authenticateGateway(req, res, next);
});

// ─── Helper: inject x-user-id into every proxied request ─────────────────────
const injectUserId = (proxyReq, req) => {
  if (req.user && req.user.id) {
    proxyReq.setHeader('x-user-id', req.user.id);
  }
};

// ─── Auth Service → port 8001 ─────────────────────────────────────────────────
// /api/auth/register  → http://auth-service:8001/auth/register
// /api/auth/login     → http://auth-service:8001/auth/login
// /api/auth/me        → http://auth-service:8001/auth/me
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => '/auth' + path,
  on: { proxyReq: injectUserId },
}));

// ─── Application Service → port 8002 ─────────────────────────────────────────
// /api/applications/* → http://application-service:8002/applications/*
// /api/resumes/*      → http://application-service:8002/resumes/*
// /api/interviews/*   → http://application-service:8002/interviews/*
app.use('/api/applications', createProxyMiddleware({
  target: APPLICATION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => '/applications' + path,
  on: { proxyReq: injectUserId },
}));

app.use('/api/resumes', createProxyMiddleware({
  target: APPLICATION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => '/resumes' + path,
  on: {
    proxyReq: (proxyReq, req) => {
      injectUserId(proxyReq, req);
      // multer handles multipart — don't let gateway re-parse the body
    },
  },
}));

app.use('/api/interviews', createProxyMiddleware({
  target: APPLICATION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => '/interviews' + path,
  on: { proxyReq: injectUserId },
}));

// ─── Analytics Service → port 8003 ───────────────────────────────────────────
// /api/analytics/* → http://analytics-service:8003/analytics/*
app.use('/api/analytics', createProxyMiddleware({
  target: ANALYTICS_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => '/analytics' + path,
  on: { proxyReq: injectUserId },
}));

// ─── AI Service → port 8004 ──────────────────────────────────────────────────
// /api/ai/* → http://ai-service:8004/ai/*
app.use('/api/ai', createProxyMiddleware({
  target: AI_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => '/ai' + path,
  on: { proxyReq: injectUserId },
}));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[API Gateway Error]', err.message);
  res.status(500).json({ error: 'Gateway error' });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Auth        → ${AUTH_SERVICE_URL}`);
  console.log(`Application → ${APPLICATION_SERVICE_URL}`);
  console.log(`Analytics   → ${ANALYTICS_SERVICE_URL}`);
  console.log(`AI          → ${AI_SERVICE_URL}`);
});