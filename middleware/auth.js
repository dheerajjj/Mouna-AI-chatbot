const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

// Token blacklist for logout functionality (in-memory for demo)
const tokenBlacklist = new Set();

/**
 * Emergency fix: Direct MongoDB operations for authentication
 */
const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 [AUTH] Authentication middleware started');
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('🚨 [AUTH] No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      console.log('🚨 [AUTH] Token is blacklisted');
      return res.status(401).json({ error: 'Token has been invalidated' });
    }

    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', async (err, decoded) => {
      if (err) {
        console.log('🚨 [AUTH] JWT verification error:', err.name, err.message);
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token has expired' });
        } else if (err.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(403).json({ error: 'Token verification failed' });
      }

      try {
        console.log('🔐 [AUTH] JWT decoded successfully:', {
          userId: decoded.userId,
          id: decoded.id,
          email: decoded.email
        });
        
        // Direct MongoDB lookup - emergency bypass of DatabaseService
        const { getDb } = require('../server-mongo');
        const db = getDb();
        
        const userId = decoded.userId || decoded.id;
        if (!userId) {
          console.error('🚨 [AUTH] No userId in decoded token');
          return res.status(401).json({ error: 'Invalid token structure' });
        }
        
        // Convert to ObjectId if needed
        let searchId;
        if (ObjectId.isValid(userId)) {
          searchId = new ObjectId(userId);
        } else {
          searchId = userId;
        }
        
        console.log('🔍 [AUTH] Looking up user with ID:', searchId);
        
        const user = await db.collection('users').findOne({ _id: searchId });
        
        if (!user) {
          console.error('🚨 [AUTH] User not found in database for ID:', searchId);
          return res.status(401).json({ error: 'User not found' });
        }
        
        console.log('✅ [AUTH] User found:', {
          _id: user._id,
          email: user.email,
          name: user.name,
          hasSubscription: !!user.subscription,
          hasPlan: !!user.plan
        });

        // Attach user and token to request
        req.user = {
          _id: user._id,           // MongoDB ObjectId
          id: user._id,            // Alias for compatibility
          userId: user._id,        // Alternative alias
          email: user.email,
          name: user.name,
          plan: user.plan || { current: { id: 'free', name: 'Free Plan' } },
          subscription: user.subscription || { plan: 'free', planName: 'Free Plan' },
          apiKey: user.apiKey,
          ...user
        };
        req.token = token;
        
        console.log('✅ [AUTH] User attached to request successfully');
        next();

      } catch (dbError) {
        console.error('🚨 [AUTH] Database error during authentication:', dbError);
        return res.status(500).json({ 
          error: 'Authentication database error',
          message: 'Please try again in a moment'
        });
      }
    });

  } catch (error) {
    console.error('🚨 [AUTH] Critical authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication system error',
      message: 'Please try again in a moment'
    });
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
