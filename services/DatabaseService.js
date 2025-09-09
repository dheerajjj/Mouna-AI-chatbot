const database = require('../config/database');

class DatabaseService {
  constructor() {
    this.isMongoConnected = false;
    this.models = {};
    this.mockDB = null;
  }

  async initialize() {
    try {
      // Try to connect to MongoDB
      const connection = await database.connect();
      if (!connection) throw new Error('MongoDB connection failed (no connection object)');

      this.isMongoConnected = true;

      // Load MongoDB models
      const { User, Subscription, MessageLog } = require('../models/User');
      const ChatSession = require('../models/ChatSession');

      // Load auto-training models
      const {
        TenantTrainingData,
        TrainingSession,
        CrawlJobMetrics,
        SchedulerMetrics,
        KnowledgeBaseItem
      } = require('../models/AutoTrainingSchemas');

      this.models = {
        User,
        Subscription,
        MessageLog,
        ChatSession,
        // Auto-training models
        TenantTrainingData,
        TrainingSession,
        CrawlJobMetrics,
        SchedulerMetrics,
        KnowledgeBaseItem
      };

      console.log('✅ Database Service initialized with MongoDB');
      return true;
    } catch (error) {
      console.error('❌ Mongo-only mode: failed to initialize database:', error.message);
      // Propagate error so caller can exit process
      throw error;
    }
  }

  // User operations
  async createUser(userData) {
    if (this.isMongoConnected) {
      const user = new this.models.User(userData);
      if (!user.apiKey) {
        user.generateApiKey();
      }
      const savedUser = await user.save();
      
      // Auto-create progress record for new user
      try {
        const UserProgress = require('../models/UserProgress');
        await UserProgress.getUserProgress(savedUser._id); // This creates if doesn't exist
        console.log(`✅ Progress record created for user: ${savedUser.email}`);
      } catch (progressError) {
        console.error('Warning: Failed to create progress record:', progressError.message);
        // Don't fail user creation if progress creation fails
      }
      
      return savedUser;
    } else {
      // Mock database fallback - use MockUser class
      const MockUser = this.mockDB.User;
      const user = new MockUser(userData);
      user.generateApiKey();
      await user.save();
      
      // Mock progress creation - add minimal progress tracking
      if (!this.mockDB.userProgress) {
        this.mockDB.userProgress = [];
      }
      this.mockDB.userProgress.push({
        userId: user._id,
        steps: {
          signup: { completed: true, completedAt: new Date() },
          plan: { completed: false },
          appearance: { completed: false },
          customize: { completed: false },
          embed: { completed: false },
          live: { completed: false }
        },
        completionPercentage: 16
      });
      
      return user;
    }
  }

  async findUserByEmail(email) {
    // Generate candidate variants to handle Gmail dots/aliases and general normalization
    const candidatesSet = new Set();
    try {
      const raw = String(email || '').trim();
      const lower = raw.toLowerCase();
      candidatesSet.add(lower);
      try {
        const validator = require('validator');
        const norm = validator.normalizeEmail(raw);
        if (norm) candidatesSet.add(String(norm).toLowerCase());
      } catch (_) {}
      // Gmail-specific variants
      try {
        const [local, domain] = lower.split('@');
        if (domain === 'gmail.com' || domain === 'googlemail.com') {
          const noPlus = local.split('+')[0];
          const noDots = noPlus.replace(/\./g, '');
          candidatesSet.add(`${noPlus}@${domain}`);     // strip +tag
          candidatesSet.add(`${noDots}@${domain}`);     // strip dots + tag
          candidatesSet.add(`${local.replace(/\./g,'')}@${domain}`); // strip dots only
        }
      } catch (_) {}
    } catch (_) {}
    const candidates = Array.from(candidatesSet).filter(Boolean);

    if (this.isMongoConnected) {
      if (candidates.length === 0) return null;
      // Prefer exact match of what the user typed
      const exact = await this.models.User.findOne({ email: String(email || '').toLowerCase().trim() });
      if (exact) return exact;
      return await this.models.User.findOne({ email: { $in: candidates } });
    } else {
      if (!this.mockDB || !this.mockDB.User || !this.mockDB.users) return null;
      const exact = await this.mockDB.User.findOne({ email: String(email || '').toLowerCase().trim() })
        || this.mockDB.users.find(u => String(u.email || '').toLowerCase().trim() === String(email || '').toLowerCase().trim());
      if (exact) return exact;
      return await this.mockDB.User.findOne({ email: { $in: candidates } })
        || this.mockDB.users.find(u => candidates.includes(String(u.email || '').toLowerCase()));
    }
  }

  async findUserByApiKey(apiKey) {
    if (this.isMongoConnected) {
      return await this.models.User.findOne({ apiKey });
    } else {
      return this.mockDB.users.find(u => u.apiKey === apiKey);
    }
  }

  // Find multiple users by a list of candidate emails (lowercased)
  async findUsersByEmails(emails) {
    const list = (emails || []).map(e => String(e || '').toLowerCase().trim()).filter(Boolean);
    if (list.length === 0) return [];
    if (this.isMongoConnected) {
      return await this.models.User.find({ email: { $in: list } });
    } else {
      return (this.mockDB.users || []).filter(u => list.includes(String(u.email || '').toLowerCase().trim()));
    }
  }

