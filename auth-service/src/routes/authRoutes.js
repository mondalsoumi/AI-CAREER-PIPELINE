const express = require('express');
const { register, login, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// router.post('/login', authLimiter, login)   // old
router.post('/login', login)                   // temporary — no limiter
router.post('/register', register)             // temporary — no limiter
router.get('/me', authenticate, me);

module.exports = router;
