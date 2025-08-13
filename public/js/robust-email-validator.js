/**
 * Robust Email Validator - Client-side JavaScript Library
 * Provides real-time email validation with server-side integration
 */
class RobustEmailValidatorClient {
    constructor(options = {}) {
        this.apiBase = options.apiBase || '/api/email';
        this.timeout = options.timeout || 30000;
        this.debug = options.debug || false;
        
        // Cache for validation results
        this.validationCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        
        // Real-time validation settings
        this.debounceTimeout = null;
        this.debounceDelay = 500; // ms
        
        this.log('Robust Email Validator initialized');
    }
    
    /**
     * Validate email address with comprehensive checks
     * @param {string} email - Email to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation result
     */
    async validateEmail(email, options = {}) {
        try {
            if (!email || typeof email !== 'string') {
                return {
                    valid: false,
                    verified: false,
                    reasons: ['Email address is required'],
                    suggestions: [],
                    details: {},
                    metadata: {}
                };
            }
            
            const cleanEmail = email.toLowerCase().trim();
            
            // Check cache first
            const cached = this.getCachedValidation(cleanEmail);
            if (cached && !options.skipCache) {
                this.log('Returning cached validation result for:', cleanEmail);
                return cached;
            }
            
            this.log('Validating email:', cleanEmail);
            
            // Perform client-side pre-validation
            const preValidation = this.preValidateEmail(cleanEmail);
            if (!preValidation.valid) {
                // Cache negative results for a shorter time
                this.cacheValidation(cleanEmail, preValidation, 30000); // 30 seconds
                return preValidation;
            }
            
            // Server-side validation
            const response = await this.makeRequest('POST', '/validate', {
                email: cleanEmail,
                requireOTP: options.requireOTP !== false
            });
            
            // Cache the result
            this.cacheValidation(cleanEmail, response);
            
            this.log('Validation completed for:', cleanEmail, response);
            return response;
            
        } catch (error) {
            this.log('Validation error:', error);
            return {
                valid: false,
                verified: false,
                reasons: ['Unable to validate email - please check your connection'],
                suggestions: [],
                details: {},
                metadata: { error: error.message }
            };
        }
    }
    
    /**
     * Client-side pre-validation for immediate feedback
     * @param {string} email - Email to pre-validate
     * @returns {Object} Pre-validation result
     */
    preValidateEmail(email) {
        const result = {
            valid: false,
            verified: false,
            reasons: [],
            suggestions: [],
            details: {
                syntax: false,
                domain: false,
                disposable: false,
                clientSide: true
            },
            metadata: {
                preValidation: true,
                validationTime: 0
            }
        };
        
        const startTime = Date.now();
        
        // Basic syntax check
        if (!this.isValidEmailSyntax(email)) {
            result.reasons.push('Invalid email format');
            result.suggestions = this.getSyntaxSuggestions(email);
            result.metadata.validationTime = Date.now() - startTime;
            return result;
        }
        result.details.syntax = true;
        
        // Extract domain
        const [localPart, domain] = email.split('@');
        
        // Check for obvious disposable domains
        if (this.isKnownDisposable(domain)) {
            result.reasons.push('Disposable email addresses are not allowed');
            result.details.disposable = true;
            result.suggestions = this.getAlternativeProviders(localPart);
            result.metadata.validationTime = Date.now() - startTime;
            return result;
        }
        
        // Check for obvious typos
        const typoSuggestions = this.detectCommonTypos(email);
        if (typoSuggestions.length > 0) {
            result.suggestions = typoSuggestions;
            result.reasons.push('Possible typo detected - did you mean one of the suggestions?');
        }
        
        // Pre-validation passed
        result.valid = true;
        result.metadata.validationTime = Date.now() - startTime;
        
        return result;
    }
    
    /**
     * Send OTP to email address
     * @param {string} email - Email address
     * @returns {Promise<Object>} OTP send result
     */
    async sendOTP(email) {
        try {
            this.log('Sending OTP to:', email);
            
            const response = await this.makeRequest('POST', '/send-otp', {
                email: email.toLowerCase().trim()
            });
            
            this.log('OTP send result:', response);
            return response;
            
        } catch (error) {
            this.log('Send OTP error:', error);
            return {
                success: false,
                reason: 'Failed to send OTP - please try again',
                code: 'SEND_FAILED'
            };
        }
    }
    
