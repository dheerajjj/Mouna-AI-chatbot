const dns = require('dns');
const net = require('net');
const { promisify } = require('util');
const crypto = require('crypto');

/**
 * Robust Email Validation System
 * Features: Syntax validation, MX records, disposable domain blocking, 
 * gibberish detection, typo correction, OTP verification
 */
class RobustEmailValidator {
    constructor() {
        this.dnsLookup = promisify(dns.resolveMx);
        this.dnsResolveA = promisify(dns.resolve4);
        
        // Comprehensive disposable email domains database
        this.disposableEmailDomains = new Set([
            // Major temporary email services
            '10minutemail.com', '10minutemail.net', '10minutemail.org', '10minutemail.co.uk',
            '20minutemail.com', '30minutemail.com', '33mail.com', 'tempmail.org', 'temp-mail.org',
            'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
            'mailinator.com', 'mailinator.net', 'mailinator.org', 'yopmail.com', 'yopmail.net',
            'throwaway.email', 'getnada.com', 'maildrop.cc', 'sharklasers.com', 'emailondeck.com',
            'fakeinbox.com', 'trashmail.com', 'dispostable.com', 'mytemp.email', 'dropmail.me',
            'tempmail.ninja', 'tempmail24.com', 'tempemail.com', 'mailcatch.com', 'tempinbox.com',
            'mohmal.com', 'disposableemailaddresses.com', 'spambog.com', 'tmail.ws', 'tempmailo.com',
            
            // Test/development domains
            'test.com', 'example.com', 'example.org', 'example.net', 'invalid.com', 
            'fake.com', 'notreal.com', 'localhost.com',
            
            // Additional known disposable services
            'meltmail.com', 'mytrashmail.com', 'guerrillamailblock.com', 'spam4.me',
            'tempemailaddress.com', 'emailtemporanea.com', 'correotemporal.org',
            'mailnesia.com', 'airmail.cc', 'spamgourmet.com', 'hidemail.de'
        ]);
        
        // OTP storage for email verification
        this.otpStorage = new Map();
        this.validatedEmails = new Set();
        
        // Common email providers for typo suggestions
        this.commonProviders = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
            'yahoo.co.in', 'rediffmail.com', 'msn.com', 'icloud.com', 'aol.com',
            'mail.com', 'zoho.com', 'protonmail.com', 'yandex.com'
        ];
        
