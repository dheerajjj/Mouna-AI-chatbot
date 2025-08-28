/**
 * Auto-Training Routes - Bootstrap API for Automatic Tenant Setup
 * 
 * Provides endpoints for automatic website crawling and chatbot training:
 * - POST /api/tenant/bootstrap - Start auto-training for a new tenant
 * - GET /api/tenant/training-status/:tenantId - Get training status
 * - POST /api/tenant/refresh/:tenantId - Refresh tenant data
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const AutoTrainingService = require('../services/AutoTrainingService');
const AutoTrainingProxy = require('../services/AutoTrainingProxy');
const router = express.Router();

// Initialize proxy to optional microservice
const autoTrainingProxy = new AutoTrainingProxy();

// Rate limiting for auto-training endpoints
const autoTrainingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window per IP
    message: {
        error: 'Too many auto-training requests. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Initialize auto-training service
const autoTrainingService = new AutoTrainingService();

/**
 * POST /api/tenant/bootstrap
 * Bootstrap a new tenant with automatic website training
 */
router.post('/bootstrap',
    autoTrainingLimiter,
    [
        body('websiteUrl')
            .isURL({ protocols: ['http', 'https'] })
            .withMessage('Valid website URL is required')
            .normalizeEmail(false),
        body('tenantId')
            .optional()
            .isLength({ min: 3, max: 50 })
            .withMessage('Tenant ID must be between 3 and 50 characters'),
        body('apiKey')
            .optional()
            .isLength({ min: 10 })
            .withMessage('API key must be at least 10 characters'),
        body('options')
            .optional()
            .isObject()
            .withMessage('Options must be an object'),
        body('options.maxPages')
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage('Max pages must be between 1 and 50'),
        body('options.timeout')
            .optional()
            .isInt({ min: 5000, max: 60000 })
            .withMessage('Timeout must be between 5 and 60 seconds')
    ],
    async (req, res) => {
        try {
            // Validate input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { websiteUrl, tenantId, apiKey, options = {} } = req.body;

            console.log(`🚀 Bootstrap request for website: ${websiteUrl}`);

            // Generate tenant ID if not provided
            const finalTenantId = tenantId || `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Validate API key if provided (implement your API key validation logic)
            if (apiKey) {
                const isValidApiKey = await validateApiKey(apiKey);
                if (!isValidApiKey) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid API key provided'
                    });
                }
            }

            // Check if tenant already exists
            const existingTenant = await checkExistingTenant(finalTenantId);
            if (existingTenant) {
                return res.status(409).json({
                    success: false,
                    error: 'Tenant already exists',
                    tenantId: finalTenantId,
                    existing: true
                });
            }

            // Start auto-training process
            const trainingOptions = {
                maxPages: Math.min(options.maxPages || 15, 50), // Cap at 50 pages
                timeout: options.timeout || 30000,
                includeImages: options.includeImages || false,
                forceUpdate: options.forceUpdate || false,
                ...options
            };

            // Start training asynchronously
            const trainingPromise = autoTrainingService.bootstrapTenant(
                websiteUrl,
                finalTenantId,
                trainingOptions
            );

            // Don't wait for completion - return immediately with session info
            res.status(202).json({
                success: true,
                message: 'Auto-training started successfully',
                tenantId: finalTenantId,
                websiteUrl,
                status: 'training_started',
                estimated_completion: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes estimate
                check_status_url: `/api/tenant/training-status/${finalTenantId}`,
                configuration_preview_url: `/api/tenant/config/${finalTenantId}`,
                training_options: trainingOptions
            });

            // Handle training completion asynchronously
            trainingPromise
                .then(result => {
                    console.log(`✅ Training completed for tenant: ${finalTenantId}`);
                    // Could send webhook notification here
                })
                .catch(error => {
                    console.error(`❌ Training failed for tenant: ${finalTenantId}`, error);
                    // Could send error webhook notification here
                });

        } catch (error) {
            console.error('Bootstrap endpoint error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error during auto-training setup',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * GET /api/tenant/training-status/:tenantId
 * Get training status for a tenant
 */
router.get('/training-status/:tenantId',
    [
        param('tenantId')
            .isLength({ min: 3, max: 50 })
            .withMessage('Valid tenant ID is required')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid tenant ID',
                    details: errors.array()
                });
            }

            const { tenantId } = req.params;

            console.log(`📊 Getting training status for tenant: ${tenantId}`);

            const status = await autoTrainingService.getTrainingStatus(tenantId);

            res.json({
                success: true,
                tenantId,
                status,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('Training status endpoint error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get training status',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * POST /api/tenant/refresh/:tenantId
 * Refresh tenant data by re-crawling website
 */
router.post('/refresh/:tenantId',
    autoTrainingLimiter,
    [
        param('tenantId')
            .isLength({ min: 3, max: 50 })
            .withMessage('Valid tenant ID is required'),
        body('options')
            .optional()
            .isObject()
            .withMessage('Options must be an object'),
        body('options.forceUpdate')
            .optional()
            .isBoolean()
            .withMessage('Force update must be a boolean')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { tenantId } = req.params;
            const { options = {} } = req.body;

            console.log(`🔄 Refresh request for tenant: ${tenantId}`);

            // Check if tenant exists
            const tenantExists = await checkExistingTenant(tenantId);
            if (!tenantExists) {
                return res.status(404).json({
                    success: false,
                    error: 'Tenant not found',
                    tenantId
                });
            }

            // Start refresh process
            const refreshPromise = autoTrainingService.refreshTenantData(tenantId, options);

            // Return immediately
            res.status(202).json({
                success: true,
                message: 'Tenant data refresh started',
                tenantId,
                status: 'refreshing',
                estimated_completion: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes estimate
                check_status_url: `/api/tenant/training-status/${tenantId}`
            });

            // Handle refresh completion asynchronously
            refreshPromise
                .then(result => {
                    console.log(`✅ Refresh completed for tenant: ${tenantId}`, result);
                })
                .catch(error => {
                    console.error(`❌ Refresh failed for tenant: ${tenantId}`, error);
                });

        } catch (error) {
            console.error('Refresh endpoint error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start tenant refresh',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * GET /api/tenant/auto-training-demo
 * Demo endpoint to show auto-training capabilities
 */
router.get('/auto-training-demo', async (req, res) => {
    try {
        const demoBusinessTypes = [
            {
                type: 'restaurant',
                description: 'Automatically detects menu items, enables reservations, sets up delivery info',
                features: ['Menu browsing', 'Table reservations', 'Delivery tracking', 'Dietary restrictions'],
                color: '#e74c3c',
                example_sites: ['restaurant.example.com', 'pizzaplace.demo']
            },
            {
                type: 'clinic',
                description: 'Detects medical services, enables appointment booking, insurance info',
                features: ['Appointment scheduling', 'Doctor profiles', 'Insurance verification', 'Patient portal'],
                color: '#3498db',
                example_sites: ['healthclinic.example.com', 'medcenter.demo']
            },
            {
                type: 'ecommerce',
                description: 'Identifies products, enables order tracking, return policies',
                features: ['Product search', 'Order tracking', 'Shipping info', 'Return assistance'],
                color: '#f39c12',
                example_sites: ['store.example.com', 'shop.demo']
            },
            {
                type: 'service',
                description: 'Detects professional services, enables consultation booking',
                features: ['Service consultation', 'Quote requests', 'Portfolio display', 'Project inquiries'],
                color: '#9b59b6',
                example_sites: ['agency.example.com', 'consulting.demo']
            }
        ];

        res.json({
            success: true,
            message: 'Auto-training capabilities demonstration',
            how_it_works: [
                '1. Provide your website URL',
                '2. AI crawls and analyzes your site content',
                '3. Automatically detects your business type',
                '4. Generates relevant FAQs from your content',
                '5. Enables appropriate chatbot features',
                '6. Configures responses with your business info'
            ],
            supported_business_types: demoBusinessTypes,
            demo_endpoint: '/api/tenant/bootstrap',
            example_request: {
                websiteUrl: 'https://your-business.com',
                options: {
                    maxPages: 15,
                    timeout: 30000
                }
            },
            features: [
                'Zero manual setup required',
                'Automatic business type detection',
                'AI-generated FAQs from your content',
                'Smart feature enablement',
                'Periodic content refresh',
                'Source attribution for all responses'
            ]
        });

    } catch (error) {
        console.error('Demo endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load demo information'
        });
    }
});

/**
 * POST /api/tenant/validate-website
 * Validate website URL before starting auto-training
 */
router.post('/validate-website',
    [
        body('websiteUrl')
            .isURL({ protocols: ['http', 'https'] })
            .withMessage('Valid website URL is required')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid website URL',
                    details: errors.array()
                });
            }

            const { websiteUrl } = req.body;

            console.log(`🔍 Validating website: ${websiteUrl}`);

            // Basic URL validation and accessibility check
            const validation = await validateWebsite(websiteUrl);

            res.json({
                success: true,
                websiteUrl,
                validation,
                ready_for_training: validation.accessible && !validation.blocked_by_robots,
                estimated_training_time: validation.accessible ? '3-5 minutes' : 'Not applicable'
            });

        } catch (error) {
            console.error('Website validation error:', error);
            res.status(500).json({
                success: false,
                error: 'Website validation failed',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// Helper functions

/**
 * Validate API key
 * @param {string} apiKey - API key to validate
 * @returns {boolean} Whether API key is valid
 */
async function validateApiKey(apiKey) {
    try {
        // Implement your API key validation logic here
        // This could check against your database, JWT verification, etc.
        
        // For demo purposes, accept any key longer than 10 characters
        return apiKey && apiKey.length >= 10;
        
    } catch (error) {
        console.error('API key validation error:', error);
        return false;
    }
}

/**
 * Check if tenant already exists
 * @param {string} tenantId - Tenant ID to check
 * @returns {boolean} Whether tenant exists
 */
async function checkExistingTenant(tenantId) {
    try {
        // Implement tenant existence check
        // This should check your database for existing tenant
        
        // Use the direct Mongo connection exported by the main server
        const { getDb } = require('../server-mongo');
        const db = getDb();
        const existingTenant = await db.collection('tenants').findOne({ tenantId });
        return !!existingTenant;
        
    } catch (error) {
        console.error('Tenant check error:', error);
        return false;
    }
}

/**
 * Validate website accessibility
 * @param {string} websiteUrl - Website URL to validate
 * @returns {Object} Validation results
 */
async function validateWebsite(websiteUrl) {
    try {
        const axios = require('axios');
        const { URL } = require('url');
        
        const urlObj = new URL(websiteUrl);
        const validation = {
            url: websiteUrl,
            domain: urlObj.hostname,
            protocol: urlObj.protocol,
            accessible: false,
            response_time: null,
            status_code: null,
            blocked_by_robots: false,
            has_sitemap: false,
            content_type: null,
            issues: []
        };

        // Check website accessibility
        const startTime = Date.now();
        try {
            const response = await axios.get(websiteUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; AIchatbot-crawler/1.0)'
                }
            });
            
            validation.accessible = true;
            validation.response_time = Date.now() - startTime;
            validation.status_code = response.status;
            validation.content_type = response.headers['content-type'];
            
            // Check if HTML content
            if (!validation.content_type || !validation.content_type.includes('text/html')) {
                validation.issues.push('Website does not serve HTML content');
            }
            
        } catch (error) {
            validation.accessible = false;
            validation.issues.push(`Website not accessible: ${error.message}`);
        }

        // Check robots.txt
        try {
            const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
            const robotsResponse = await axios.get(robotsUrl, { timeout: 5000 });
            
            if (robotsResponse.data.toLowerCase().includes('disallow: /')) {
                validation.blocked_by_robots = true;
                validation.issues.push('Website blocks crawlers via robots.txt');
            }
        } catch (error) {
            // robots.txt not found or not accessible - this is fine
        }

        // Check for sitemap
        try {
            const sitemapUrl = `${urlObj.protocol}//${urlObj.host}/sitemap.xml`;
            const sitemapResponse = await axios.head(sitemapUrl, { timeout: 5000 });
            
            if (sitemapResponse.status === 200) {
                validation.has_sitemap = true;
            }
        } catch (error) {
            // Sitemap not found - this is fine
        }

        return validation;
        
    } catch (error) {
        console.error('Website validation error:', error);
        return {
            url: websiteUrl,
            accessible: false,
            issues: [`Validation failed: ${error.message}`]
        };
    }
}

/**
 * GET /api/tenant/auto-training/status
 * Health and availability for the optional auto-training microservice
 */
router.get('/auto-training/status', async (req, res) => {
    try {
        const info = await autoTrainingProxy.getServiceInfo();
        const isAvailable = !!(info && info.available);
        const payload = {
            success: true,
            enabled: info?.enabled ?? true,
            available: isAvailable,
            url: info?.url,
            health: info?.health || null,
            info: info?.info || null
        };
        return res.status(isAvailable ? 200 : 503).json(payload);
    } catch (error) {
        return res.status(503).json({ success: false, available: false, error: error.message });
    }
});

module.exports = router;
