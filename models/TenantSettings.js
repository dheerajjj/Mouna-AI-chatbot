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
  return {
    tenantId: this.tenantId,
    primaryColor: this.widgetCustomization.primaryColor,
    welcomeMessage: this.widgetCustomization.welcomeMessage || `Welcome to ${this.tenantInfo.name}! How can I help you today?`,
    enabledFeatures: this.getEnabledFeatures(),
    businessHours: this.widgetCustomization.businessHours,
    autoResponses: this.widgetCustomization.autoResponses.filter(ar => ar.enabled)
  };
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
