const rateLimit = require('express-rate-limit')

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // allow 100 requests per window
  keyGenerator: (req) => req.ip, // keep IP-based but with generous limit
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = { authLimiter }
