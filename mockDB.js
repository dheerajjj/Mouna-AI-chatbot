// Mock Database for development/fallback when MongoDB is not available
const crypto = require('crypto');

class MockUser {
  constructor(userData) {
    this._id = userData._id || 'user_' + Math.random().toString(36).substr(2, 9);
    this.name = userData.name || '';
    this.email = userData.email || '';
    this.password = userData.password || '';
    this.apiKey = userData.apiKey || null;
    this.subscription = userData.subscription || {
      plan: 'free',
      status: 'active',
      startDate: new Date(),
      endDate: null,
      razorpayCustomerId: null,
      razorpaySubscriptionId: null
    };
    this.usage = userData.usage || {
      messagesThisMonth: 0,
      totalMessages: 0,
      lastReset: new Date()
    };
    this.preferences = userData.preferences || {
      language: 'en',
      theme: 'light',
      notifications: true
    };
    this.createdAt = userData.createdAt || new Date();
    this.updatedAt = userData.updatedAt || new Date();
  }

  generateApiKey() {
    this.apiKey = 'ak_' + crypto.randomBytes(32).toString('hex');
    return this.apiKey;
  }

  async save() {
    this.updatedAt = new Date();
    // In real implementation, this would save to database
    const existingIndex = users.findIndex(u => u._id === this._id);
    if (existingIndex !== -1) {
      users[existingIndex] = this;
    } else {
      users.push(this);
    }
    return this;
  }

  canSendMessage() {
    // Mock implementation - always return true for testing
    return true;
  }

  static async findOne(query) {
    if (query.email) {
      return users.find(u => u.email === query.email) || null;
    }
    if (query.apiKey) {
      return users.find(u => u.apiKey === query.apiKey) || null;
    }
    return null;
  }

  static async findById(id) {
    return users.find(u => u._id === id) || null;
  }
}

// Mock data storage
const users = [];
// Removed pre-existing test user to avoid API key conflicts

const chatSessions = [];

// Mock database object
const mockDB = {
  users: users,
  chatSessions: chatSessions,
  User: MockUser,
  
  // Helper methods
  clear() {
    users.length = 0;
    chatSessions.length = 0;
  },
  
  addUser(userData) {
    const user = new MockUser(userData);
    users.push(user);
    return user;
  },
  
  findUserByEmail(email) {
    return users.find(u => u.email === email) || null;
  },
  
  findUserByApiKey(apiKey) {
    return users.find(u => u.apiKey === apiKey) || null;
  }
};

module.exports = mockDB;
