const express = require('express');
const router = express.Router();

// Test endpoint to create a sample tenant for testing
router.post('/create-test-tenant', async (req, res) => {
  try {
    const TenantSettings = require('../models/TenantSettings');
    const DatabaseService = require('../services/DatabaseService');
    
    // Check if we have a MongoDB connection
    if (!DatabaseService.isMongoConnected) {
      return res.status(500).json({
        error: 'MongoDB not connected',
        message: 'Cannot create tenant without MongoDB connection',
        fallback: 'Using mock data for testing'
      });
    }

    // Create a test tenant
    const testTenant = new TenantSettings({
      tenantId: 'tenant_test_123456',
      userId: '507f1f77bcf86cd799439011', // Mock ObjectId
      tenantInfo: {
        name: 'Test Restaurant',
        description: 'A test restaurant for demo purposes',
        website: 'https://test-restaurant.com',
        domain: 'test-restaurant.com',
        contactEmail: 'contact@test-restaurant.com',
        contactPhone: '+1234567890'
      },
      enabledFeatures: {
        bookings: true,
        orders: true,
        slots: false,
        payments: true,
        analytics: true
      },
      widgetCustomization: {
        primaryColor: '#e67e22',
        welcomeMessage: 'Welcome to Test Restaurant! How can we help you today?'
      }
    });

    // Generate tenant ID
    testTenant.generateTenantId();
    
    // Save to database
    const savedTenant = await testTenant.save();

    res.json({
      success: true,
      message: 'Test tenant created successfully!',
      tenant: {
        tenantId: savedTenant.tenantId,
        name: savedTenant.tenantInfo.name,
        enabledFeatures: savedTenant.enabledFeatures
      },
      testUrl: `/api/tenant/config/${savedTenant.tenantId}`
    });

  } catch (error) {
    console.error('Test tenant creation error:', error);
    
    // Return a working tenant ID for testing anyway
    res.json({
      success: false,
      error: error.message,
      message: 'Could not create test tenant in database',
      testTenantId: 'tenant_demo_789abc',
      testUrl: '/api/tenant/config/tenant_demo_789abc',
      note: 'This will return fallback config since tenant does not exist in DB'
    });
  }
});

// Test endpoint to get system status
router.get('/status', (req, res) => {
  const DatabaseService = require('../services/DatabaseService');
  const dbStatus = DatabaseService.getConnectionStatus();
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    database: dbStatus,
    tenantSystemStatus: 'Active',
    availableEndpoints: [
      'POST /api/test-tenant/create-test-tenant - Create test tenant',
      'GET /api/tenant/config/:tenantId - Get tenant config (public)',
      'GET /tenant/dashboard - Tenant management UI (auth required)'
    ]
  });
});

module.exports = router;