    /**
     * Verify OTP
     * @param {string} email - Email address
     * @param {string} otp - OTP code
     * @returns {Promise<Object>} Verification result
     */
    async verifyOTP(email, otp) {
        try {
            this.log('Verifying OTP for:', email);
            
            const response = await this.makeRequest('POST', '/verify-otp', {
                email: email.toLowerCase().trim(),
                otp: otp.toString()
            });
            
            // Clear cache for this email since verification status changed
            this.clearCache(email);
            
            this.log('OTP verification result:', response);
            return response;
            
        } catch (error) {
            this.log('Verify OTP error:', error);
            return {
                success: false,
                reason: 'Failed to verify OTP - please try again',
                code: 'VERIFY_FAILED'
            };
        }
    }
    
    /**
     * Check email status (valid/verified)
     * @param {string} email - Email address
     * @returns {Promise<Object>} Status result
     */
    async checkStatus(email) {
        try {
            const response = await this.makeRequest('POST', '/check-status', {
                email: email.toLowerCase().trim()
            });
            
            return response;
            
        } catch (error) {
            this.log('Check status error:', error);
            return {
                success: false,
                reason: 'Failed to check email status'
            };
        }
    }
    
    /**
     * Validate multiple emails
     * @param {Array<string>} emails - Array of emails to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Batch validation result
     */
    async validateMultiple(emails, options = {}) {
        try {
            if (!Array.isArray(emails) || emails.length === 0) {
                return {
                    success: false,
                    reason: 'Array of email addresses is required',
                    results: []
                };
            }
            
            this.log('Validating batch of emails:', emails.length);
            
            const response = await this.makeRequest('POST', '/validate-multiple', {
                emails: emails.map(email => email.toLowerCase().trim()),
                requireOTP: options.requireOTP !== false
            });
            
            return response;
            
        } catch (error) {
            this.log('Batch validation error:', error);
            return {
                success: false,
                reason: 'Failed to validate emails - please try again',
                results: []
            };
        }
    }
    
    /**
     * Setup real-time validation for an input element
     * @param {HTMLElement|string} element - Input element or selector
     * @param {Object} options - Validation options
     */
    setupRealTimeValidation(element, options = {}) {
        const input = typeof element === 'string' ? document.querySelector(element) : element;
        
        if (!input) {
            console.error('Input element not found');
            return;
        }
        
        const settings = {
            showSuggestions: true,
            showStatus: true,
            requireOTP: true,
            onValidation: null,
            onOTPSent: null,
            onVerified: null,
            ...options
        };
        
        // Create status elements
        const statusContainer = this.createStatusContainer(input, settings);
        
        // Add event listeners
        input.addEventListener('input', (e) => {
            this.handleRealTimeInput(e, statusContainer, settings);
        });
        
        input.addEventListener('blur', (e) => {
            this.handleRealTimeBlur(e, statusContainer, settings);
        });
        
        this.log('Real-time validation setup for input:', input);
    }
    
    /**
     * Handle real-time input changes
     */
    handleRealTimeInput(event, statusContainer, settings) {
        const email = event.target.value;
        
        // Clear previous timeout
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        
        // Clear status for empty input
        if (!email) {
            this.updateStatus(statusContainer, null);
            return;
        }
        
        // Show loading state
        this.updateStatus(statusContainer, {
            type: 'loading',
            message: 'Validating...'
        });
        
        // Debounced validation
        this.debounceTimeout = setTimeout(async () => {
            const result = await this.validateEmail(email, settings);
            this.updateStatus(statusContainer, result);
            
            if (settings.onValidation) {
                settings.onValidation(result);
            }
        }, this.debounceDelay);
    }
    
    /**
     * Handle input blur (focus lost)
     */
    handleRealTimeBlur(event, statusContainer, settings) {
        // Force immediate validation on blur
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        
        const email = event.target.value;
        if (email) {
            this.validateEmail(email, settings).then(result => {
                this.updateStatus(statusContainer, result);
                
                if (settings.onValidation) {
                    settings.onValidation(result);
                }
            });
        }
    }
    
    /**
     * Create status container for real-time validation
     */
    createStatusContainer(input, settings) {
        // Remove existing container
        const existing = input.parentNode.querySelector('.email-validation-status');
        if (existing) {
            existing.remove();
        }
        
        const container = document.createElement('div');
        container.className = 'email-validation-status';
        container.style.cssText = `
            margin-top: 5px;
            font-size: 12px;
            line-height: 1.4;
        `;
        
        input.parentNode.insertBefore(container, input.nextSibling);
        
        return container;
    }
    
