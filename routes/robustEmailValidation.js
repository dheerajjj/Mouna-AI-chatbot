const express = require('express');
const router = express.Router();
const RobustEmailValidator = require('../services/RobustEmailValidator');
const EmailService = require('../services/EmailService');

/**
 * POST /api/email/validate
 * Comprehensive email validation endpoint
 */
router.post('/validate', async (req, res) => {
    try {
        const { email, requireOTP = true } = req.body;
        
        if (!email) {
            return res.status(400).json({
                valid: false,
                verified: false,
                reasons: ['Email address is required'],
                suggestions: [],
                details: {},
                metadata: {}
            });
        }
        
        console.log(`📧 Starting robust validation for: ${email}`);
        
        // Perform comprehensive validation
        const validationResult = await RobustEmailValidator.validateEmail(email, { requireOTP });
        
        // Format response
        const response = {
            valid: validationResult.valid,
            verified: validationResult.verified || RobustEmailValidator.isEmailVerified(email),
            reasons: validationResult.reasons,
            suggestions: validationResult.suggestions,
            details: validationResult.details,
            metadata: validationResult.metadata
        };
        
        // Set appropriate status code
        const statusCode = validationResult.valid ? 200 : 400;
        
        console.log(`✅ Validation completed for ${email}: valid=${response.valid}, verified=${response.verified}`);
        
        res.status(statusCode).json(response);
        
    } catch (error) {
        console.error('Email validation API error:', error);
        res.status(500).json({
            valid: false,
            verified: false,
            reasons: ['Email validation service temporarily unavailable'],
            suggestions: [],
            details: {},
            metadata: { error: 'Internal server error' }
        });
    }
});

/**
 * POST /api/email/send-otp
 * Send OTP for email verification
 */
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                reason: 'Email address is required',
                code: 'MISSING_EMAIL'
            });
        }
        
        // First validate the email format
        const validationResult = await RobustEmailValidator.validateEmail(email, { requireOTP: false });
        
        if (!validationResult.valid) {
            return res.status(400).json({
                success: false,
                reason: 'Email address is not valid',
                code: 'INVALID_EMAIL',
                validationErrors: validationResult.reasons,
                suggestions: validationResult.suggestions
            });
        }
        
        // Generate OTP
        const otpResult = await RobustEmailValidator.generateOTP(email);
        
        // Send OTP via email (in production)
        try {
            // Uncomment this in production:
            // await EmailService.sendOTPEmail(email, 'User', otpResult.otp);
            
            // For testing, we'll just log it
            console.log(`📱 OTP ${otpResult.otp} generated for ${email}`);
            
            res.json({
                success: true,
                message: 'OTP sent to your email address',
                // Remove this in production:
                testOTP: otpResult.otp,
                expiresIn: 600 // 10 minutes
            });
            
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
            res.status(500).json({
                success: false,
                reason: 'Failed to send OTP email',
                code: 'EMAIL_SEND_FAILED'
            });
        }
        
    } catch (error) {
        console.error('Send OTP API error:', error);
        res.status(500).json({
            success: false,
            reason: 'OTP service temporarily unavailable',
            code: 'SERVICE_ERROR'
        });
    }
});

/**
 * POST /api/email/verify-otp
 * Verify OTP and mark email as validated
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                reason: 'Email and OTP are required',
                code: 'MISSING_PARAMETERS'
            });
        }
        
        // Verify OTP
        const verificationResult = RobustEmailValidator.verifyOTP(email, otp);
        
        if (verificationResult.success) {
            // Re-validate email to get updated verified status
            const validationResult = await RobustEmailValidator.validateEmail(email, { requireOTP: false });
            
            res.json({
                success: true,
                message: 'Email verified successfully',
                code: 'EMAIL_VERIFIED',
                emailStatus: {
                    valid: validationResult.valid,
                    verified: true,
                    details: validationResult.details
                }
            });
        } else {
            res.status(400).json(verificationResult);
        }
        
    } catch (error) {
        console.error('Verify OTP API error:', error);
        res.status(500).json({
            success: false,
            reason: 'OTP verification service temporarily unavailable',
            code: 'SERVICE_ERROR'
        });
    }
});

/**
 * POST /api/email/validate-multiple
 * Validate multiple email addresses at once
 */
router.post('/validate-multiple', async (req, res) => {
    try {
        const { emails, requireOTP = false } = req.body;
        
        if (!Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({
                success: false,
                reason: 'Array of email addresses is required',
                results: []
            });
        }
        
        if (emails.length > 50) {
            return res.status(400).json({
                success: false,
                reason: 'Maximum 50 emails allowed per batch',
                results: []
            });
        }
        
        console.log(`📧 Validating batch of ${emails.length} emails`);
        
        // Validate all emails
        const results = await RobustEmailValidator.validateMultipleEmails(emails, { requireOTP });
        
        // Format results
        const formattedResults = results.map((result, index) => ({
            email: emails[index],
            valid: result.valid,
            verified: result.verified || RobustEmailValidator.isEmailVerified(emails[index]),
            reasons: result.reasons,
            suggestions: result.suggestions,
            details: result.details
        }));
        
        const validCount = formattedResults.filter(r => r.valid).length;
        const verifiedCount = formattedResults.filter(r => r.verified).length;
        
        res.json({
            success: true,
            summary: {
                total: emails.length,
                valid: validCount,
                verified: verifiedCount,
                invalid: emails.length - validCount
            },
            results: formattedResults
        });
        
    } catch (error) {
        console.error('Batch email validation error:', error);
        res.status(500).json({
            success: false,
            reason: 'Batch validation service temporarily unavailable',
            results: []
        });
    }
});

/**
 * GET /api/email/stats
 * Get validation service statistics
 */
router.get('/stats', (req, res) => {
    try {
        const stats = RobustEmailValidator.getValidationStats();
        
        res.json({
            success: true,
            statistics: {
                blockedDisposableDomains: stats.disposableDomains,
                pendingOTPVerifications: stats.pendingOTPs,
                verifiedEmails: stats.verifiedEmails,
                supportedProviders: stats.commonProviders,
                uptime: process.uptime(),
                version: '1.0.0'
            }
        });
        
    } catch (error) {
        console.error('Stats API error:', error);
        res.status(500).json({
            success: false,
            reason: 'Statistics service temporarily unavailable'
        });
    }
});

/**
 * POST /api/email/check-status
 * Check if an email is already verified
 */
router.post('/check-status', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                reason: 'Email address is required'
            });
        }
        
        const isVerified = RobustEmailValidator.isEmailVerified(email);
        const validationResult = await RobustEmailValidator.validateEmail(email, { requireOTP: false });
        
        res.json({
            success: true,
            email: email.toLowerCase(),
            status: {
                valid: validationResult.valid,
                verified: isVerified,
                needsOTP: validationResult.valid && !isVerified,
                details: validationResult.details,
                reasons: validationResult.reasons
            }
        });
        
    } catch (error) {
        console.error('Check status API error:', error);
        res.status(500).json({
            success: false,
            reason: 'Status check service temporarily unavailable'
        });
    }
});

/**
 * POST /api/email/add-disposable-domains
 * Add custom disposable domains (admin only)
 */
router.post('/add-disposable-domains', (req, res) => {
    try {
        const { domains, adminKey } = req.body;
        
        // Simple admin key check (use proper authentication in production)
        if (adminKey !== process.env.ADMIN_API_KEY) {
            return res.status(403).json({
                success: false,
                reason: 'Admin access required'
            });
        }
        
        if (!Array.isArray(domains) || domains.length === 0) {
            return res.status(400).json({
                success: false,
                reason: 'Array of domains is required'
            });
        }
        
        RobustEmailValidator.addDisposableDomains(domains);
        
        res.json({
            success: true,
            message: `Added ${domains.length} disposable domains`,
            domains: domains
        });
        
    } catch (error) {
        console.error('Add disposable domains error:', error);
        res.status(500).json({
            success: false,
            reason: 'Domain management service temporarily unavailable'
        });
    }
});

module.exports = router;
