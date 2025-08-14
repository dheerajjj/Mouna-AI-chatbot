const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
// Use DatabaseService for both MongoDB and mock DB
const DatabaseService = require('../services/DatabaseService');
const EmailService = require('../services/EmailService');
const OTPService = require('../services/OTPService');
const EmailValidationService = require('../services/RobustEmailValidator');
const router = express.Router();

// Token blacklist for logout functionality (in-memory for demo)
const tokenBlacklist = new Set();

// Enhanced JWT middleware with blacklist support
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Check if token is blacklisted
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ error: 'Token has been invalidated' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired' });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      return res.status(403).json({ error: 'Token verification failed' });
    }
    req.user = user;
    req.token = token; // Store token for potential blacklisting
    next();
  });
};

// Utility function to generate secure tokens
const generateSecureToken = (payload) => {
  return jwt.sign(
    {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomBytes(16).toString('hex') // JWT ID for uniqueness
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'ai-chatbot-widget',
      audience: 'chatbot-users'
    }
  );
};

// Register (with signup alias)
router.post('/signup', [
  body('name').isLength({ min: 2 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('company').optional().trim().escape(),
  body('website').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { name, email, password, company, website, phone } = req.body;

    // Comprehensive email validation using RobustEmailValidator
    console.log(`🔍 Validating email: ${email}`);
    const emailValidation = await EmailValidationService.validateEmail(email, { verifyExistence: true });
    
    if (!emailValidation.valid) {
      console.log(`❌ Email validation failed: ${emailValidation.reasons.join(', ')}`);
      
      return res.status(400).json({ 
        error: 'Invalid email address', 
        details: emailValidation.reasons,
        suggestions: emailValidation.suggestions || [],
        validationDetails: emailValidation.details,
        smtpDetails: emailValidation.metadata.smtpResponse || 'Not verified'
      });
    }
    
    // Check if SMTP verification found the email doesn't exist
    if (emailValidation.details.exists === false) {
      console.log(`❌ Email does not exist: ${email}`);
      return res.status(400).json({ 
        error: 'Email address does not exist', 
        details: ['This email address was not found on the mail server'],
        suggestions: emailValidation.suggestions || [],
        validationDetails: emailValidation.details,
        smtpResponse: emailValidation.metadata.smtpResponse
      });
    }
    
    console.log(`✅ Email validation passed: ${email}`);

    // Check if user already exists
    const existingUser = await DatabaseService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // DON'T create user yet - first require OTP verification
    // Generate and send email OTP for verification BEFORE user creation
    let otpResult;
    try {
      otpResult = await OTPService.generateAndStoreOTP(email, 'email');
      
      // Send OTP via email
      EmailService.sendSignupOTPEmail(email, otpResult).catch(error => {
        console.error('Failed to send OTP email:', error);
      });
      
      console.log(`🔐 OTP generated and sent for pre-registration verification: ${email}`);
    } catch (error) {
      console.error('Failed to generate/send OTP:', error);
      return res.status(500).json({ 
        error: 'Failed to send verification code',
        details: ['Unable to send OTP for email verification']
      });
    }

    // Return success but indicate that OTP verification is required BEFORE account creation
    res.status(200).json({
      success: false, // Not fully successful until OTP verified
      requiresVerification: true,
      message: 'Email verification required. Please check your email for verification code.',
      email: email,
      step: 'email_verification',
      instructions: 'Please verify your email address with the OTP sent to your email before we can create your account.',
      userData: {
        name,
        email,
        company,
        website,
        phone
      },
      nextStep: {
        endpoint: '/auth/verify-email-and-create-account',
        method: 'POST',
        requiredFields: ['email', 'otp', 'userData']
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register (original endpoint for backward compatibility)
router.post('/register', [
  body('name').isLength({ min: 2 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('company').optional().trim().escape(),
  body('website').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { name, email, password, company, website, phone } = req.body;

    // Comprehensive email validation using RobustEmailValidator
    console.log(`🔍 Validating email: ${email}`);
    const emailValidation = await EmailValidationService.validateEmail(email);
    
    if (!emailValidation.valid) {
      console.log(`❌ Email validation failed: ${emailValidation.reasons.join(', ')}`);
      
      return res.status(400).json({ 
        error: 'Invalid email address', 
        details: emailValidation.reasons,
        suggestions: emailValidation.suggestions || [],
        validationDetails: emailValidation.details
      });
    }
    
    console.log(`✅ Email validation passed: ${email}`);

    // Check if user already exists
    const existingUser = await DatabaseService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Create new user
    const user = await DatabaseService.createUser({
      name,
      email,
      password,
      company,
      website,
      phone
    });

    // Generate secure JWT token
    const token = generateSecureToken({ userId: user._id, email: user.email });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        company: user.company,
        website: user.website,
        subscription: user.subscription,
        apiKey: user.apiKey
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Universal Login - Step 1: Validate email and send OTP (for any genuine email)
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').optional() // Make password optional for universal email login
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid email format', details: errors.array() });
    }

    const { email, password } = req.body;

    // Step 1: Comprehensive email validation for ANY email (not just registered users)
    console.log(`🔍 Validating email for login: ${email}`);
    const emailValidation = await EmailValidationService.validateEmail(email, { verifyExistence: true });
    
    if (!emailValidation.valid) {
      console.log(`❌ Invalid email detected: ${emailValidation.reasons.join(', ')}`);
      
      return res.status(400).json({ 
        error: 'Invalid email address', 
        message: 'Please enter a valid email address from a genuine email provider.',
        details: emailValidation.reasons,
        suggestions: emailValidation.suggestions || [],
        validationDetails: emailValidation.details
      });
    }
    
    console.log(`✅ Email validation passed: ${email}`);

    // Step 2: Check if user exists (registered user with credentials)
    const existingUser = await DatabaseService.findUserByEmail(email);
    
    if (existingUser && password) {
      // Existing user trying to login with password - verify credentials
      const isValidPassword = await existingUser.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials - wrong password for this account' });
      }
      console.log(`🔐 Password verified for existing user: ${email}`);
    } else if (existingUser && !password) {
      // Existing user but no password provided - still allow OTP login
      console.log(`🔐 Existing user requesting OTP login: ${email}`);
    } else if (!existingUser && password) {
      // New email with password - this isn't registration, redirect to signup
      return res.status(404).json({ 
        error: 'Account not found', 
        message: 'No account exists with this email. Please sign up first.',
        redirectTo: '/signup',
        email: email
      });
    } else {
      // New email, no password - universal OTP login for any genuine email
      console.log(`🌍 Universal OTP login for genuine email: ${email}`);
    }

    // Step 3: Generate and send OTP for any genuine email
    try {
      const otp = await OTPService.generateAndStoreOTP(email, 'login');
      
      // Send OTP via email (use name if user exists, otherwise use email)
      const displayName = existingUser ? existingUser.name : email.split('@')[0];
      EmailService.sendLoginOTPEmail(email, displayName, otp).catch(error => {
        console.error('Failed to send login OTP email:', error);
      });
      
      console.log(`🔐 Login OTP sent to: ${email}`);
      
      // Return success but require OTP verification
      res.json({
        success: false, // Not fully successful until OTP verified
        requiresOTP: true,
        message: 'Login verification required. Please check your email for verification code.',
        email: email,
        isExistingUser: !!existingUser,
        step: 'login_verification',
        instructions: 'Please verify your email with the OTP sent to your inbox.',
        nextStep: {
          endpoint: '/auth/verify-login-otp',
          method: 'POST',
          requiredFields: ['email', 'otp']
        }
      });
      
    } catch (error) {
      console.error('Failed to send login OTP:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to send login verification code' 
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await DatabaseService.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        company: user.company,
        website: user.website,
        phone: user.phone,
        subscription: user.subscription,
        usage: user.usage,
        widgetConfig: user.widgetConfig,
        apiKey: user.apiKey,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update widget configuration
router.put('/widget-config', authenticateToken, [
  body('primaryColor').optional().isHexColor(),
  body('position').optional().isIn(['bottom-right', 'bottom-left', 'top-right', 'top-left']),
  body('title').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('subtitle').optional().isLength({ min: 1, max: 100 }).trim().escape(),
  body('welcomeMessage').optional().isLength({ min: 1, max: 200 }).trim().escape(),
  body('placeholder').optional().isLength({ min: 1, max: 50 }).trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const user = await DatabaseService.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update widget configuration
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (user.widgetConfig.hasOwnProperty(key)) {
        user.widgetConfig[key] = updates[key];
      }
    });

    await DatabaseService.updateUser(user._id, { widgetConfig: user.widgetConfig });

    res.json({
      message: 'Widget configuration updated successfully',
      widgetConfig: user.widgetConfig
    });

  } catch (error) {
    console.error('Widget config update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  try {
    // Add token to blacklist
    tokenBlacklist.add(req.token);
    
    // Clean up old tokens periodically (basic cleanup)
    if (tokenBlacklist.size > 10000) {
      // Keep only last 5000 tokens to prevent memory issues
      const tokensArray = Array.from(tokenBlacklist);
      tokenBlacklist.clear();
      tokensArray.slice(-5000).forEach(token => tokenBlacklist.add(token));
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh-token', authenticateToken, async (req, res) => {
  try {
    const user = await DatabaseService.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Blacklist the current token
    tokenBlacklist.add(req.token);
    
    // Generate new token
    const newToken = generateSecureToken({ userId: user._id, email: user.email });

    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Regenerate API Key
router.post('/regenerate-api-key', authenticateToken, async (req, res) => {
  try {
    const user = await DatabaseService.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.generateApiKey();
    await DatabaseService.updateUser(user._id, { apiKey: user.apiKey });

    res.json({
      message: 'API key regenerated successfully',
      apiKey: user.apiKey
    });

  } catch (error) {
    console.error('API key regeneration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OTP Verification Routes

// Send OTP to email
router.post('/send-otp', authenticateToken, async (req, res) => {
  try {
    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      const otp = await OTPService.generateAndStoreOTP(user.email, 'email');
      
      // Send OTP via email
      EmailService.sendOTPEmail(user.email, user.name, otp).catch(error => {
        console.error('Failed to send OTP email:', error);
      });

      res.json({
        success: true,
        message: 'OTP sent to your email successfully',
        expiresIn: 600 // 10 minutes
      });

    } catch (error) {
      console.error('Failed to send OTP:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP
router.post('/verify-otp', [
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { otp } = req.body;
    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const verificationResult = await OTPService.verifyOTP(user.email, otp);
    
    if (verificationResult.success) {
      // Update user's email verification status
      await DatabaseService.updateUser(user._id, {
        emailVerified: true,
        'verificationStatus.email': true,
        'verificationStatus.emailVerifiedAt': new Date()
      });

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: verificationResult.error,
        code: verificationResult.code,
        attemptsRemaining: verificationResult.attemptsRemaining
      });
    }

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend OTP
router.post('/resend-otp', authenticateToken, async (req, res) => {
  try {
    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resendResult = await OTPService.resendOTP(user.email, 'email');
    
    if (resendResult.success) {
      // Send OTP via email
      EmailService.sendOTPEmail(user.email, user.name, resendResult.otp).catch(error => {
        console.error('Failed to send OTP email:', error);
      });

      res.json({
        success: true,
        message: 'OTP resent to your email successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: resendResult.error,
        code: resendResult.code
      });
    }

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check OTP status
router.get('/otp-status', authenticateToken, async (req, res) => {
  try {
    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const status = OTPService.getOTPStatus(user.email);
    
    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('OTP status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email Verification Routes

// Mark email as verified (simplified - in production, use email links with tokens)
router.post('/verify-email', authenticateToken, async (req, res) => {
  try {
    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await DatabaseService.updateUser(user._id, {
      emailVerified: true,
      'verificationStatus.email': true,
      'verificationStatus.emailVerifiedAt': new Date()
    });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email OTP and create account (NEW MANDATORY FLOW)
router.post('/verify-email-and-create-account', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('userData.name').isLength({ min: 2 }).trim().escape(),
  body('userData.password').isLength({ min: 6 }),
  body('userData.company').optional().trim().escape(),
  body('userData.website').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { email, otp, userData } = req.body;
    const { name, password, company, website, phone } = userData;

    // Verify OTP first
    const verificationResult = await OTPService.verifyOTP(email, otp);
    
    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        error: verificationResult.error || 'Invalid or expired OTP',
        code: verificationResult.code,
        attemptsRemaining: verificationResult.attemptsRemaining
      });
    }

    console.log(`✅ OTP verified successfully for: ${email}`);

    // Check if user already exists (double-check)
    const existingUser = await DatabaseService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Create new user - OTP verified, email ownership confirmed
    const user = await DatabaseService.createUser({
      name,
      email,
      password,
      company,
      website,
      phone,
      emailVerified: true, // Mark as verified since OTP was confirmed
      verificationStatus: {
        email: true,
        emailVerifiedAt: new Date()
      }
    });

    console.log(`🎉 User created successfully after email verification: ${user.email}`);

    // Send welcome email (async, non-blocking)
    EmailService.sendWelcomeEmail(user.email, user.name).catch(error => {
      console.error('Failed to send welcome email:', error);
    });

    // Generate secure JWT token
    const token = generateSecureToken({ userId: user._id, email: user.email });

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Email verified.',
      token,
      redirectTo: '/dashboard',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        company: user.company,
        website: user.website,
        phone: user.phone,
        subscription: user.subscription,
        apiKey: user.apiKey,
        emailVerified: true,
        verificationStatus: user.verificationStatus
      }
    });

  } catch (error) {
    console.error('Account creation error:', error);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// Resend OTP for signup verification (without authentication)
router.post('/resend-signup-otp', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid email address', details: errors.array() });
    }

    const { email } = req.body;
    
    // Check if user already exists
    const existingUser = await DatabaseService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email. Please login instead.' });
    }

    // Resend OTP for signup verification
    try {
      const otp = await OTPService.generateAndStoreOTP(email, 'email');
      
      // Send OTP via email
      EmailService.sendSignupOTPEmail(email, otp).catch(error => {
        console.error('Failed to send OTP email:', error);
      });
      
      console.log(`🔐 OTP resent for signup verification: ${email}`);
      
      res.json({
        success: true,
        message: 'Verification code sent successfully. Please check your email.',
        expiresIn: 600 // 10 minutes
      });
      
    } catch (error) {
      console.error('Failed to resend OTP:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to send verification code' 
      });
    }

  } catch (error) {
    console.error('Resend signup OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify login OTP and complete login (Universal login for any genuine email)
router.post('/verify-login-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { email, otp } = req.body;

    // Verify OTP first (for any email)
    const verificationResult = await OTPService.verifyOTP(email, otp);
    
    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        error: verificationResult.error || 'Invalid or expired OTP',
        code: verificationResult.code,
        attemptsRemaining: verificationResult.attemptsRemaining
      });
    }

    console.log(`✅ Login OTP verified successfully for: ${email}`);

    // Check if user exists (registered user)
    const existingUser = await DatabaseService.findUserByEmail(email);
    
    if (existingUser) {
      // Existing registered user - full login
      console.log(`🔐 Existing user login completed: ${email}`);
      
      // Update last login
      await DatabaseService.updateUser(existingUser._id, { lastLoginAt: new Date() });

      // Generate secure JWT token
      const token = generateSecureToken({ userId: existingUser._id, email: existingUser.email });

      res.json({
        success: true,
        message: 'Login successful - Welcome back!',
        token,
        redirectTo: '/dashboard',
        userType: 'existing',
        user: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          company: existingUser.company,
          website: existingUser.website,
          subscription: existingUser.subscription,
          usage: existingUser.usage,
          apiKey: existingUser.apiKey
        }
      });
    } else {
      // New user with verified email - temporary access or prompt for registration
      console.log(`🌍 New user verified email access: ${email}`);
      
      res.json({
        success: true,
        message: 'Email verified successfully! You can now access our services.',
        email: email,
        userType: 'guest',
        emailVerified: true,
        redirectTo: '/guest-dashboard', // Or prompt for full registration
        options: {
          continueAsGuest: true,
          createAccount: {
            message: 'Create a full account to access all features',
            redirectTo: '/complete-registration',
            benefits: ['Save chat history', 'Custom configurations', 'Advanced features']
          }
        },
        // Temporary guest token (limited access)
        guestToken: generateSecureToken({ 
          email: email, 
          type: 'guest',
          verified: true,
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        })
      });
    }

  } catch (error) {
    console.error('Login OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend login OTP
router.post('/resend-login-otp', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid email address', details: errors.array() });
    }

    const { email } = req.body;
    
    // Find user
    const user = await DatabaseService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid request' });
    }

    // Resend OTP for login verification
    try {
      const otp = await OTPService.generateAndStoreOTP(email, 'login');
      
      // Send OTP via email
      EmailService.sendLoginOTPEmail(email, user.name, otp).catch(error => {
        console.error('Failed to send login OTP email:', error);
      });
      
      console.log(`🔐 Login OTP resent to: ${email}`);
      
      res.json({
        success: true,
        message: 'Login verification code sent successfully. Please check your email.',
        expiresIn: 600 // 10 minutes
      });
      
    } catch (error) {
      console.error('Failed to resend login OTP:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to send login verification code' 
      });
    }

  } catch (error) {
    console.error('Resend login OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend welcome email
router.post('/resend-welcome-email', authenticateToken, async (req, res) => {
  try {
    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await EmailService.sendWelcomeEmail(user.email, user.name);

    res.json({
      success: true,
      message: 'Welcome email sent successfully'
    });

  } catch (error) {
    console.error('Resend welcome email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = { router, authenticateToken };
