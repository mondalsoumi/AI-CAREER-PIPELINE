const jwt = require('jsonwebtoken');
const config = require('../config');

const authenticate = (req, res, next) => {
  // 1. Check for header injected by the API Gateway
  const gatewayUserId = req.headers['x-user-id'];
  if (gatewayUserId) {
    req.user = { id: gatewayUserId };
    return next();
  }

  // 2. Direct authentication fallback via Bearer token (for local direct testing)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header with Bearer token is required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = { id: decoded.userId || decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };
