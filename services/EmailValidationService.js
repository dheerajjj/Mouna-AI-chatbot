const dns = require('dns');
const net = require('net');
const { promisify } = require('util');

class EmailValidationService {
    constructor() {
        this.dnsLookup = promisify(dns.resolveMx);
        this.disposableEmailDomains = new Set([
            // Most common disposable email domains
            '10minutemail.com', '10minutemail.net', '10minutemail.org',
            '20minutemail.com', 'tempmail.org', 'temp-mail.org',
            'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
            'mailinator.com', 'yopmail.com', 'throwaway.email',
            'getnada.com', 'maildrop.cc', 'sharklasers.com',
            'emailondeck.com', 'fakeinbox.com', 'trashmail.com',
            'dispostable.com', 'mytemp.email', 'dropmail.me',
            'tempmail.ninja', 'tempmail24.com', 'tempemail.com',
            'mailcatch.com', 'tempinbox.com', 'mohmal.com',
            'disposableemailaddresses.com', 'spambog.com',
            // Test/development domains that should be blocked
            'test.com', 'example.com', 'example.org', 'example.net',
            'invalid.com', 'fake.com', 'notreal.com',
            // Additional popular temp mail services
            'tmail.ws', 'tempmailo.com', 'meltmail.com', 'mytrashmail.com'
        ]);
    }

    /**
     * Comprehensive email validation
     * @param {string} email - Email address to validate
     * @returns {Object} Validation result
     */
    async validateEmail(email) {
        try {
            const result = {
                email: email.toLowerCase().trim(),
                isValid: false,
                errors: [],
                warnings: [],
                details: {
                    format: false,
                    domain: false,
                    mx: false,
                    disposable: false,
                    smtp: false
                }
            };

            // Step 1: Basic format validation
            if (!this.isValidEmailFormat(email)) {
                result.errors.push('Invalid email format');
                return result;
            }
            result.details.format = true;

            // Extract domain
            const domain = email.split('@')[1].toLowerCase();
            
            // Step 2: Check against disposable email providers
            if (this.isDisposableEmail(domain)) {
                result.errors.push('Disposable email addresses are not allowed');
                result.details.disposable = true;
                return result;
            }

            // Step 3: Domain validation
            if (!this.isValidDomain(domain)) {
                result.errors.push('Invalid domain format');
                return result;
            }
            result.details.domain = true;

            // Step 4: MX Record validation
            try {
                const mxRecords = await this.checkMXRecords(domain);
                if (!mxRecords || mxRecords.length === 0) {
                    result.errors.push('Domain does not accept email (no MX records)');
                    return result;
                }
                result.details.mx = true;
                result.mxRecords = mxRecords.map(mx => mx.exchange);
            } catch (error) {
                result.errors.push('Unable to verify domain email capability');
                return result;
            }

            // Step 5: Pattern-based suspicious email detection (since SMTP verification is blocked by most providers)
            const suspiciousPatterns = this.checkSuspiciousPatterns(email, domain);
            if (suspiciousPatterns.length > 0) {
                result.errors.push(...suspiciousPatterns);
                return result;
            }
            
            // Step 6: SMTP validation (optional - most providers block this now)
            if (process.env.ENABLE_SMTP_VALIDATION === 'true') {
                try {
                    console.log(`🔍 Attempting SMTP validation for: ${email}`);
                    const smtpResult = await this.validateSMTP(email, result.mxRecords[0]);
                    result.details.smtp = smtpResult.valid;
                    result.smtpResponse = smtpResult.response;
                    
                    console.log(`📧 SMTP Result for ${email}:`, {
                        valid: smtpResult.valid,
                        blocked: smtpResult.blocked,
                        definitelyInvalid: smtpResult.definitelyInvalid,
                        response: smtpResult.response
                    });
                    
                    if (smtpResult.definitelyInvalid) {
                        // If we get a definitive "no such user" response, fail validation
                        result.errors.push('Email address does not exist at this domain');
                        return result;
                    } else if (!smtpResult.valid && !smtpResult.blocked) {
                        // If SMTP check failed but wasn't blocked, it's likely invalid
                        result.warnings.push('Email address could not be verified via SMTP');
                    } else if (smtpResult.blocked) {
                        // If SMTP was blocked by the provider, add info message
                        result.warnings.push('Email provider blocks verification - this is normal for major providers like Gmail');
                    } else if (smtpResult.valid) {
                        // SMTP confirmed the email exists
                        result.warnings.push('Email existence confirmed via SMTP');
                    }
                } catch (error) {
                    // If SMTP check completely failed, add info but don't fail validation
                    result.warnings.push('SMTP verification unavailable (normal for most email providers)');
                    console.log(`⚠️ SMTP validation error for ${email}:`, error.message);
                }
            } else {
                result.warnings.push('Note: Individual email existence cannot be verified - major providers block this for privacy');
            }

            // Email is valid if it passes format, domain, and MX checks
            // SMTP validation can override this if it definitively proves email doesn't exist
            result.isValid = result.details.format && result.details.domain && result.details.mx;
            
            return result;

        } catch (error) {
            console.error('Email validation error:', error);
            return {
                email: email,
                isValid: false,
                errors: ['Email validation failed due to technical error'],
                warnings: [],
                details: {}
            };
        }
    }

    /**
     * Basic email format validation using regex
     * @param {string} email 
     * @returns {boolean}
     */
    isValidEmailFormat(email) {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email) && email.length <= 254;
    }

    /**
     * Check if email domain is a disposable/temporary email provider
     * @param {string} domain 
     * @returns {boolean}
     */
    isDisposableEmail(domain) {
        return this.disposableEmailDomains.has(domain.toLowerCase());
    }

    /**
     * Basic domain format validation
     * @param {string} domain 
     * @returns {boolean}
     */
    isValidDomain(domain) {
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return domainRegex.test(domain) && domain.length <= 253;
    }

    /**
     * Check MX records for domain
     * @param {string} domain 
     * @returns {Promise<Array>}
     */
    async checkMXRecords(domain) {
        try {
            const records = await this.dnsLookup(domain);
            return records.sort((a, b) => a.priority - b.priority);
        } catch (error) {
            // If MX lookup fails, try A record as fallback
            try {
                const aRecord = await promisify(dns.resolve4)(domain);
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
     * SMTP validation (checks if email exists at domain)
     * @param {string} email 
     * @param {string} mxHost 
     * @returns {Promise<Object>}
     */
    async validateSMTP(email, mxHost) {
        return new Promise((resolve) => {
            const timeout = 15000; // 15 second timeout
            const socket = new net.Socket();
            
            let step = 0;
            let lastResponse = '';
            let allResponses = [];
            
            const result = {
                valid: false,
                blocked: false,
                definitelyInvalid: false,
                response: '',
                responses: []
            };
            
            const cleanup = () => {
                if (socket && !socket.destroyed) {
                    socket.destroy();
                }
            };

            const timeoutHandle = setTimeout(() => {
                cleanup();
                result.response = 'Timeout - server did not respond';
                result.blocked = true;
                resolve(result);
            }, timeout);

            socket.setTimeout(timeout);
            
            socket.on('data', (data) => {
                const response = data.toString().trim();
                lastResponse = response;
                allResponses.push(response);
                result.responses = allResponses;
                
                try {
                    if (step === 0 && response.includes('220')) {
                        socket.write('HELO verification.service\r\n');
                        step++;
                    } else if (step === 1 && response.includes('250')) {
                        socket.write('MAIL FROM:<test@verification.service>\r\n');
                        step++;
                    } else if (step === 2 && response.includes('250')) {
                        socket.write(`RCPT TO:<${email}>\r\n`);
                        step++;
                    } else if (step === 3) {
                        result.response = response;
                        
                        if (response.includes('250')) {
                            // Email exists
                            result.valid = true;
                        } else if (
                            response.includes('550') || 
                            response.includes('551') || 
                            response.includes('553') ||
                            response.toLowerCase().includes('user unknown') ||
                            response.toLowerCase().includes('no such user') ||
                            response.toLowerCase().includes('mailbox unavailable') ||
                            response.toLowerCase().includes('recipient unknown')
                        ) {
                            // Definitive rejection - email doesn't exist
                            result.definitelyInvalid = true;
                        } else if (
                            response.includes('421') || 
                            response.includes('450') || 
                            response.includes('451') || 
                            response.includes('452') ||
                            response.toLowerCase().includes('try again') ||
                            response.toLowerCase().includes('temporarily') ||
                            response.toLowerCase().includes('rate limit') ||
                            response.toLowerCase().includes('blocked')
                        ) {
                            // Temporary issues or blocking
                            result.blocked = true;
                        }
                        
                        socket.write('QUIT\r\n');
                        cleanup();
                        clearTimeout(timeoutHandle);
                        resolve(result);
                    }
                } catch (error) {
                    cleanup();
                    clearTimeout(timeoutHandle);
                    result.response = `Error: ${error.message}`;
                    resolve(result);
                }
            });

            socket.on('error', (error) => {
                cleanup();
                clearTimeout(timeoutHandle);
                result.response = `Connection error: ${error.message}`;
                result.blocked = true;
                resolve(result);
            });

            socket.on('timeout', () => {
                cleanup();
                clearTimeout(timeoutHandle);
                result.response = 'Connection timeout';
                result.blocked = true;
                resolve(result);
            });

            try {
                socket.connect(25, mxHost);
            } catch (error) {
                cleanup();
                clearTimeout(timeoutHandle);
                result.response = `Connection failed: ${error.message}`;
                result.blocked = true;
                resolve(result);
            }
        });
    }

    /**
     * Quick validation for common use cases
     * @param {string} email 
     * @returns {Promise<boolean>}
     */
    async isValidEmail(email) {
        const result = await this.validateEmail(email);
        return result.isValid;
    }

    /**
     * Validate multiple emails at once
     * @param {Array<string>} emails 
     * @returns {Promise<Array>}
     */
    async validateMultipleEmails(emails) {
        const promises = emails.map(email => this.validateEmail(email));
        return Promise.all(promises);
    }

    /**
     * Add custom disposable domains
     * @param {Array<string>} domains 
     */
    addDisposableDomains(domains) {
        domains.forEach(domain => {
            this.disposableEmailDomains.add(domain.toLowerCase());
        });
    }

    /**
     * Get common email suggestions for typos
     * @param {string} email 
     * @returns {Array<string>}
     */
    getEmailSuggestions(email) {
        if (!email || !email.includes('@')) return [];

        const [localPart, domain] = email.split('@');
        const commonDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'yahoo.co.in', 'rediffmail.com', 'live.com', 'msn.com',
            'icloud.com', 'aol.com'
        ];

        const suggestions = [];
        
        // Common typo corrections
        const domainCorrections = {
            'gmial.com': 'gmail.com',
            'gmai.com': 'gmail.com',
            'gmail.co': 'gmail.com',
            'yahooo.com': 'yahoo.com',
            'yaho.com': 'yahoo.com',
            'hotmial.com': 'hotmail.com',
            'hotmai.com': 'hotmail.com',
            'outlok.com': 'outlook.com',
            'outlook.co': 'outlook.com'
        };

        if (domainCorrections[domain.toLowerCase()]) {
            suggestions.push(`${localPart}@${domainCorrections[domain.toLowerCase()]}`);
        }

        // Calculate similarity and suggest close matches
        commonDomains.forEach(commonDomain => {
            if (this.calculateSimilarity(domain.toLowerCase(), commonDomain) > 0.7) {
                suggestions.push(`${localPart}@${commonDomain}`);
            }
        });

        return [...new Set(suggestions)]; // Remove duplicates
    }

    /**
     * Calculate string similarity (for typo detection)
     * @param {string} str1 
     * @param {string} str2 
     * @returns {number}
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Check for suspicious email patterns
     * @param {string} email 
     * @param {string} domain 
     * @returns {Array<string>}
     */
    checkSuspiciousPatterns(email, domain) {
        const errors = [];
        const localPart = email.split('@')[0].toLowerCase();
        
        // Pattern 1: Too short local part (likely fake)
        if (localPart.length < 2) {
            errors.push('Email local part is too short - likely invalid');
        }
        
        // Pattern 2: Gibberish/Random character detection
        if (this.isGibberishText(localPart)) {
            errors.push('Email appears to contain random gibberish characters and is likely fake');
            return errors; // Return early for obvious gibberish
        }
        
        // Pattern 3: Obviously fake patterns
        const fakePatterns = [
            /^(test|fake|dummy|invalid|noreply|no-reply)\d*$/,
            /^[a-z]{1,3}$/,  // Very short names like 'a', 'ab', 'dhj'
            /^\d+$/,         // Only numbers
            /^[a-z]+\d+$/,   // Simple letter+number patterns that are too short
        ];
        
        for (const pattern of fakePatterns) {
            if (pattern.test(localPart)) {
                errors.push('Email appears to follow a fake/test pattern');
                break;
            }
        }
        
        // Pattern 4: Excessive repetition of characters
        if (this.hasExcessiveRepetition(localPart)) {
            errors.push('Email contains suspicious repetitive patterns');
        }
        
        // Pattern 5: Too many consonants without vowels (gibberish detection)
        if (this.hasUnusualConsonantPattern(localPart)) {
            errors.push('Email appears to be random characters rather than a real name');
        }
        
        // Pattern 6: Check for common legitimate patterns (if very short)
        if (localPart.length <= 3) {
            // Allow if it has dots, underscores, or is a common short name
            const legitimateShortPatterns = [
                /[._-]/, // Contains separators
                /^(jo|max|sam|jim|tom|bob|dan|ian|lee|ray|roy|guy|lyn|amy|sue|ann|pat|kim|eve|jay|lou)$/ // Common short names
            ];
            
            let isLegitimate = false;
            for (const pattern of legitimateShortPatterns) {
                if (pattern.test(localPart)) {
                    isLegitimate = true;
                    break;
                }
            }
            
            if (!isLegitimate && localPart.length <= 3) {
                errors.push('Email local part is suspiciously short and may not be a real email');
            }
        }
        
        // Pattern 7: Common fake email domains (additional check)
        const commonFakeDomains = ['gmail.con', 'gmial.com', 'ymail.com', 'hotmial.com'];
        if (commonFakeDomains.includes(domain)) {
            errors.push('Domain appears to be a typo of a real email provider');
        }
        
        return errors;
    }
    
    /**
     * Detect gibberish text using multiple heuristics
     * @param {string} text 
     * @returns {boolean}
     */
    isGibberishText(text) {
        // Remove numbers and special characters for analysis
        const letters = text.replace(/[^a-z]/g, '');
        
        if (letters.length < 4) return false; // Too short to analyze
        
        // Check for excessive repetition of same character sequences
        if (this.hasExcessiveRepetition(letters)) {
            return true;
        }
        
        // Check vowel-consonant ratio
        const vowels = letters.match(/[aeiou]/g) || [];
        const consonants = letters.match(/[bcdfghjklmnpqrstvwxyz]/g) || [];
        
        // If no vowels in a word longer than 4 characters, likely gibberish
        if (letters.length > 4 && vowels.length === 0) {
            return true;
        }
        
        // If too many consonants in a row (more than 4)
        if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(letters)) {
            return true;
        }
        
        // Calculate character distribution entropy
        if (this.hasLowEntropy(letters)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check for excessive character repetition
     * @param {string} text 
     * @returns {boolean}
     */
    hasExcessiveRepetition(text) {
        // Check for same character repeated more than 3 times
        if (/(..)\1{2,}/.test(text)) { // Same 2-char sequence repeated 3+ times
            return true;
        }
        
        // Check for alternating patterns like "ababab" or "kakaka"
        if (/(..)\1{3,}/.test(text) || /(.)\1{4,}/.test(text)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check for unusual consonant patterns
     * @param {string} text 
     * @returns {boolean}
     */
    hasUnusualConsonantPattern(text) {
        if (text.length < 6) return false;
        
        // Check for strings like "lakalakalaklakaklakjkdlfnksl"
        const consonantClusters = text.match(/[bcdfghjklmnpqrstvwxyz]{3,}/g) || [];
        
        // If more than half the email is consonant clusters, likely gibberish
        const clusterLength = consonantClusters.join('').length;
        if (clusterLength > text.length * 0.6) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Calculate text entropy to detect random character sequences
     * @param {string} text 
     * @returns {boolean}
     */
    hasLowEntropy(text) {
        if (text.length < 8) return false;
        
        // Count character frequencies
        const charCount = {};
        for (const char of text) {
            charCount[char] = (charCount[char] || 0) + 1;
        }
        
        // Calculate if distribution is too uniform (indicating randomness)
        const uniqueChars = Object.keys(charCount).length;
        const avgFreq = text.length / uniqueChars;
        
        // If each character appears almost equally (very uniform), might be random
        let variance = 0;
        for (const count of Object.values(charCount)) {
            variance += Math.pow(count - avgFreq, 2);
        }
        variance /= uniqueChars;
        
        // Low variance in character distribution suggests randomness
        return variance < 0.5 && uniqueChars > text.length * 0.4;
    }

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} str1 
     * @param {string} str2 
     * @returns {number}
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
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
}

module.exports = new EmailValidationService();
