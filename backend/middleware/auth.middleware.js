const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth.config');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'Sign in is required to perform this action.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.user = { id: decoded.userId, name: decoded.name, email: decoded.email };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Your session has expired. Please sign in again.'
    });
  }
}

module.exports = { requireAuth };
