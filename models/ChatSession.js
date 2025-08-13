const mongoose = require('mongoose');

const ChatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  website: {
    domain: {
      type: String,
      required: true
    },
    page: String,
    title: String
  },
  
  visitor: {
    fingerprint: String,
    ipAddress: String,
    userAgent: String,
    country: String,
    city: String,
    timezone: String
  },
  
  messages: [{
    messageId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      responseTime: Number, // milliseconds for AI responses
      model: String, // AI model used
      tokens: {
        prompt: Number,
        completion: Number,
        total: Number
      },
      cost: Number // in cents
    }
  }],
  
  status: {
    type: String,
    enum: ['active', 'ended', 'timeout'],
    default: 'active'
  },
  
  startTime: {
    type: Date,
    default: Date.now
  },
  
  endTime: Date,
  
  duration: Number, // in seconds
  
  summary: {
    totalMessages: {
      type: Number,
      default: 0
    },
    userMessages: {
      type: Number,
      default: 0
    },
    assistantMessages: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    }
  },
  
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    ratedAt: Date
  },
  
  tags: [String], // For categorization
  
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
ChatSessionSchema.index({ userId: 1, createdAt: -1 });
ChatSessionSchema.index({ 'website.domain': 1, createdAt: -1 });
ChatSessionSchema.index({ status: 1, lastActivity: -1 });
ChatSessionSchema.index({ createdAt: -1 });

// Auto-expire inactive sessions after 24 hours
ChatSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 86400 });

// Pre-save middleware to update summary
ChatSessionSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.summary.totalMessages = this.messages.length;
    this.summary.userMessages = this.messages.filter(m => m.type === 'user').length;
    this.summary.assistantMessages = this.messages.filter(m => m.type === 'assistant').length;
    
    // Calculate total tokens and cost
    this.summary.totalTokens = this.messages.reduce((total, msg) => {
      return total + (msg.metadata?.tokens?.total || 0);
    }, 0);
    
    this.summary.totalCost = this.messages.reduce((total, msg) => {
      return total + (msg.metadata?.cost || 0);
    }, 0);
    
    this.lastActivity = new Date();
  }
  next();
});

// Instance method to add a message
ChatSessionSchema.methods.addMessage = function(type, content, metadata = {}) {
  const messageId = 'msg_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  
  const message = {
    messageId,
    type,
    content,
    timestamp: new Date(),
    metadata
  };
  
  this.messages.push(message);
  this.lastActivity = new Date();
  
  return message;
};

// Instance method to end session
ChatSessionSchema.methods.endSession = function() {
  this.status = 'ended';
  this.endTime = new Date();
  this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  return this.save();
};

// Instance method to add rating
ChatSessionSchema.methods.addRating = function(score, feedback = '') {
  this.rating = {
    score,
    feedback,
    ratedAt: new Date()
  };
  return this.save();
};

// Static method to find active session
ChatSessionSchema.statics.findActiveSession = function(sessionId) {
  return this.findOne({ 
    sessionId, 
    status: 'active',
    lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within last 24 hours
  });
};

// Static method to get session analytics
ChatSessionSchema.statics.getAnalytics = function(userId, startDate, endDate) {
  const matchConditions = { userId };
  if (startDate && endDate) {
    matchConditions.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalMessages: { $sum: '$summary.totalMessages' },
        totalUserMessages: { $sum: '$summary.userMessages' },
        totalAssistantMessages: { $sum: '$summary.assistantMessages' },
        totalTokens: { $sum: '$summary.totalTokens' },
        totalCost: { $sum: '$summary.totalCost' },
        avgMessagesPerSession: { $avg: '$summary.totalMessages' },
        avgDuration: { $avg: '$duration' },
        avgRating: { $avg: '$rating.score' }
      }
    }
  ]);
};

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
