/**
 * AutoTrainingProxy - Proxy Service for Auto-Training Microservice
 * 
 * Forwards auto-training requests to the dedicated microservice
 * with proper error handling and fallback behavior.
 */

const axios = require('axios');

class AutoTrainingProxy {
    constructor() {
        this.microserviceUrl = process.env.AUTO_TRAINING_SERVICE_URL || 'http://localhost:3001';
        this.serviceKey = process.env.INTERNAL_SERVICE_KEY || 'default-service-key';
        this.timeout = 30000; // 30 seconds
        this.enabled = process.env.AUTO_TRAINING_ENABLED !== 'false';
        
        console.log('🔗 AutoTrainingProxy initialized', {
            enabled: this.enabled,
            microserviceUrl: this.microserviceUrl,
            timeout: this.timeout
        });
    }

    /**
     * Check if auto-training service is available
     * @returns {Promise<boolean>}
     */
    async isServiceAvailable() {
        if (!this.enabled) return false;
        
        try {
            const response = await axios.get(`${this.microserviceUrl}/health`, {
                timeout: 5000,
                headers: { 'X-API-Key': this.serviceKey }
            });
            return response.status === 200 && response.data.status === 'healthy';
        } catch (error) {
            console.warn('🔴 Auto-training service unavailable:', error.message);
            return false;
        }
    }

    /**
     * Bootstrap tenant auto-training from website URL
     * @param {string} websiteUrl - Website URL to analyze
     * @param {Object} options - Training options
     * @returns {Promise<Object>}
     */
    async bootstrap(websiteUrl, options = {}) {
        if (!this.enabled) {
            throw new Error('Auto-training service is disabled');
        }

        try {
            const response = await axios.post(`${this.microserviceUrl}/api/bootstrap`, {
                websiteUrl,
                options
            }, {
                timeout: this.timeout,
                headers: {
                    'X-API-Key': this.serviceKey,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('❌ Auto-training bootstrap failed:', error.message);
            throw new Error('Auto-training service unavailable. Please try again later.');
        }
    }

    /**
     * Get training session status
     * @param {string} sessionId - Training session ID
     * @returns {Promise<Object>}
     */
    async getStatus(sessionId) {
        if (!this.enabled) {
            throw new Error('Auto-training service is disabled');
        }

        try {
            const response = await axios.get(`${this.microserviceUrl}/api/status/${sessionId}`, {
                timeout: 10000,
                headers: { 'X-API-Key': this.serviceKey }
            });

            return response.data;
        } catch (error) {
            console.error('❌ Get training status failed:', error.message);
            throw new Error('Failed to retrieve training status');
        }
    }

    /**
     * Refresh tenant training data
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Refresh options
     * @returns {Promise<Object>}
     */
    async refresh(tenantId, options = {}) {
        if (!this.enabled) {
            throw new Error('Auto-training service is disabled');
        }

        try {
            const response = await axios.post(`${this.microserviceUrl}/api/refresh`, {
                tenantId,
                options
            }, {
                timeout: this.timeout,
                headers: {
                    'X-API-Key': this.serviceKey,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('❌ Auto-training refresh failed:', error.message);
            throw new Error('Auto-training refresh service unavailable');
        }
    }

    /**
     * Analyze website business type
     * @param {string} websiteUrl - Website URL
     * @returns {Promise<Object>}
     */
    async analyzeBusinessType(websiteUrl) {
        if (!this.enabled) {
            throw new Error('Auto-training service is disabled');
        }

        try {
            const response = await axios.post(`${this.microserviceUrl}/api/analyze-business`, {
                websiteUrl
            }, {
                timeout: 20000,
                headers: {
                    'X-API-Key': this.serviceKey,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('❌ Business analysis failed:', error.message);
            throw new Error('Business analysis service unavailable');
        }
    }

    /**
     * Crawl website and extract content
     * @param {string} websiteUrl - Website URL
     * @param {Object} options - Crawling options
     * @returns {Promise<Object>}
     */
    async crawlWebsite(websiteUrl, options = {}) {
        if (!this.enabled) {
            throw new Error('Auto-training service is disabled');
        }

        try {
            const response = await axios.post(`${this.microserviceUrl}/api/crawl`, {
                websiteUrl,
                options
            }, {
                timeout: this.timeout,
                headers: {
                    'X-API-Key': this.serviceKey,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('❌ Website crawling failed:', error.message);
            throw new Error('Website crawling service unavailable');
        }
    }

    /**
     * Get service health and capabilities
     * @returns {Promise<Object>}
     */
    async getServiceInfo() {
        try {
            const [healthResponse, infoResponse] = await Promise.allSettled([
                axios.get(`${this.microserviceUrl}/health`, {
                    timeout: 5000,
                    headers: { 'X-API-Key': this.serviceKey }
                }),
                axios.get(`${this.microserviceUrl}/info`, {
                    timeout: 5000,
                    headers: { 'X-API-Key': this.serviceKey }
                })
            ]);

            return {
                enabled: this.enabled,
                available: healthResponse.status === 'fulfilled' && healthResponse.value.status === 200,
                health: healthResponse.status === 'fulfilled' ? healthResponse.value.data : null,
                info: infoResponse.status === 'fulfilled' ? infoResponse.value.data : null,
                url: this.microserviceUrl
            };
        } catch (error) {
            return {
                enabled: this.enabled,
                available: false,
                error: error.message,
                url: this.microserviceUrl
            };
        }
    }

    /**
     * Forward request to microservice with proper error handling
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @param {Object} options - Request options
     * @returns {Promise<Object>}
     */
    async forwardRequest(method, endpoint, data = null, options = {}) {
        if (!this.enabled) {
            throw new Error('Auto-training service is disabled');
        }

        try {
            const config = {
                method,
                url: `${this.microserviceUrl}${endpoint}`,
                timeout: options.timeout || this.timeout,
                headers: {
                    'X-API-Key': this.serviceKey,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            };

            if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error(`❌ Auto-training ${method} ${endpoint} failed:`, error.message);
            
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Auto-training service is currently unavailable');
            } else if (error.response?.status === 401) {
                throw new Error('Authentication failed with auto-training service');
            } else if (error.response?.status >= 400) {
                throw new Error(error.response.data?.message || 'Auto-training request failed');
            } else {
                throw new Error('Auto-training service error');
            }
        }
    }
}

module.exports = AutoTrainingProxy;
