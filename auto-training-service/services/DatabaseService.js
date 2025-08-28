const mongoose = require('mongoose');

/**
 * Lightweight DatabaseService for the Auto-Training microservice
 * - Uses mongoose to establish a single shared connection
 * - Exposes a minimal collection(name) API backed by the native driver
 */
class DatabaseService {
  constructor() {
    if (!DatabaseService._initialized) {
      DatabaseService._initialized = true;
      DatabaseService._connecting = null;
      DatabaseService._db = null;
    }
  }

  /**
   * Ensure there is an active mongoose connection
   */
  async _ensureConnection() {
    if (DatabaseService._db) return DatabaseService._db;

    if (!DatabaseService._connecting) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chatbot';
      DatabaseService._connecting = mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        w: 'majority'
      }).then(() => {
        console.log('✅ [auto-training-svc] MongoDB connected');
        DatabaseService._db = mongoose.connection.db;
        return DatabaseService._db;
      }).catch(err => {
        console.error('❌ [auto-training-svc] MongoDB connection failed:', err.message);
        throw err;
      });

      // basic connection event logs
      mongoose.connection.on('error', (err) => console.error('❌ [auto-training-svc] Mongo error:', err));
      mongoose.connection.on('disconnected', () => console.warn('⚠️ [auto-training-svc] Mongo disconnected'));
      mongoose.connection.on('reconnected', () => console.log('🔄 [auto-training-svc] Mongo reconnected'));
    }

    return DatabaseService._connecting;
  }

  /**
   * Get a native driver collection by name
   * @param {string} name
   */
  async collection(name) {
    const db = await this._ensureConnection();
    return db.collection(name);
  }

  /**
   * Close connection (rarely needed for a long-running service)
   */
  async close() {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      DatabaseService._db = null;
      DatabaseService._connecting = null;
      console.log('🔌 [auto-training-svc] MongoDB disconnected');
    }
  }
}

module.exports = DatabaseService;