  // Find all Gmail alias accounts for a given Gmail address (handles dots and +tags)
  async findUsersByGmailAlias(email) {
    const lower = String(email || '').toLowerCase().trim();
    const parts = lower.split('@');
    if (parts.length !== 2) return [];
    const [local, domain] = parts;
    if (domain !== 'gmail.com' && domain !== 'googlemail.com') return [];

    // Normalize to base (strip +tag) then remove dots
    const base = local.split('+')[0].replace(/\./g, '');
    if (!base) return [];

    if (this.isMongoConnected) {
      // Build a regex that allows optional dots between every character and optional +tag
      const escapedChars = base.split('').map(c => c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
      const dottedPattern = escapedChars.join('\\.?');
      const regexStr = `^${dottedPattern}(\\+[^@]*)?@(?:gmail\\.com|googlemail\\.com)$`;
      return await this.models.User.find({ email: { $regex: regexStr, $options: 'i' } });
    } else {
      // Mock DB: compare by dotless base
      return (this.mockDB.users || []).filter(u => {
        const ue = String(u.email || '').toLowerCase().trim();
        const [ul, ud] = ue.split('@');
        if (!ud || (ud !== 'gmail.com' && ud !== 'googlemail.com')) return false;
        const ubase = ul.split('+')[0].replace(/\./g, '');
        return ubase === base;
      });
    }
  }

  async findUserById(userId) {
    if (this.isMongoConnected) {
      // Handle MongoDB ObjectId conversion
      let searchId = userId;
      if (typeof userId === 'string' && userId.length === 24) {
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(userId)) {
          searchId = new mongoose.Types.ObjectId(userId);
        }
      }
      return await this.models.User.findById(searchId);
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
        // Support dot-notation updates for mock DB to mirror Mongo behavior
        const setByPath = (obj, path, value) => {
          const keys = path.split('.');
          let cur = obj;
          for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
            cur = cur[k];
          }
          cur[keys[keys.length - 1]] = value;
        };
        for (const [key, value] of Object.entries(updateData)) {
          if (key.includes('.')) setByPath(user, key, value);
          else user[key] = value;
        }
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

  // Add or update session rating
  async rateChatSession(sessionId, score, feedback = '') {
    try {
      const safeScore = Math.max(1, Math.min(5, parseInt(score, 10) || 0));
      if (this.isMongoConnected) {
        const session = await this.models.ChatSession.findOne({ sessionId });
        if (!session) return null;
        session.rating = {
          score: safeScore,
          feedback: typeof feedback === 'string' ? feedback : '',
          ratedAt: new Date()
        };
        return await session.save();
      } else {
        const session = this.mockDB.chatSessions.find(s => s.sessionId === sessionId);
        if (!session) return null;
        session.rating = {
          score: safeScore,
          feedback: typeof feedback === 'string' ? feedback : '',
          ratedAt: new Date()
        };
        return session;
      }
    } catch (e) {
      console.error('rateChatSession error:', e);
      throw e;
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


  // Usage tracking operations
  async incrementUserUsage(userId, limitType, increment = 1) {
    try {
      if (this.isMongoConnected) {
        const updatePath = `usage.${limitType}`;
        return await this.models.User.findByIdAndUpdate(
          userId,
          { 
            $inc: { [updatePath]: increment },
            $set: { 'usage.lastUpdated': new Date() }
          },
          { new: true, upsert: false }
        );
      } else {
        const user = this.mockDB.users.find(u => u._id === userId);
        if (user) {
          if (!user.usage) user.usage = {};
          user.usage[limitType] = (user.usage[limitType] || 0) + increment;
          user.usage.lastUpdated = new Date();
          return user;
        }
        return null;
      }
    } catch (error) {
      console.error('Error incrementing user usage:', error);
      throw error;
    }
  }

  async resetUserUsage(userId, limitType = null) {
    try {
      if (this.isMongoConnected) {
        if (limitType) {
          // Reset specific usage type
          const updatePath = `usage.${limitType}`;
          return await this.models.User.findByIdAndUpdate(
            userId,
            { 
              $set: { 
                [updatePath]: 0,
                'usage.lastUpdated': new Date()
              }
            },
            { new: true }
          );
        } else {
          // Reset all usage
          return await this.models.User.findByIdAndUpdate(
            userId,
            { 
              $set: { 
                usage: {
                  messagesPerMonth: 0,
                  apiCallsPerMonth: 0,
                  customResponses: 0,
                  knowledgeBaseEntries: 0,
                  widgetCustomizations: 0,
                  maxFileUploads: 0,
                  totalMessages: 0,
                  lastUpdated: new Date()
                }
              }
            },
            { new: true }
          );
        }
      } else {
        const user = this.mockDB.users.find(u => u._id === userId);
        if (user) {
          if (limitType) {
            if (!user.usage) user.usage = {};
            user.usage[limitType] = 0;
          } else {
            user.usage = {
              messagesPerMonth: 0,
              apiCallsPerMonth: 0,
              customResponses: 0,
              knowledgeBaseEntries: 0,
              widgetCustomizations: 0,
              maxFileUploads: 0,
              totalMessages: 0
            };
          }
          user.usage.lastUpdated = new Date();
          return user;
        }
        return null;
      }
    } catch (error) {
      console.error('Error resetting user usage:', error);
      throw error;
    }
  }

  async getUserUsageSummary(userId) {
    try {
      const user = await this.findUserById(userId);
      if (!user) return null;

      const { getUsageSummary } = require('../middleware/planAccessControl');
      return getUsageSummary(user);
    } catch (error) {
      console.error('Error getting user usage summary:', error);
      throw error;
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
      try {
        // Clean up auto-training data before disconnecting
        const { AutoTrainingDB } = require('../models/AutoTrainingSchemas');
        await AutoTrainingDB.cleanup();
        console.log('🧹 Auto-training database cleanup completed');
      } catch (error) {
        console.warn('⚠️ Auto-training cleanup error:', error.message);
      }
      
      await database.disconnect();
    }
  }
}

module.exports = new DatabaseService();
