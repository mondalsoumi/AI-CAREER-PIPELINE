const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticateGateway } = require('./middleware/gatewayAuthMiddleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Read service URLs from environment
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8001';

app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'api-gateway', timestamp: new Date() });
});

// Middleware to conditionally authenticate protected paths
const authenticateIfProtected = (req, res, next) => {
  // Only protect the '/me' route
  if (req.path === '/me' || req.path === '/me/') {
    return authenticateGateway(req, res, next);
  }
  next();
};

// Mount the Auth Service proxy under /api/auth
app.use('/api/auth', authenticateIfProtected, createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    // Rewrites '/register' -> '/auth/register', '/login' -> '/auth/login', etc.
    return '/auth' + path;
  },
  on: {
    proxyReq: (proxyReq, req, res) => {
      if (req.user && req.user.id) {
        proxyReq.setHeader('x-user-id', req.user.id);
      }
    }
  }
}));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('API Gateway Error:', err);
  res.status(500).json({ error: 'Gateway server error occurred' });
});

app.listen(PORT, () => {
  console.log(`API Gateway running and listening on port ${PORT}`);
  console.log(`Proxying Auth Service requests to: ${AUTH_SERVICE_URL}`);
});
