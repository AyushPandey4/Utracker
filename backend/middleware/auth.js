const jwt = require('jsonwebtoken');

// Fallback JWT secret in case environment variable is not set
const JWT_SECRET = process.env.JWT_SECRET || 'utracker_default_secret_key';

const authenticateToken = (req, res, next) => {
  // Get token from headers (or cookies)
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) // Extract token after 'Bearer '
    : req.cookies?.token || null;

  if (!token) {
    return res.status(401).json({ message: 'Token missing, please login' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // The token payload contains { user: { id: '...' } }
    // Extract the user object and assign it to req.user
    if (decoded && decoded.user) {
      req.user = decoded.user;
    } else {
      throw new Error('Invalid token structure');
    }
    
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    return res.status(403).json({ message: 'Invalid token, please login again' });
  }
};

module.exports = authenticateToken;
