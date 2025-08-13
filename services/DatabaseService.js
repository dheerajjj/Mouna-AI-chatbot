const database = require('../config/database');

class DatabaseService {
  constructor() {
    this.isMongoConnected = false;
    this.models = {};
    this.mockDB = null;
  }

  async initialize() {
    try {
      // Try to connect to MongoDB first
      const connection = await database.connect();
      
      if (connection) {
        this.isMongoConnected = true;
        
        // Load MongoDB models
        const { User, Subscription, MessageLog } = require('../models/User');
        const ChatSession = require('../models/ChatSession');
        
        this.models = {
          User,
          Subscription, 
          MessageLog,
          ChatSession
        };
        
        console.log('✅ Database Service initialized with MongoDB');
        return true;
      } else {
        throw new Error('MongoDB connection failed');
      }
    } catch (error) {
      console.log('⚠️ MongoDB unavailable, falling back to mock database...');
      this.isMongoConnected = false;
      
      // Load mock database
      this.mockDB = require('../mockDB');
      console.log('✅ Database Service initialized with Mock DB');
      return false;
    }
  }

  // User operations
  async createUser(userData) {
    if (this.isMongoConnected) {
      const user = new this.models.User(userData);
      if (!user.apiKey) {
        user.generateApiKey();
      }
      return await user.save();
    } else {
      // Mock database fallback - use MockUser class
      const MockUser = this.mockDB.User;
      const user = new MockUser(userData);
      user.generateApiKey();
      await user.save();
      return user;
    }
  }

  async findUserByEmail(email) {
    if (this.isMongoConnected) {
      return await this.models.User.findOne({ email });
    } else {
      return await this.mockDB.User.findOne({ email });
    }
  }

  async findUserByApiKey(apiKey) {
    if (this.isMongoConnected) {
      return await this.models.User.findOne({ apiKey });
    } else {
      return this.mockDB.users.find(u => u.apiKey === apiKey);
    }
  }

  async findUserById(userId) {
    if (this.isMongoConnected) {
      return await this.models.User.findById(userId);
    } else {
      return await this.mockDB.User.findById(userId);
    }
  }

  async updateUser(userId, updateData) {
    if (this.isMongoConnected) {
      return await this.models.User.findByIdAndUpdate(userId, updateData, { new: true });
    } else {
      const user = this.mockDB.users.find(u => u._id === userId);
      if (user) {
        Object.assign(user, updateData);
        return user;
      }
      return null;
    }
  }

  async getAllUsers(limit = 50, offset = 0) {
    if (this.isMongoConnected) {
      return await this.models.User.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .select('-password');
    } else {
      return this.mockDB.users
        .slice(offset, offset + limit)
        .map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });
    }
  }

  // Chat session operations
  async createChatSession(sessionData) {
    if (this.isMongoConnected) {
      const session = new this.models.ChatSession(sessionData);
      return await session.save();
    } else {
      const session = {
        _id: 'session_' + Math.random().toString(36).substr(2, 9),
        ...sessionData,
        messages: [],
        summary: { totalMessages: 0, userMessages: 0, assistantMessages: 0 },
        status: 'active',
        startTime: new Date(),
        lastActivity: new Date(),
        createdAt: new Date()
      };
      
      this.mockDB.chatSessions.push(session);
      return session;
    }
  }

  async findChatSession(sessionId) {
    if (this.isMongoConnected) {
      return await this.models.ChatSession.findActiveSession(sessionId);
    } else {
      return this.mockDB.chatSessions.find(s => 
        s.sessionId === sessionId && s.status === 'active'
      );
    }
  }

  async updateChatSession(sessionId, updateData) {
    if (this.isMongoConnected) {
      return await this.models.ChatSession.findOneAndUpdate(
        { sessionId },
        updateData,
        { new: true }
      );
    } else {
      const session = this.mockDB.chatSessions.find(s => s.sessionId === sessionId);
      if (session) {
        Object.assign(session, updateData);
        session.lastActivity = new Date();
        return session;
      }
      return null;
    }
  }

  async addMessageToSession(sessionId, type, content, metadata = {}) {
    if (this.isMongoConnected) {
      const session = await this.models.ChatSession.findOne({ sessionId });
      if (session) {
        session.addMessage(type, content, metadata);
        return await session.save();
      }
      return null;
    } else {
      const session = this.mockDB.chatSessions.find(s => s.sessionId === sessionId);
      if (session) {
        const messageId = 'msg_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        const message = {
          messageId,
          type,
          content,
          timestamp: new Date(),
          metadata
        };
        
        session.messages.push(message);
        session.lastActivity = new Date();
        
        // Update summary
        session.summary.totalMessages = session.messages.length;
        session.summary.userMessages = session.messages.filter(m => m.type === 'user').length;
        session.summary.assistantMessages = session.messages.filter(m => m.type === 'assistant').length;
        
        return session;
      }
      return null;
    }
  }

  // Message log operations (for analytics)
  async logMessage(logData) {
    if (this.isMongoConnected) {
      const messageLog = new this.models.MessageLog(logData);
      return await messageLog.save();
    } else {
      const log = {
        _id: 'log_' + Math.random().toString(36).substr(2, 9),
        ...logData,
        timestamp: new Date()
      };
      
      this.mockDB.messageLogs.push(log);
      return log;
    }
  }

  // Analytics operations
  async getAnalytics(userId, startDate, endDate) {
    if (this.isMongoConnected) {
      const [sessionAnalytics] = await this.models.ChatSession.getAnalytics(userId, startDate, endDate);
      const messageCount = await this.models.MessageLog.countDocuments({
        userId,
        timestamp: { $gte: startDate, $lte: endDate }
      });
      
      return {
        ...sessionAnalytics,
        totalMessageLogs: messageCount
      };
    } else {
      // Mock analytics
      const userSessions = this.mockDB.chatSessions.filter(s => s.userId === userId);
      const userLogs = this.mockDB.messageLogs.filter(l => l.userId === userId);
      
      return {
        totalSessions: userSessions.length,
        totalMessages: userSessions.reduce((sum, s) => sum + s.summary.totalMessages, 0),
        totalMessageLogs: userLogs.length,
        avgMessagesPerSession: userSessions.length > 0 ? 
          userSessions.reduce((sum, s) => sum + s.summary.totalMessages, 0) / userSessions.length : 0
      };
    }
  }

  // Subscription operations
  async createSubscription(subscriptionData) {
    if (this.isMongoConnected) {
      const subscription = new this.models.Subscription(subscriptionData);
      return await subscription.save();
    } else {
      const subscription = {
        _id: 'sub_' + Math.random().toString(36).substr(2, 9),
        ...subscriptionData,
        createdAt: new Date()
      };
      
      this.mockDB.subscriptions.push(subscription);
      return subscription;
    }
  }

  async findSubscriptionByStripeId(stripeSubscriptionId) {
    if (this.isMongoConnected) {
      return await this.models.Subscription.findOne({ stripeSubscriptionId });
    } else {
      return this.mockDB.subscriptions.find(s => s.stripeSubscriptionId === stripeSubscriptionId);
    }
  }

  // Utility methods
  getConnectionStatus() {
    if (this.isMongoConnected) {
      return {
        type: 'mongodb',
        status: database.getConnectionStatus(),
        connected: database.isConnected()
      };
    } else {
      return {
        type: 'mock',
        status: 'connected',
        connected: true
      };
    }
  }

  async disconnect() {
    if (this.isMongoConnected) {
      await database.disconnect();
    }
  }
}

module.exports = new DatabaseService();