    /**
     * Update validation status display
     */
    updateStatus(container, result) {
        if (!result) {
            container.innerHTML = '';
            return;
        }
        
        if (result.type === 'loading') {
            container.innerHTML = `
                <div style="color: #666;">
                    <span>⏳</span> ${result.message}
                </div>
            `;
            return;
        }
        
        let html = '';
        
        if (result.valid && result.verified) {
            html = `
                <div style="color: #28a745;">
                    <span>✅</span> Email is valid and verified
                </div>
            `;
        } else if (result.valid) {
            html = `
                <div style="color: #ffc107;">
                    <span>⚠️</span> Email is valid but needs verification
                    <button onclick="this.parentNode.nextSibling.style.display='block'" 
                            style="margin-left: 10px; padding: 2px 8px; font-size: 11px;">
                        Send OTP
                    </button>
                </div>
                <div style="display: none; margin-top: 5px;">
                    <input type="text" placeholder="Enter OTP" style="width: 100px; margin-right: 5px;">
                    <button onclick="this.disabled=true;">Verify</button>
                </div>
            `;
        } else {
            html = `
                <div style="color: #dc3545;">
                    <span>❌</span> ${result.reasons.join(', ')}
                </div>
            `;
            
            if (result.suggestions && result.suggestions.length > 0) {
                html += `
                    <div style="color: #007bff; margin-top: 3px;">
                        <span>💡</span> Did you mean: 
                        ${result.suggestions.map(suggestion => 
                            `<span style="cursor: pointer; text-decoration: underline;" 
                                   onclick="this.closest('.email-validation-status').previousSibling.value='${suggestion}'">${suggestion}</span>`
                        ).join(', ')}
                    </div>
                `;
            }
        }
        
        container.innerHTML = html;
    }
    
    /**
     * Client-side syntax validation
     */
    isValidEmailSyntax(email) {
        if (!email || typeof email !== 'string') return false;
        if (email.length > 254) return false;
        if (!email.includes('@')) return false;
        if (email.startsWith('@') || email.endsWith('@')) return false;
        if (email.includes('..')) return false;
        
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email);
    }
    
    /**
     * Check for known disposable domains (client-side subset)
     */
    isKnownDisposable(domain) {
        const commonDisposable = [
            '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
            'mailinator.com', 'yopmail.com', 'throwaway.email',
            'fakeinbox.com', 'trashmail.com', 'test.com', 'example.com'
        ];
        
        return commonDisposable.includes(domain.toLowerCase());
    }
    
    /**
     * Detect common typos
     */
    detectCommonTypos(email) {
        const [localPart, domain] = email.split('@');
        const suggestions = [];
        
        const typoMap = {
            'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com',
            'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com',
            'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
            'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com'
        };
        
        if (typoMap[domain]) {
            suggestions.push(`${localPart}@${typoMap[domain]}`);
        }
        
        return suggestions;
    }
    
    /**
     * Get syntax error suggestions
     */
    getSyntaxSuggestions(email) {
        const suggestions = [];
        
        if (!email.includes('@')) {
            return ['Email must contain @ symbol'];
        }
        
        if (email.includes('..')) {
            suggestions.push(email.replace('..', '.'));
        }
        
        return suggestions;
    }
    
    /**
     * Get alternative providers
     */
    getAlternativeProviders(localPart) {
        return [
            `${localPart}@gmail.com`,
            `${localPart}@yahoo.com`,
            `${localPart}@outlook.com`
        ];
    }
    
    /**
     * Cache validation result
     */
    cacheValidation(email, result, ttl = null) {
        this.validationCache.set(email, {
            result: result,
            timestamp: Date.now(),
            ttl: ttl || this.cacheExpiry
        });
    }
    
    /**
     * Get cached validation result
     */
    getCachedValidation(email) {
        const cached = this.validationCache.get(email);
        
        if (!cached) return null;
        
        const age = Date.now() - cached.timestamp;
        if (age > cached.ttl) {
            this.validationCache.delete(email);
            return null;
        }
        
        return cached.result;
    }
    
    /**
     * Clear cache for specific email
     */
    clearCache(email) {
        if (email) {
            this.validationCache.delete(email.toLowerCase().trim());
        } else {
            this.validationCache.clear();
        }
    }
    
    /**
     * Make HTTP request to API
     */
    async makeRequest(method, endpoint, data = null) {
        const url = this.apiBase + endpoint;
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        options.signal = controller.signal;
        
        try {
            const response = await fetch(url, options);
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.headers.get('content-type')?.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.reason || errorData.message || 'API request failed');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            return await response.json();
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            throw error;
        }
    }
    
    /**
     * Debug logging
     */
    log(...args) {
        if (this.debug) {
            console.log('[RobustEmailValidator]', ...args);
        }
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RobustEmailValidatorClient;
} else {
    window.RobustEmailValidatorClient = RobustEmailValidatorClient;
}
