const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chatbot';
      
      console.log('🔌 Connecting to MongoDB...');
      
      this.connection = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000, // Timeout after 10s
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        connectTimeoutMS: 10000, // Give up initial connection after 10s
        maxPoolSize: 10, // Maintain up to 10 socket connections
        minPoolSize: 2, // Maintain at least 2 socket connections
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        retryWrites: true,
        w: 'majority'
      });

      console.log('✅ MongoDB connected successfully');
      console.log(`📊 Database: ${this.connection.connection.name}`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      
      // Fallback to mock database in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔄 Falling back to mock database for development...');
        return null; // This will trigger mock database usage
      }
      
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.connection.close();
      console.log('🔌 MongoDB disconnected');
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[mongoose.connection.readyState] || 'unknown';
  }
}

module.exports = new Database();
