const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || '316255abf6a27d33f39f38b3b7b73c5a81addbf06562495cb8cacdd14b72bd6a7beeed489bbb8118e0a197b6154bb5262ea6cddb65da001a904a1a01ff10c193';

const authenticateGateway = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header with Bearer token is required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = { id: decoded.userId || decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticateGateway };
