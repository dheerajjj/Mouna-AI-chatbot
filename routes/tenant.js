const express = require('express');
const { body, validationResult } = require('express-validator');
const TenantSettings = require('../models/TenantSettings');
const DatabaseService = require('../services/DatabaseService');
const router = express.Router();

// Import authentication middleware from auth.js
const { authenticateToken } = require('./auth');

// Import subscription validation middleware
const { 
  canCreateTenant, 
  getSubscriptionInfo, 
  ensurePersonalTenant,
  canAccessTenantFeature 
} = require('../middleware/subscriptionValidation');

/**
 * PUBLIC ENDPOINT: Get tenant configuration for widget
 * This endpoint is used by the widget to fetch tenant-specific configuration
 * No authentication required as it's called by the public widget
 */
router.get('/config/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
      return res.status(400).json({ 
        error: 'Valid tenant ID is required',
        fallbackConfig: {
          enabledFeatures: {
            bookings: false,
            orders: false,
            slots: false,
            payments: false,
            analytics: false
          },
          primaryColor: '#667eea',
          welcomeMessage: '👋 Hi there! How can I help you today?'
        }
      });
    }

    // Find tenant configuration
    const tenantSettings = await TenantSettings.findByTenantId(tenantId).populate('userId');
    
    if (!tenantSettings) {
      // Return default configuration for unknown tenants
      return res.status(404).json({
        error: 'Tenant configuration not found',
        fallbackConfig: {
          tenantId: tenantId,
          enabledFeatures: {
            bookings: false,
            orders: false,
            slots: false,
            payments: false,
            analytics: false
          },
          primaryColor: '#667eea',
          welcomeMessage: '👋 Hi there! How can I help you today?',
          businessHours: {
            timezone: 'Asia/Kolkata',
            message: 'We are currently closed. Please leave a message and we\'ll get back to you.'
          },
          autoResponses: []
        }
      });
    }

    // Update last active timestamp
    tenantSettings.usage.lastActive = new Date();
    await tenantSettings.save();

    // Return widget configuration with owner subscription info for white-labeling
    const widgetConfig = tenantSettings.getWidgetConfig();
    
    // Include owner subscription info for white-labeling decisions
    const ownerSubscription = tenantSettings.userId && tenantSettings.userId.subscription ? {
      plan: tenantSettings.userId.subscription.plan || 'free',
      status: tenantSettings.userId.subscription.status || 'active'
    } : { plan: 'free', status: 'active' };
    
    res.json({
      success: true,
      config: widgetConfig,
      ownerSubscription: ownerSubscription,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching tenant config:', error);
    
    // Return fallback configuration on error
    res.status(500).json({
      error: 'Failed to fetch tenant configuration',
      fallbackConfig: {
        tenantId: req.params.tenantId,
        enabledFeatures: {
          bookings: false,
          orders: false,
          slots: false,
          payments: false,
          analytics: false
        },
        primaryColor: '#667eea',
        welcomeMessage: '👋 Hi there! How can I help you today?',
        businessHours: {
          timezone: 'Asia/Kolkata',
          message: 'We are currently closed. Please leave a message and we\'ll get back to you.'
        },
        autoResponses: []
      }
    });
  }
});

/**
 * PROTECTED ENDPOINT: Get user's tenant settings
 * Returns all tenant configurations belonging to the authenticated user
 */
router.get('/my-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const tenantSettings = await TenantSettings.findByUserId(userId)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      tenants: tenantSettings,
      count: tenantSettings.length
    });

  } catch (error) {
    console.error('Error fetching user tenant settings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tenant settings',
      details: error.message 
    });
  }
});

/**
 * PROTECTED ENDPOINT: Get specific tenant settings
 * Returns detailed configuration for a specific tenant owned by the user
 */
router.get('/settings/:tenantId', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const userId = req.user.userId;
    
    const tenantSettings = await TenantSettings.findOne({ 
      tenantId, 
      userId,
      status: { $ne: 'suspended' }
    }).populate('userId', 'name email');
    
    if (!tenantSettings) {
      return res.status(404).json({ 
        error: 'Tenant configuration not found or access denied' 
      });
    }
    
    res.json({
      success: true,
      tenant: tenantSettings
    });

  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tenant settings',
      details: error.message 
    });
  }
});

/**
 * PROTECTED ENDPOINT: Get subscription info and tenant limits
 * Returns user's subscription information and tenant usage
 */
router.get('/subscription-info', authenticateToken, getSubscriptionInfo, (req, res) => {
  res.json({
    success: true,
    subscription: req.subscriptionInfo
  });
});

/**
 * PROTECTED ENDPOINT: Get or create personal tenant (by API key)
 * Returns user's personal tenant for backward compatibility with API key authentication
 */
router.get('/personal-tenant', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required'
      });
    }
    
    // Find user by API key
    const { User } = require('../models/User');
    const user = await User.findOne({ apiKey: apiKey });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Invalid API key or user not found'
      });
    }
    
    // Get or create personal tenant
    const personalTenant = await user.getPersonalTenant();
    
    res.json({
      success: true,
      personalTenant: {
        tenantId: personalTenant.tenantId,
        companyInfo: personalTenant.companyInfo,
        isPersonalTenant: personalTenant.isPersonalTenant
      },
      message: 'Personal tenant ready for backward compatibility'
    });
    
  } catch (error) {
    console.error('Error getting personal tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get personal tenant',
      error: error.message
    });
  }
});

/**
 * PROTECTED ENDPOINT: Get or create personal tenant (authenticated)
 * Returns user's personal tenant (backward compatibility)
 */
router.get('/personal-tenant-auth', authenticateToken, ensurePersonalTenant, (req, res) => {
  res.json({
    success: true,
    personalTenant: req.personalTenant,
    message: 'Personal tenant ready for backward compatibility'
  });
});

/**
 * PROTECTED ENDPOINT: Create new tenant configuration
 * Creates a new tenant configuration for the authenticated user
 */
router.post('/settings', [
  body('tenantInfo.name').notEmpty().trim().isLength({ min: 2, max: 100 }).withMessage('Tenant name is required (2-100 characters)'),
  body('tenantInfo.description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('tenantInfo.website').optional().isURL().withMessage('Valid website URL required'),
  body('tenantInfo.domain').optional().trim(),
  body('tenantInfo.contactEmail').optional().isEmail().withMessage('Valid contact email required'),
  body('tenantInfo.contactPhone').optional().trim(),
  body('enabledFeatures.bookings').optional().isBoolean(),
  body('enabledFeatures.orders').optional().isBoolean(),
  body('enabledFeatures.slots').optional().isBoolean(),
  body('enabledFeatures.payments').optional().isBoolean(),
  body('enabledFeatures.analytics').optional().isBoolean()
], authenticateToken, canCreateTenant, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const userId = req.user.userId;
    const {
      tenantInfo,
      enabledFeatures = {},
      bookingConfig = {},
      orderConfig = {},
      slotsConfig = {},
      widgetCustomization = {},
      integrations = {}
    } = req.body;

    // Create new tenant settings
    const tenantSettings = new TenantSettings({
      userId,
      tenantInfo: {
        name: tenantInfo.name,
        description: tenantInfo.description || '',
        website: tenantInfo.website || '',
        domain: tenantInfo.domain || '',
        contactEmail: tenantInfo.contactEmail || '',
        contactPhone: tenantInfo.contactPhone || ''
      },
      enabledFeatures: {
        bookings: enabledFeatures.bookings || false,
        orders: enabledFeatures.orders || false,
        slots: enabledFeatures.slots || false,
        payments: enabledFeatures.payments || false,
        analytics: enabledFeatures.analytics || false
      },
      bookingConfig: {
        enabled: enabledFeatures.bookings || false,
        ...bookingConfig
      },
      orderConfig: {
        enabled: enabledFeatures.orders || false,
        ...orderConfig
      },
      slotsConfig: {
        enabled: enabledFeatures.slots || false,
        ...slotsConfig
      },
      widgetCustomization: {
        primaryColor: widgetCustomization.primaryColor || '#667eea',
        welcomeMessage: widgetCustomization.welcomeMessage || '',
        businessHours: widgetCustomization.businessHours || {
          timezone: 'Asia/Kolkata',
          message: 'We are currently closed. Please leave a message and we\'ll get back to you.'
        },
        autoResponses: widgetCustomization.autoResponses || []
      },
      integrations: {
        razorpay: integrations.razorpay || { enabled: false, keyId: '' },
        googleCalendar: integrations.googleCalendar || { enabled: false, calendarId: '' },
        whatsapp: integrations.whatsapp || { enabled: false, businessNumber: '' }
      }
    });

    // Generate unique tenant ID
    tenantSettings.generateTenantId();
    
    // Save to database
    await tenantSettings.save();
    
    // Increment user's tenant count (if not personal tenant)
    if (!tenantSettings.isPersonalTenant) {
      await req.user.incrementTenantCount();
    }

    console.log(`✅ New tenant configuration created: ${tenantSettings.tenantId} for user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Tenant configuration created successfully',
      tenant: tenantSettings
    });

  } catch (error) {
    console.error('Error creating tenant settings:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: 'Tenant configuration with this ID already exists' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create tenant configuration',
      details: error.message 
    });
  }
});

/**
 * PROTECTED ENDPOINT: Update tenant configuration
 * Updates an existing tenant configuration owned by the user
 */
router.put('/settings/:tenantId', [
  body('tenantInfo.name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Tenant name must be 2-100 characters'),
  body('tenantInfo.description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('tenantInfo.website').optional().isURL().withMessage('Valid website URL required'),
  body('tenantInfo.contactEmail').optional().isEmail().withMessage('Valid contact email required'),
  body('enabledFeatures.bookings').optional().isBoolean(),
  body('enabledFeatures.orders').optional().isBoolean(),
  body('enabledFeatures.slots').optional().isBoolean(),
  body('enabledFeatures.payments').optional().isBoolean(),
  body('enabledFeatures.analytics').optional().isBoolean()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { tenantId } = req.params;
    const userId = req.user.userId;
    
    // Find tenant settings belonging to the user
    const tenantSettings = await TenantSettings.findOne({ 
      tenantId, 
      userId,
      status: { $ne: 'suspended' }
    });
    
    if (!tenantSettings) {
      return res.status(404).json({ 
        error: 'Tenant configuration not found or access denied' 
      });
    }

    const updates = req.body;
    
    // Update tenant information
    if (updates.tenantInfo) {
      Object.keys(updates.tenantInfo).forEach(key => {
        if (updates.tenantInfo[key] !== undefined) {
          tenantSettings.tenantInfo[key] = updates.tenantInfo[key];
        }
      });
    }

    // Update enabled features
    if (updates.enabledFeatures) {
      Object.keys(updates.enabledFeatures).forEach(feature => {
        if (updates.enabledFeatures[feature] !== undefined) {
          tenantSettings.enabledFeatures[feature] = updates.enabledFeatures[feature];
        }
      });
    }

    // Update configuration objects
    ['bookingConfig', 'orderConfig', 'slotsConfig', 'widgetCustomization', 'integrations'].forEach(configType => {
      if (updates[configType]) {
        Object.keys(updates[configType]).forEach(key => {
          if (updates[configType][key] !== undefined) {
            if (typeof updates[configType][key] === 'object' && !Array.isArray(updates[configType][key])) {
              // For nested objects, merge properties
              tenantSettings[configType][key] = {
                ...tenantSettings[configType][key],
                ...updates[configType][key]
              };
            } else {
              tenantSettings[configType][key] = updates[configType][key];
            }
          }
        });
      }
    });

    // Ensure config enabled flags match enabledFeatures
    if (updates.enabledFeatures) {
      if (updates.enabledFeatures.bookings !== undefined) {
        tenantSettings.bookingConfig.enabled = updates.enabledFeatures.bookings;
      }
      if (updates.enabledFeatures.orders !== undefined) {
        tenantSettings.orderConfig.enabled = updates.enabledFeatures.orders;
      }
      if (updates.enabledFeatures.slots !== undefined) {
        tenantSettings.slotsConfig.enabled = updates.enabledFeatures.slots;
      }
    }

    // Save updated settings
    await tenantSettings.save();

    console.log(`✅ Tenant configuration updated: ${tenantId} for user ${userId}`);

    res.json({
      success: true,
      message: 'Tenant configuration updated successfully',
      tenant: tenantSettings
    });

  } catch (error) {
    console.error('Error updating tenant settings:', error);
    res.status(500).json({ 
      error: 'Failed to update tenant configuration',
      details: error.message 
    });
  }
});

/**
 * PROTECTED ENDPOINT: Delete/deactivate tenant configuration
 * Deactivates a tenant configuration (soft delete)
 */
router.delete('/settings/:tenantId', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const userId = req.user.userId;
    
    // Find and update tenant settings to inactive status
    const tenantSettings = await TenantSettings.findOne({ 
      tenantId, 
      userId,
      status: { $ne: 'suspended' }
    });
    
    if (!tenantSettings) {
      return res.status(404).json({ 
        error: 'Tenant configuration not found or access denied' 
      });
    }

    // Soft delete by setting status to inactive
    tenantSettings.status = 'inactive';
    await tenantSettings.save();

    console.log(`✅ Tenant configuration deactivated: ${tenantId} for user ${userId}`);

    res.json({
      success: true,
      message: 'Tenant configuration deactivated successfully'
    });

  } catch (error) {
    console.error('Error deactivating tenant settings:', error);
    res.status(500).json({ 
      error: 'Failed to deactivate tenant configuration',
      details: error.message 
    });
  }
});

/**
 * PROTECTED ENDPOINT: Get tenant usage analytics
 * Returns usage statistics for a specific tenant
 */
router.get('/analytics/:tenantId', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const userId = req.user.userId;
    
    const tenantSettings = await TenantSettings.findOne({ 
      tenantId, 
      userId,
      status: 'active'
    });
    
    if (!tenantSettings) {
      return res.status(404).json({ 
        error: 'Tenant configuration not found or access denied' 
      });
    }

    // Return usage statistics
    res.json({
      success: true,
      analytics: {
        tenantId: tenantSettings.tenantId,
        tenantName: tenantSettings.tenantInfo.name,
        usage: tenantSettings.usage,
        enabledFeatures: tenantSettings.enabledFeatures,
        createdAt: tenantSettings.createdAt,
        lastActive: tenantSettings.usage.lastActive,
        status: tenantSettings.status
      }
    });

  } catch (error) {
    console.error('Error fetching tenant analytics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tenant analytics',
      details: error.message 
    });
  }
});

module.exports = router;