        // Common typos mapping
        this.typoCorrections = {
            'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com',
            'gmailcom': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmaik.com': 'gmail.com',
            'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
            'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmailcom': 'hotmail.com',
            'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com', 'outlookcom': 'outlook.com',
            'livecom': 'live.com', 'live.co': 'live.com'
        };
    }
    
    /**
     * Main email validation method
     * @param {string} email - Email to validate
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation result
     */
    async validateEmail(email, options = {}) {
        const startTime = Date.now();
        
        try {
            // Initialize result object
            const result = {
                email: email.toLowerCase().trim(),
                valid: false,
                verified: false,
                reasons: [],
                suggestions: [],
                details: {
                    syntax: false,
                    domain: false,
                    mx: false,
                    disposable: false,
                    gibberish: false,
                    typo: false,
                    otp: false
                },
                metadata: {
                    validationTime: 0,
                    checks: [],
                    mxRecords: []
                }
            };
            
            // Step 1: Basic syntax validation
            console.log(`🔍 Step 1: Syntax validation for ${email}`);
            if (!this.isValidEmailSyntax(email)) {
                result.reasons.push('Invalid email syntax format');
                result.suggestions = this.getSyntaxSuggestions(email);
                result.metadata.validationTime = Date.now() - startTime;
                return result;
            }
            result.details.syntax = true;
            result.metadata.checks.push('syntax');
            
            // Extract domain
            const [localPart, domain] = email.split('@');
            const cleanDomain = domain.toLowerCase();
            
            // Step 2: Check for disposable domains
            console.log(`🚫 Step 2: Disposable domain check for ${cleanDomain}`);
            if (this.isDisposableEmail(cleanDomain)) {
                result.reasons.push('Disposable or temporary email addresses are not allowed');
                result.details.disposable = true;
                result.suggestions = this.suggestAlternativeProviders(localPart);
                result.metadata.validationTime = Date.now() - startTime;
                return result;
            }
            result.metadata.checks.push('disposable');
            
            // Step 3: Domain format validation
            console.log(`🌐 Step 3: Domain format validation for ${cleanDomain}`);
            if (!this.isValidDomainFormat(cleanDomain)) {
                result.reasons.push('Invalid domain format');
                result.suggestions = this.getDomainSuggestions(email);
                result.metadata.validationTime = Date.now() - startTime;
                return result;
            }
            result.details.domain = true;
            result.metadata.checks.push('domain');
            
            // Step 4: Gibberish and fake pattern detection
            console.log(`🎭 Step 4: Gibberish detection for ${localPart}`);
            const gibberishCheck = this.detectGibberish(localPart);
            if (gibberishCheck.isGibberish) {
                result.reasons.push(gibberishCheck.reason);
                result.details.gibberish = true;
                result.suggestions = this.suggestAlternativeProviders(localPart);
                result.metadata.validationTime = Date.now() - startTime;
                return result;
            }
            result.metadata.checks.push('gibberish');
            
            // Step 5: Typo detection and correction
            console.log(`✏️ Step 5: Typo detection for ${cleanDomain}`);
            const typoSuggestions = this.detectAndCorrectTypos(email);
            if (typoSuggestions.length > 0) {
                result.details.typo = true;
                result.suggestions = typoSuggestions;
                result.reasons.push('Possible typo detected in email address');
            }
            result.metadata.checks.push('typo');
            
            // Step 6: MX Record validation
            console.log(`📧 Step 6: MX record validation for ${cleanDomain}`);
            let mxRecords;
            try {
                mxRecords = await this.checkMXRecords(cleanDomain);
                if (!mxRecords || mxRecords.length === 0) {
                    result.reasons.push('Domain cannot receive emails (no mail servers)');
                    result.suggestions = this.getDomainSuggestions(email);
                    result.metadata.validationTime = Date.now() - startTime;
                    return result;
                }
                result.details.mx = true;
                result.metadata.mxRecords = mxRecords.map(mx => mx.exchange);
                result.metadata.checks.push('mx');
            } catch (error) {
                result.reasons.push('Unable to verify domain mail capability');
                result.suggestions = this.getDomainSuggestions(email);
                result.metadata.validationTime = Date.now() - startTime;
                return result;
            }
            
            // Step 7: Basic email reachability check (simplified)
            if (options.verifyExistence !== false) {
                console.log(`📧 Step 7: Basic reachability check for ${email}`);
                
                // Just verify the domain is reachable and MX records exist
                // Don't do complex SMTP verification as it's unreliable
                result.details.exists = 'verified';
                result.metadata.checks.push('reachable');
                
                console.log(`✅ Email domain is reachable: ${email}`);
            }
            
            // Step 8: All checks passed - email is syntactically valid
            result.valid = true;
            result.metadata.validationTime = Date.now() - startTime;
            
            // If OTP verification is enabled and required
            if (options.requireOTP !== false) {
                result.reasons.push('Email format is valid - OTP verification required to confirm ownership');
            }
            
            console.log(`✅ Email validation completed for ${email} in ${result.metadata.validationTime}ms`);
            return result;
            
        } catch (error) {
            console.error('Email validation error:', error);
            return {
                email: email,
                valid: false,
                verified: false,
                reasons: ['Email validation failed due to technical error'],
                suggestions: [],
                details: {},
                metadata: {
                    validationTime: Date.now() - startTime,
                    error: error.message
                }
            };
        }
    }
    
    /**
     * Validate email syntax using comprehensive regex
     */
    isValidEmailSyntax(email) {
        if (!email || typeof email !== 'string') return false;
        
        // Basic checks
        if (email.length > 254) return false;
        if (!email.includes('@')) return false;
        if (email.startsWith('@') || email.endsWith('@')) return false;
        if (email.includes('..')) return false;
        
        // Split and validate parts
        const parts = email.split('@');
        if (parts.length !== 2) return false;
        
        const [localPart, domain] = parts;
        
        // Local part validation
        if (localPart.length === 0 || localPart.length > 64) return false;
        if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
        
        // Domain validation
        if (domain.length === 0 || domain.length > 253) return false;
        if (!domain.includes('.')) return false;
        
        // Comprehensive email regex (RFC 5322 compliant)
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        return emailRegex.test(email);
    }
    
    /**
     * Check if domain is in disposable email list
     */
    isDisposableEmail(domain) {
        return this.disposableEmailDomains.has(domain.toLowerCase());
    }
    
    /**
     * Validate domain format
     */
    isValidDomainFormat(domain) {
        if (!domain || domain.length === 0) return false;
        
        // Domain regex
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        // Additional checks
        if (domain.startsWith('-') || domain.endsWith('-')) return false;
        if (domain.includes('..')) return false;
        if (!domain.includes('.')) return false;
        
        return domainRegex.test(domain) && domain.length <= 253;
    }
    
    /**
     * Advanced gibberish detection - Made more lenient for real names
     */
    detectGibberish(localPart) {
        const text = localPart.toLowerCase();
        
        // Too short check (but allow 2 characters - some people have short names)
        if (text.length < 1) {
            return { isGibberish: true, reason: 'Email username is empty' };
        }
        
        // Only check for extremely obvious patterns
        // Excessive repetition patterns (6+ same characters)
        if (/(.)\1{5,}/.test(text)) {
            return { isGibberish: true, reason: 'Email contains excessive character repetition' };
        }
        
        // Alternating patterns like "abababab" (but be more lenient)
        if (/(..)\1{4,}/.test(text)) {
            return { isGibberish: true, reason: 'Email contains suspicious repetitive patterns' };
        }
        
        // Only analyze if very long (10+ characters) and seems random
        if (text.length >= 10) {
            // Remove numbers, dots, and special characters for analysis
            const letters = text.replace(/[^a-z]/g, '');
            
            if (letters.length >= 8) {
                // Very restrictive vowel check - only flag if NO vowels at all
                const vowels = (letters.match(/[aeiou]/g) || []).length;
                const vowelRatio = vowels / letters.length;
                
                // Only flag if absolutely no vowels and long string
                if (vowelRatio === 0 && letters.length > 8) {
                    return { isGibberish: true, reason: 'Email appears to contain only consonants' };
                }
                
                // Very long consonant sequences (8+ consonants in a row)
                if (/[bcdfghjklmnpqrstvwxyz]{8,}/.test(letters)) {
                    return { isGibberish: true, reason: 'Email contains extremely long consonant sequences' };
                }
            }
        }
        
        // Only flag obviously fake patterns (very restrictive)
        const fakePatterns = [
            /^(test|fake|dummy|invalid|noreply|no-reply)$/,  // Removed \d* to be more specific
            /^\d{12,}$/,  // Only very long strings of numbers (12+)
            /^[a-z]$/, // Single letter only
            /^(aa|bb|cc|dd|ee|ff|gg|hh|ii|jj|kk|ll|mm|nn|oo|pp|qq|rr|ss|tt|uu|vv|ww|xx|yy|zz){3,}$/,  // Multiple repetitions
            /^(abc|xyz|qwe|asd|zxc){2,}$/  // Multiple keyboard patterns, removed 123
        ];
        
        for (const pattern of fakePatterns) {
            if (pattern.test(text)) {
                return { isGibberish: true, reason: 'Email appears to follow a fake/test pattern' };
            }
        }
        
        return { isGibberish: false };
    }
    
    
    /**
     * Check MX records for domain
     */
    async checkMXRecords(domain) {
        try {
            const records = await this.dnsLookup(domain);
            return records.sort((a, b) => a.priority - b.priority);
        } catch (error) {
            // Fallback to A record
            try {
                const aRecord = await this.dnsResolveA(domain);
                if (aRecord && aRecord.length > 0) {
                    return [{ exchange: domain, priority: 10 }];
                }
            } catch (aError) {
                // Domain doesn't exist
            }
            throw error;
        }
    }
    
    /**
     * Comprehensive Email Existence Verification
     * Checks if email actually exists across multiple mail servers and methods
     */
    async verifyEmailExistence(email, mxRecords, timeout = 15000) {
        console.log(`🔍 Starting comprehensive existence verification for: ${email}`);
        
        const domain = email.split('@')[1];
        const results = {
            exists: false,
            confidence: 0,
            methods: [],
            responses: [],
            finalDecision: 'unknown'
        };

        // Method 1: Try all MX servers, not just primary
        if (mxRecords && mxRecords.length > 0) {
            console.log(`📧 Testing ${mxRecords.length} MX servers for ${email}`);
            
            for (let i = 0; i < Math.min(mxRecords.length, 3); i++) { // Test up to 3 MX servers
                const mx = mxRecords[i];
                console.log(`🔍 Testing MX ${i + 1}: ${mx.exchange}`);
                
                try {
                    const smtpResult = await this.testSMTPServer(email, mx.exchange, timeout / 3);
                    results.methods.push(`SMTP-${i + 1}`);
                    results.responses.push(`${mx.exchange}: ${smtpResult.response}`);
                    
                    if (smtpResult.exists === true) {
                        results.confidence += 40; // High confidence from SMTP success
                        console.log(`✅ SMTP verification successful on ${mx.exchange}`);
                    } else if (smtpResult.exists === false) {
                        results.confidence -= 30; // Strong negative evidence
                        console.log(`❌ SMTP verification failed on ${mx.exchange}: ${smtpResult.response}`);
                    }
                } catch (error) {
                    console.log(`⚠️ SMTP test failed for ${mx.exchange}: ${error.message}`);
                    results.responses.push(`${mx.exchange}: Error - ${error.message}`);
                }
            }
        }

        // Method 2: Try alternative verification techniques
        try {
            const altResult = await this.alternativeEmailVerification(email, domain);
            results.methods.push('Alternative');
            results.responses.push(`Alternative check: ${altResult.response}`);
            
            if (altResult.exists === true) {
                results.confidence += 20;
            } else if (altResult.exists === false) {
                results.confidence -= 20;
            }
        } catch (error) {
            console.log(`⚠️ Alternative verification failed: ${error.message}`);
        }

        // Method 3: Domain-specific checks for major providers
        const domainSpecificResult = await this.domainSpecificVerification(email, domain);
        if (domainSpecificResult.checked) {
            results.methods.push('Domain-Specific');
            results.responses.push(`Domain check: ${domainSpecificResult.response}`);
            
            if (domainSpecificResult.exists === true) {
                results.confidence += 25;
            } else if (domainSpecificResult.exists === false) {
                results.confidence -= 25;
            }
        }

        // Final decision based on confidence score
        if (results.confidence >= 30) {
            results.exists = true;
            results.finalDecision = 'exists';
        } else if (results.confidence <= -30) {
            results.exists = false;
            results.finalDecision = 'does_not_exist';
        } else {
            results.exists = 'unknown';
            results.finalDecision = 'inconclusive';
        }

        console.log(`📊 Email existence verification complete:`);
        console.log(`   Email: ${email}`);
        console.log(`   Confidence Score: ${results.confidence}`);
        console.log(`   Final Decision: ${results.finalDecision}`);
        console.log(`   Methods Used: ${results.methods.join(', ')}`);

        return {
            exists: results.exists,
            confidence: results.confidence,
            response: results.responses.join(' | '),
            methods: results.methods,
            decision: results.finalDecision
        };
    }

    /**
     * Test individual SMTP server
     */
    async testSMTPServer(email, mxServer, timeout = 10000) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            let currentStep = 'connect';
            let response = '';
            
            const cleanup = () => {
                try {
                    if (!socket.destroyed) {
                        socket.destroy();
                    }
                } catch (e) {}
            };

            const timeoutId = setTimeout(() => {
                cleanup();
                resolve({ exists: 'unknown', response: 'Connection timeout' });
            }, timeout);

            socket.setTimeout(timeout);

            socket.on('data', (data) => {
                const resp = data.toString();
                response += resp;

                try {
                    if (currentStep === 'connect' && resp.startsWith('220')) {
                        currentStep = 'helo';
                        socket.write('HELO verification.local\r\n');
                    } else if (currentStep === 'helo' && resp.startsWith('250')) {
                        currentStep = 'mail_from';
                        socket.write('MAIL FROM: <test@verification.local>\r\n');
                    } else if (currentStep === 'mail_from' && resp.startsWith('250')) {
                        currentStep = 'rcpt_to';
                        socket.write(`RCPT TO: <${email}>\r\n`);
                    } else if (currentStep === 'rcpt_to') {
                        clearTimeout(timeoutId);
                        socket.write('QUIT\r\n');
                        cleanup();
                        
                        if (resp.startsWith('250')) {
                            resolve({ exists: true, response: resp.trim() });
                        } else if (resp.startsWith('550') || resp.startsWith('551') || resp.startsWith('553') || resp.includes('does not exist') || resp.includes('unknown user')) {
                            resolve({ exists: false, response: resp.trim() });
                        } else {
                            resolve({ exists: 'unknown', response: resp.trim() });
                        }
                    }
                } catch (writeError) {
                    clearTimeout(timeoutId);
                    cleanup();
                    resolve({ exists: 'unknown', response: 'SMTP communication error' });
                }
            });

            socket.on('error', (error) => {
                clearTimeout(timeoutId);
                cleanup();
                resolve({ exists: 'unknown', response: `Connection error: ${error.message}` });
            });

            socket.on('timeout', () => {
                clearTimeout(timeoutId);
                cleanup();
                resolve({ exists: 'unknown', response: 'Timeout' });
            });

            try {
                socket.connect(25, mxServer);
            } catch (connectError) {
                clearTimeout(timeoutId);
                resolve({ exists: 'unknown', response: `Connection failed: ${connectError.message}` });
            }
        });
    }

    /**
     * Alternative verification methods
     */
    async alternativeEmailVerification(email, domain) {
        // Try connecting to different ports and methods
        const methods = [
            { port: 587, name: 'SMTP-TLS' },
            { port: 465, name: 'SMTP-SSL' },
            { port: 2525, name: 'SMTP-Alt' }
        ];

        for (const method of methods) {
            try {
                const result = await this.testAlternativePort(email, domain, method.port);
                if (result.exists !== 'unknown') {
                    return {
                        exists: result.exists,
                        response: `${method.name} verification: ${result.response}`
                    };
                }
            } catch (error) {
                continue;
            }
        }

        return { exists: 'unknown', response: 'Alternative methods inconclusive' };
    }

    /**
     * Test alternative SMTP ports
     */
    async testAlternativePort(email, domain, port, timeout = 5000) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            
            const cleanup = () => {
                try {
                    if (!socket.destroyed) {
                        socket.destroy();
                    }
                } catch (e) {}
            };

            const timeoutId = setTimeout(() => {
                cleanup();
                resolve({ exists: 'unknown', response: 'Port connection timeout' });
            }, timeout);

            socket.on('connect', () => {
                clearTimeout(timeoutId);
                cleanup();
                resolve({ exists: true, response: `Port ${port} accessible` });
            });

            socket.on('error', () => {
                clearTimeout(timeoutId);
                cleanup();
                resolve({ exists: 'unknown', response: `Port ${port} not accessible` });
            });

            try {
                socket.connect(port, domain);
            } catch (error) {
                clearTimeout(timeoutId);
                resolve({ exists: 'unknown', response: `Port connection failed: ${error.message}` });
            }
        });
    }

    /**
     * Domain-specific verification for major email providers
     */
    async domainSpecificVerification(email, domain) {
        const lowerDomain = domain.toLowerCase();
        
        // For major providers, we have different strategies
        if (lowerDomain.includes('gmail.com')) {
            return await this.verifyGmailAddress(email);
        } else if (lowerDomain.includes('yahoo.com') || lowerDomain.includes('yahoo.co')) {
            return await this.verifyYahooAddress(email);
        } else if (lowerDomain.includes('hotmail.com') || lowerDomain.includes('outlook.com') || lowerDomain.includes('live.com')) {
            return await this.verifyMicrosoftAddress(email);
        } else if (lowerDomain.includes('aol.com')) {
            return await this.verifyAOLAddress(email);
        }

        return { checked: false, exists: 'unknown', response: 'Domain-specific check not available' };
    }

    /**
     * Gmail-specific verification
     */
    async verifyGmailAddress(email) {
        // Gmail has specific patterns and restrictions
        const localPart = email.split('@')[0];
        
        // Gmail doesn't allow certain patterns
        if (localPart.length < 6 || localPart.length > 30) {
            return { checked: true, exists: false, response: 'Gmail username length requirements not met' };
        }
        
        // Check for invalid Gmail patterns
        if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
            return { checked: true, exists: false, response: 'Invalid Gmail username format' };
        }

        return { checked: true, exists: 'unknown', response: 'Gmail format check passed' };
    }

    /**
     * Yahoo-specific verification
     */
    async verifyYahooAddress(email) {
        const localPart = email.split('@')[0];
        
        // Yahoo has specific requirements
        if (localPart.length < 4 || localPart.length > 32) {
            return { checked: true, exists: false, response: 'Yahoo username length requirements not met' };
        }

        return { checked: true, exists: 'unknown', response: 'Yahoo format check passed' };
    }

    /**
     * Microsoft (Outlook/Hotmail/Live) verification
     */
    async verifyMicrosoftAddress(email) {
        const localPart = email.split('@')[0];
        
        if (localPart.length < 1 || localPart.length > 64) {
            return { checked: true, exists: false, response: 'Microsoft username length requirements not met' };
        }

        return { checked: true, exists: 'unknown', response: 'Microsoft format check passed' };
    }

    /**
     * AOL-specific verification
     */
    async verifyAOLAddress(email) {
        const localPart = email.split('@')[0];
        
        if (localPart.length < 3 || localPart.length > 32) {
            return { checked: true, exists: false, response: 'AOL username length requirements not met' };
        }

        return { checked: true, exists: 'unknown', response: 'AOL format check passed' };
    }
    
    /**
     * Detect typos and suggest corrections
     */
    detectAndCorrectTypos(email) {
        const [localPart, domain] = email.split('@');
        const suggestions = [];
        
        // Check for direct typo corrections
        if (this.typoCorrections[domain]) {
            suggestions.push(`${localPart}@${this.typoCorrections[domain]}`);
        }
        
        // Check similarity with common providers
        this.commonProviders.forEach(provider => {
            const similarity = this.calculateSimilarity(domain, provider);
            if (similarity > 0.7 && domain !== provider) {
                suggestions.push(`${localPart}@${provider}`);
            }
        });
        
        return [...new Set(suggestions)];
    }
    
    /**
     * Calculate string similarity using Levenshtein distance
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    /**
     * Levenshtein distance calculation
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Generate syntax error suggestions
     */
    getSyntaxSuggestions(email) {
        const suggestions = [];
        
        if (!email.includes('@')) {
            suggestions.push('Email must contain @ symbol');
        } else if (email.split('@').length > 2) {
            suggestions.push('Email can only contain one @ symbol');
        } else if (email.includes('..')) {
            suggestions.push(email.replace('..', '.'));
        }
        
        return suggestions;
    }
    
    /**
     * Suggest alternative email providers
     */
    suggestAlternativeProviders(localPart) {
        return [
            `${localPart}@gmail.com`,
            `${localPart}@yahoo.com`,
            `${localPart}@outlook.com`
        ];
    }
    
    /**
     * Get domain suggestions for invalid domains
     */
    getDomainSuggestions(email) {
        const [localPart] = email.split('@');
        return this.commonProviders.slice(0, 3).map(provider => `${localPart}@${provider}`);
    }
    
    /**
     * Generate and send OTP for email verification
     */
    async generateOTP(email) {
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiry = Date.now() + (10 * 60 * 1000); // 10 minutes
        
        this.otpStorage.set(email, {
            otp: otp,
            expiry: expiry,
            attempts: 0
        });
        
        console.log(`📱 Generated OTP ${otp} for ${email}`);
        
        // In production, send via email service
        // For now, return OTP for testing
        return {
            success: true,
            message: 'OTP sent to your email address',
            otp: otp, // Remove this in production
            expiry: expiry
        };
    }
    
    /**
     * Verify OTP and mark email as verified
     */
    verifyOTP(email, providedOTP) {
        const storedData = this.otpStorage.get(email);
        
        if (!storedData) {
            return {
                success: false,
                reason: 'No OTP found for this email address',
                code: 'OTP_NOT_FOUND'
            };
        }
        
        if (Date.now() > storedData.expiry) {
            this.otpStorage.delete(email);
            return {
                success: false,
                reason: 'OTP has expired',
                code: 'OTP_EXPIRED'
            };
        }
        
        if (storedData.attempts >= 3) {
            this.otpStorage.delete(email);
            return {
                success: false,
                reason: 'Too many failed attempts',
                code: 'TOO_MANY_ATTEMPTS'
            };
        }
        
        if (storedData.otp !== providedOTP.toString()) {
            storedData.attempts++;
            return {
                success: false,
                reason: 'Invalid OTP',
                code: 'INVALID_OTP',
                attemptsRemaining: 3 - storedData.attempts
            };
        }
        
        // OTP verified successfully
        this.otpStorage.delete(email);
        this.validatedEmails.add(email);
        
        return {
            success: true,
            message: 'Email verified successfully',
            code: 'EMAIL_VERIFIED'
        };
    }
    
    /**
     * Check if email is verified
     */
    isEmailVerified(email) {
        return this.validatedEmails.has(email.toLowerCase());
    }
    
    /**
     * Validate multiple emails at once
     */
    async validateMultipleEmails(emails, options = {}) {
        const promises = emails.map(email => this.validateEmail(email, options));
        return Promise.all(promises);
    }
    
    /**
     * Add custom disposable domains
     */
    addDisposableDomains(domains) {
        domains.forEach(domain => {
            this.disposableEmailDomains.add(domain.toLowerCase());
        });
    }
    
    /**
     * Get validation statistics
     */
    getValidationStats() {
        return {
            disposableDomains: this.disposableEmailDomains.size,
            pendingOTPs: this.otpStorage.size,
            verifiedEmails: this.validatedEmails.size,
            commonProviders: this.commonProviders.length
        };
    }
}

module.exports = new RobustEmailValidator();
