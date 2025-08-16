const mongoose = require('mongoose');

// Tenant Settings Schema for SaaS Configuration
const tenantSettingsSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  
  // Reference to the user who owns this tenant configuration
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Basic tenant information
  tenantInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    website: {
      type: String,
      trim: true,
      default: ''
    },
    domain: {
      type: String,
      trim: true,
      default: ''
    },
    contactEmail: {
      type: String,
      trim: true,
      default: ''
    },
    contactPhone: {
      type: String,
      trim: true,
      default: ''
    }
  },
  
  // Feature enablement flags
  enabledFeatures: {
    bookings: {
      type: Boolean,
      default: false
    },
    orders: {
      type: Boolean,
      default: false
    },
    slots: {
      type: Boolean,
      default: false
    },
    payments: {
      type: Boolean,
      default: false
    },
    analytics: {
      type: Boolean,
      default: false
    }
  },
  
  // Booking-specific configuration
  bookingConfig: {
    enabled: {
      type: Boolean,
      default: false
    },
    allowedTimeSlots: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: String, // Format: "09:00"
      endTime: String,   // Format: "17:00"
      slotDuration: {    // Duration in minutes
        type: Number,
        default: 30
      }
    }],
    advanceBookingDays: {
      type: Number,
      default: 30 // How many days in advance booking is allowed
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    bookingFields: [{
      name: String,
      type: {
        type: String,
        enum: ['text', 'email', 'phone', 'date', 'select', 'textarea']
      },
      required: {
        type: Boolean,
        default: false
      },
      options: [String] // For select fields
    }]
  },
  
  // Orders-specific configuration
  orderConfig: {
    enabled: {
      type: Boolean,
      default: false
    },
    catalogUrl: {
      type: String,
      trim: true,
      default: ''
    },
    paymentMethods: [{
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'cod']
    }],
    deliveryOptions: [{
      type: {
        type: String,
        enum: ['delivery', 'pickup', 'dine-in']
      },
      available: {
        type: Boolean,
        default: true
      },
      fee: {
        type: Number,
        default: 0
      }
    }],
    minimumOrder: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP']
    }
  },
  
  // Slots-specific configuration
  slotsConfig: {
    enabled: {
      type: Boolean,
      default: false
    },
    slotTypes: [{
      name: String,
      duration: Number, // Duration in minutes
      price: {
        type: Number,
        default: 0
      },
      description: String,
      maxBookings: {
        type: Number,
        default: 1 // How many people can book the same slot
      }
    }],
    workingHours: {
      monday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      thursday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      friday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      saturday: { start: String, end: String, enabled: { type: Boolean, default: false } },
      sunday: { start: String, end: String, enabled: { type: Boolean, default: false } }
    }
  },
  
  // Widget customization that overrides user defaults
  widgetCustomization: {
    primaryColor: {
      type: String,
      default: '#667eea'
    },
    welcomeMessage: {
      type: String,
      default: ''
    },
    businessHours: {
      timezone: {
        type: String,
        default: 'Asia/Kolkata'
      },
      message: {
        type: String,
        default: 'We are currently closed. Please leave a message and we\'ll get back to you.'
      }
    },
    autoResponses: [{
      trigger: String, // Keywords that trigger this response
      response: String,
      enabled: {
        type: Boolean,
        default: true
      }
    }]
  },
  
  // Integration settings
  integrations: {
    razorpay: {
      enabled: {
        type: Boolean,
        default: false
      },
      keyId: {
        type: String,
        default: '',
        trim: true
      }
    },
    googleCalendar: {
      enabled: {
        type: Boolean,
        default: false
      },
      calendarId: {
        type: String,
        default: '',
        trim: true
      }
    },
    whatsapp: {
      enabled: {
        type: Boolean,
        default: false
      },
      businessNumber: {
        type: String,
        default: '',
        trim: true
      }
    }
  },
  
  // Plan-specific features and white-labeling
  whiteLabel: {
    enabled: {
      type: Boolean,
      default: false
    },
    level: {
      type: String,
      enum: ['basic', 'full'],
      default: 'basic'
    },
    customDomain: {
      enabled: {
        type: Boolean,
        default: false
      },
      domain: {
        type: String,
        trim: true,
        default: ''
      },
      sslEnabled: {
        type: Boolean,
        default: false
      }
    },
    branding: {
      logo: {
        type: String, // URL to logo image
        default: ''
      },
      favicon: {
        type: String, // URL to favicon
        default: ''
      },
      companyName: {
        type: String,
        default: ''
      },
      hideMonuaBranding: {
        type: Boolean,
        default: false
      },
      customFooter: {
        type: String,
        default: ''
      }
    }
  },
  
  // Subscription tier specific settings
  subscriptionFeatures: {
    tier: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free'
    },
    dedicatedBilling: {
      enabled: {
        type: Boolean,
        default: false
      },
      billingEmail: {
        type: String,
        default: ''
      },
      taxId: {
        type: String,
        default: ''
      }
    },
    rolesPermissions: {
      enabled: {
        type: Boolean,
        default: false
      },
      roles: [{
        name: {
          type: String,
          required: true
        },
        permissions: [{
          resource: {
            type: String,
            enum: ['bookings', 'orders', 'analytics', 'settings', 'users']
          },
          actions: [{
            type: String,
            enum: ['read', 'write', 'delete', 'manage']
          }]
        }]
      }],
      users: [{
        email: {
          type: String,
          required: true
        },
        role: {
          type: String,
          required: true
        },
        invitedAt: {
          type: Date,
          default: Date.now
        },
        acceptedAt: {
          type: Date
        },
        status: {
          type: String,
          enum: ['invited', 'active', 'suspended'],
          default: 'invited'
        }
      }]
    }
  },
  
  // Personal tenant flag for backward compatibility
  isPersonalTenant: {
    type: Boolean,
    default: false
  },
  
  // Company information (enhanced)
  companyInfo: {
    name: {
      type: String,
      default: ''
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    website: {
      type: String,
      default: ''
    },
    industry: {
      type: String,
      default: ''
    },
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
      default: '1-10'
    }
  },
  
  // Status and metadata
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  // Usage statistics
  usage: {
    totalConversations: {
      type: Number,
      default: 0
    },
    totalBookings: {
      type: Number,
      default: 0
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
tenantSettingsSchema.index({ tenantId: 1, status: 1 });
tenantSettingsSchema.index({ userId: 1, status: 1 });
tenantSettingsSchema.index({ 'tenantInfo.domain': 1 });

// Generate a unique tenant ID
tenantSettingsSchema.methods.generateTenantId = function() {
  const crypto = require('crypto');
  this.tenantId = 'tenant_' + crypto.randomBytes(16).toString('hex');
  return this.tenantId;
};

// Get enabled features as a simple object
tenantSettingsSchema.methods.getEnabledFeatures = function() {
  return {
    bookings: this.enabledFeatures.bookings,
    orders: this.enabledFeatures.orders,
    slots: this.enabledFeatures.slots,
    payments: this.enabledFeatures.payments,
    analytics: this.enabledFeatures.analytics
  };
};

// Get widget configuration for the frontend
tenantSettingsSchema.methods.getWidgetConfig = function() {
  const config = {
    tenantId: this.tenantId,
    primaryColor: this.widgetCustomization.primaryColor || this.customization?.primaryColor || '#667eea',
    secondaryColor: this.widgetCustomization.secondaryColor || this.customization?.secondaryColor || '#f3f4f6',
    title: this.widgetCustomization.title || this.customization?.title || 'AI Assistant',
    welcomeMessage: this.widgetCustomization.welcomeMessage || this.customization?.welcomeMessage || `Welcome to ${this.tenantInfo.name || this.companyInfo.name}! How can I help you today?`,
    placeholder: this.widgetCustomization.placeholder || this.customization?.placeholder || 'Type your message...',
    enabledFeatures: this.getEnabledFeatures(),
    businessHours: this.widgetCustomization.businessHours,
    autoResponses: this.widgetCustomization.autoResponses?.filter(ar => ar.enabled) || [],
    whiteLabel: {
      enabled: this.whiteLabel.enabled,
      level: this.whiteLabel.level,
      branding: this.whiteLabel.branding,
      hideMonuaBranding: this.whiteLabel.branding.hideMonuaBranding
    },
    isPersonalTenant: this.isPersonalTenant
  };
  
  return config;
};

// Configure subscription-based features
tenantSettingsSchema.methods.configureSubscriptionFeatures = function(userPlan) {
  const { USAGE_LIMITS } = require('../config/pricing');
  const limits = USAGE_LIMITS[userPlan];
  
  if (!limits) return;
  
  // Set subscription tier
  this.subscriptionFeatures.tier = userPlan;
  
  // Configure white-label features
  if (limits.whiteLabel) {
    this.whiteLabel.enabled = true;
    this.whiteLabel.level = limits.whiteLabel === 'full' ? 'full' : 'basic';
    this.whiteLabel.branding.hideMonuaBranding = limits.whiteLabel === 'full';
  }
  
  // Configure custom domain
  if (limits.customDomain) {
    this.whiteLabel.customDomain.enabled = true;
  }
  
  // Configure dedicated billing
  if (limits.dedicatedBilling) {
    this.subscriptionFeatures.dedicatedBilling.enabled = true;
  }
  
  // Configure roles and permissions
  if (limits.rolesPermissions) {
    this.subscriptionFeatures.rolesPermissions.enabled = true;
  }
  
  return this;
};

// Check if feature is available for current plan
tenantSettingsSchema.methods.hasFeature = function(featureName) {
  const { USAGE_LIMITS } = require('../config/pricing');
  const limits = USAGE_LIMITS[this.subscriptionFeatures.tier];
  
  return limits && limits[featureName];
};

// Get tenant configuration with plan restrictions
tenantSettingsSchema.methods.getTenantConfigForPlan = function(userPlan) {
  const { USAGE_LIMITS } = require('../config/pricing');
  const limits = USAGE_LIMITS[userPlan];
  
  const config = this.toObject();
  
  // Apply plan restrictions
  if (!limits.whiteLabel) {
    config.whiteLabel.enabled = false;
    config.whiteLabel.branding.hideMonuaBranding = false;
  }
  
  if (!limits.customDomain) {
    config.whiteLabel.customDomain.enabled = false;
  }
  
  if (!limits.dedicatedBilling) {
    config.subscriptionFeatures.dedicatedBilling.enabled = false;
  }
  
  if (!limits.rolesPermissions) {
    config.subscriptionFeatures.rolesPermissions.enabled = false;
  }
  
  return config;
};

// Static method to find tenant by ID
tenantSettingsSchema.statics.findByTenantId = function(tenantId) {
  return this.findOne({ tenantId, status: 'active' });
};

// Static method to find tenants by user ID
tenantSettingsSchema.statics.findByUserId = function(userId) {
  return this.find({ userId, status: { $ne: 'suspended' } });
};

const TenantSettings = mongoose.model('TenantSettings', tenantSettingsSchema);

module.exports = TenantSettings;
