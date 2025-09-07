const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      // Password is only required for non-OAuth users
      return !this.provider || this.provider === 'email';
    },
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  
  // OAuth fields
  provider: {
    type: String,
    enum: ['email', 'google', 'microsoft', 'yahoo', 'apple'],
    default: 'email'
  },
  providerId: {
    type: String,
    sparse: true // Only for OAuth users
  },
  avatar: {
    type: String // URL to user's avatar/profile picture
  },
  
  // Subscription Details
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'past_due', 'unpaid'],
      default: 'active'
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    },
    razorpayPaymentId: {
      type: String,
      sparse: true
    },
    razorpayOrderId: {
      type: String,
      sparse: true
    },
    lastPayment: {
      amount: Number,
      currency: String,
      date: Date,
      paymentId: String,
      planId: String,
      planName: String
    }
  },
  
  // Usage Statistics
  usage: {
    messagesThisMonth: {
      type: Number,
      default: 0
    },
    messageCredits: {
      // Add-on credits purchased by user, consumed when plan limit is exceeded
      type: Number,
      default: 0
    },
    totalMessages: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    },
    websites: [{
      domain: String,
      addedAt: Date,
      lastActive: Date,
      messageCount: { type: Number, default: 0 }
    }]
  },
  
  // Widget Configuration
  widgetConfig: {
    primaryColor: {
      type: String,
      default: '#0d7b8a'
    },
    position: {
      type: String,
      enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
      default: 'bottom-right'
    },
    title: {
      type: String,
      default: 'AI Assistant'
    },
    subtitle: {
      type: String,
      default: 'Online • Usually replies instantly'
    },
    welcomeMessage: {
      type: String,
      default: '👋 Hi there! I\'m your AI assistant. How can I help you today?'
    },
    placeholder: {
      type: String,
      default: 'Type your message...'
    },
    branding: {
      type: Boolean,
      default: true // Show "Powered by" for free users
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'te', 'ta', 'mr', 'kn'],
      default: 'en'
    },
    // New customization fields
    size: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    },
    animation: {
      type: String,
      enum: ['pulse', 'bounce', 'none'],
      default: 'pulse'
    },
    icon: {
      type: String,
      enum: ['chat', 'robot', 'mouna', 'custom'],
      default: 'chat'
    },
    customLogoUrl: {
      type: String,
      default: null
    },
    autoOpenMode: {
      type: String,
      enum: ['never', 'immediate', 'time', 'exit', 'returning'],
      default: 'never'
    },
    autoOpenDelay: {
      type: Number,
      default: 10
    },
    autoOpenFrequency: {
      type: String,
      enum: ['always', 'session', 'daily'],
      default: 'always'
    },
    fontFamily: {
      type: String
    }
  },
  
  // API Keys
  apiKey: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Tenant Management
  personalTenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TenantSettings',
    required: false // Will be created automatically
  },
  tenantLimits: {
    maxTenants: {
      type: Number,
      default: function() {
        const { USAGE_LIMITS } = require('../config/pricing');
        return USAGE_LIMITS[this.subscription.plan]?.tenants || 0;
      }
    },
    currentTenants: {
      type: Number,
      default: 0
    }
  },
  
  // Account Status
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Verification status for different auth methods
  verificationStatus: {
    email: {
      type: Boolean,
      default: false
    },
    emailVerifiedAt: Date,
    phone: {
      type: Boolean, 
      default: false
    },
    phoneVerifiedAt: Date
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Skip password hashing if user is OAuth user or password is not modified
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate API key
userSchema.methods.generateApiKey = function() {
  const crypto = require('crypto');
  this.apiKey = 'cb_' + crypto.randomBytes(32).toString('hex');
  return this.apiKey;
};

// Check if user can send more messages
userSchema.methods.canSendMessage = function() {
  const { USAGE_LIMITS } = require('../config/pricing');
  const plan = this.subscription.plan;
  const limit = USAGE_LIMITS[plan];
  
  return this.usage.messagesThisMonth < limit.messagesPerMonth;
};

// Reset monthly usage (call this monthly via cron job)
userSchema.methods.resetMonthlyUsage = function() {
  this.usage.messagesThisMonth = 0;
  this.usage.lastResetDate = new Date();
  return this.save();
};

// Increment message count
userSchema.methods.incrementMessageCount = function() {
  this.usage.messagesThisMonth += 1;
  this.usage.totalMessages += 1;
  return this.save();
};

// Tenant management methods
userSchema.methods.canCreateTenant = function() {
  const { USAGE_LIMITS } = require('../config/pricing');
  const limits = USAGE_LIMITS[this.subscription.plan];
  
  if (limits.tenants === 'unlimited') return true;
  if (limits.personalTenantOnly) return false;
  
  return this.tenantLimits.currentTenants < limits.tenants;
};

userSchema.methods.getTenantLimit = function() {
  const { USAGE_LIMITS } = require('../config/pricing');
  return USAGE_LIMITS[this.subscription.plan]?.tenants || 0;
};

userSchema.methods.incrementTenantCount = function() {
  this.tenantLimits.currentTenants += 1;
  return this.save();
};

userSchema.methods.decrementTenantCount = function() {
  if (this.tenantLimits.currentTenants > 0) {
    this.tenantLimits.currentTenants -= 1;
  }
  return this.save();
};

// Get or create personal tenant
userSchema.methods.getPersonalTenant = async function() {
  if (!this.personalTenantId) {
    // Create personal tenant if it doesn't exist
    const TenantSettings = require('./TenantSettings');
    const personalTenant = new TenantSettings({
      userId: this._id,
      companyInfo: {
        name: this.company || this.name + "'s Personal Chatbot",
        website: this.website || ''
      },
      isPersonalTenant: true,
      features: {
        bookingsEnabled: false,
        ordersEnabled: false,
        slotsEnabled: false
      },
      customization: {
        primaryColor: this.widgetConfig.primaryColor,
        secondaryColor: '#f3f4f6',
        title: this.widgetConfig.title,
        welcomeMessage: this.widgetConfig.welcomeMessage,
        placeholder: this.widgetConfig.placeholder
      }
    });
    
    await personalTenant.save();
    this.personalTenantId = personalTenant._id;
    await this.save();
    
    return personalTenant;
  }
  
  const TenantSettings = require('./TenantSettings');
  return await TenantSettings.findById(this.personalTenantId);
};

// Payment Transaction Schema for detailed tracking
const paymentTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  razorpayPaymentId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  plan: {
    type: String,
    enum: ['starter', 'professional', 'enterprise'],
    required: true
  },
  planName: String,
  amount: Number, // Amount in INR
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
    required: true
  },
  paymentMethod: String,
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Message Log Schema for analytics
const messageLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: String,
  website: String,
  userMessage: {
    type: String,
    required: true
  },
  aiResponse: {
    type: String,
    required: true
  },
  responseTime: Number, // in milliseconds
  timestamp: {
    type: Date,
    default: Date.now
  },
  userAgent: String,
  ipAddress: String,
  country: String,
  city: String
}, {
  timestamps: true
});

// Index for better query performance
messageLogSchema.index({ userId: 1, timestamp: -1 });
messageLogSchema.index({ website: 1, timestamp: -1 });

const User = mongoose.model('User', userSchema);
const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
const MessageLog = mongoose.model('MessageLog', messageLogSchema);

module.exports = {
  User,
  PaymentTransaction,
  MessageLog
};
