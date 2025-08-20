const jwt = require('jsonwebtoken');
const DatabaseService = require('../services/DatabaseService');

// Token blacklist for logout functionality (in-memory for demo)
const tokenBlacklist = new Set();

/**
 * Enhanced JWT middleware with blacklist support and database user lookup
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ error: 'Token has been invalidated' });
    }

    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token has expired' });
        } else if (err.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(403).json({ error: 'Token verification failed' });
      }

      try {
        // Get full user data from database for reports functionality
        const user = await DatabaseService.findUserById(decoded.userId || decoded.id);
        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }

        // Attach user and token to request
        req.user = {
          _id: user._id,           // MongoDB ObjectId
          id: user._id,            // Alias for compatibility
          userId: user._id,        // Alternative alias
          email: user.email,
          name: user.name,
          plan: user.plan || { current: { id: 'free', name: 'Free Plan' } },
          subscription: user.subscription,
          apiKey: user.apiKey,
          ...user
        };
        req.token = token;
        next();

      } catch (dbError) {
        console.error('Database error in JWT auth:', dbError);
        return res.status(500).json({ error: 'Authentication error' });
      }
    });

  } catch (error) {
    console.error('JWT authentication error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Add token to blacklist (for logout functionality)
 */
const blacklistToken = (token) => {
  if (token) {
    tokenBlacklist.add(token);
  }
};

/**
 * Clear expired tokens from blacklist (cleanup utility)
 */
const cleanupBlacklist = () => {
  // In a production environment, you'd want to implement proper token expiry checking
  // For now, this is a simple in-memory implementation
  console.log(`🧹 Token blacklist size: ${tokenBlacklist.size}`);
};

// Export the middleware and utilities
module.exports = {
  authenticateToken,
  blacklistToken,
  cleanupBlacklist
};

// Export as default for backward compatibility
module.exports.default = authenticateToken;
