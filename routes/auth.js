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
  const getBearer = () => {
    const h = req.headers['authorization'];
    if (!h) return null;
    const parts = h.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
    return null;
  };
  const getCookieToken = () => {
    try {
      const raw = req.headers['cookie'];
      if (!raw) return null;
      const kv = raw.split(';').map(s => s.trim());
      const entry = kv.find(s => s.startsWith('authToken='));
      if (!entry) return null;
      return decodeURIComponent(entry.substring('authToken='.length));
    } catch (_) { return null; }
  };

  const token = getBearer() || getCookieToken();

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
  body('website').optional()
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
      return res.status(400).json({ 
        error: 'Email already registered. Please sign in instead.', 
        userExists: true,
        redirectTo: '/login',
        message: 'This email is already associated with an account. Please use the sign-in option to access your account.'
      });
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
        endpoint: '/api/verify-email-and-create-account',
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
  body('website').optional()
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
    } else {
      // Treat ANY genuine email as eligible for OTP login (even if a password was provided).
      // This avoids blocking first-time users who typed a password by habit.
      console.log(`🌍 Universal OTP login for genuine email: ${email}`);
    }

    // Step 3: Generate and send OTP for any genuine email
    try {
      const otp = await OTPService.generateAndStoreOTP(email, 'login');
      
      // Send OTP via email (use name if user exists, otherwise use email)
      const displayName = existingUser ? existingUser.name : email.split('@')[0];
      try {
        await EmailService.sendLoginOTPEmail(email, displayName, otp);
      } catch (sendErr) {
        console.error('❌ Failed to send login OTP email:', sendErr);
        return res.status(502).json({ success: false, error: 'Failed to send login verification email' });
      }
      
      console.log(`🔐 Login OTP sent to: ${email}`);
      
      // Return success but require OTP verification
      res.json({
        success: false, // Not fully successful until OTP verified
        requiresOTP: true,
        message: 'Login verification required. Please check your email for verification code.',
        email: email,
        normalizedEmail: (email || '').toLowerCase().trim(),
        isExistingUser: !!existingUser,
        step: 'login_verification',
        instructions: 'Please verify your email with the OTP sent to your inbox.',
        nextStep: {
          endpoint: '/api/verify-login-otp',
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
  try { res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate'); } catch(_) {}
  try {
    console.log('🔍 Profile endpoint called');
    console.log('📋 JWT payload:', req.user);
    console.log('🆔 Looking for user ID:', req.user.userId);
    console.log('🆔 User ID type:', typeof req.user.userId);
    
    // Convert string ID to ObjectId if needed for MongoDB
    let searchUserId = req.user.userId;
    if (typeof searchUserId === 'string' && searchUserId.length === 24) {
      // Check if it looks like a MongoDB ObjectId
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(searchUserId)) {
        searchUserId = new mongoose.Types.ObjectId(searchUserId);
        console.log('🔄 Converted string ID to ObjectId:', searchUserId);
      }
    }
    
    const user = await DatabaseService.findUserById(searchUserId);
    
    if (!user) {
      console.error('❌ User not found in database!');
      console.log('🔍 Searched with ID:', searchUserId);
      console.log('🔍 Original JWT userId:', req.user.userId);
      
      // Debug: Show available users (in development only)
      if (process.env.NODE_ENV === 'development') {
        try {
          const allUsers = await DatabaseService.getAllUsers(10, 0);
          console.log('👥 All users:', allUsers.map(u => ({ 
            id: u._id, 
            idType: typeof u._id,
            idString: u._id.toString(),
            email: u.email, 
            name: u.name 
          })));
        } catch (debugErr) {
          console.error('Failed to fetch debug users:', debugErr);
        }
      }
      
      return res.status(404).json({ 
        error: 'User not found',
        debug: {
          searchedUserId: req.user.userId,
          searchedUserIdType: typeof req.user.userId,
          convertedId: searchUserId.toString(),
          jwtPayload: req.user
        }
      });
    }
    
    console.log('✅ User found:', { id: user._id, email: user.email, name: user.name });

    // Get comprehensive plan information and usage summary
    let planDetails, usageSummary, currentPlan;

    // Normalize/repair subscription plan server-side to avoid UI drift
    const canonicalPlans = ['free','starter','professional','enterprise'];
    const planIdsByName = { 'free plan': 'free', 'starter plan': 'starter', 'professional plan': 'professional', 'enterprise plan': 'enterprise' };
    const amountToPlanINR = { 0: 'free', 499: 'starter', 1499: 'professional', 4999: 'enterprise' };

    const rawPlan = (user.subscription && typeof user.subscription.plan === 'string') ? user.subscription.plan.toLowerCase().trim() : 'free';
    const namePlan = planIdsByName[String(user.subscription?.planName || '').toLowerCase().trim()] || null;
    const amtPlan = (user.subscription?.currency || 'INR') === 'INR' && amountToPlanINR.hasOwnProperty(user.subscription?.amount)
      ? amountToPlanINR[user.subscription.amount]
      : null;

    // Choose the safest normalized plan by taking the lowest tier among all signals
    const planHierarchy = ['free','starter','professional','enterprise'];
    const rawCandidate = canonicalPlans.includes(rawPlan) ? rawPlan : null;
    const candidates = [rawCandidate, namePlan, amtPlan].filter(Boolean);
    let normalizedPlan = candidates.length
      ? candidates.reduce((acc, p) => (planHierarchy.indexOf(p) < planHierarchy.indexOf(acc) ? p : acc))
      : 'free';

    // Policy update: prefer the logged-in account's plan and do not lower across Gmail aliases.

    // Persist repair if any subscription fields drift from normalized plan
    try {
      const { PlanManager } = require('../config/planFeatures');
      const canonical = PlanManager.getPlanDetails(normalizedPlan) || {};
      const patch = {};
      let needsPatch = false;
      if (user.subscription?.plan !== normalizedPlan) { patch['subscription.plan'] = normalizedPlan; needsPatch = true; }
      if (user.subscription?.planName !== canonical.name) { patch['subscription.planName'] = canonical.name; needsPatch = true; }
      if (typeof canonical.price === 'number' && user.subscription?.amount !== canonical.price) { patch['subscription.amount'] = canonical.price; needsPatch = true; }
      if (canonical.currency && user.subscription?.currency !== canonical.currency) { patch['subscription.currency'] = canonical.currency; needsPatch = true; }
      if (canonical.billingCycle && user.subscription?.billingCycle !== canonical.billingCycle) { patch['subscription.billingCycle'] = canonical.billingCycle; needsPatch = true; }
      if (needsPatch) {
        patch['subscription.updatedAt'] = new Date();
        await DatabaseService.updateUser(user._id, patch);
        console.log('🔧 Repaired subscription fields:', { email: user.email, patch });
      }
    } catch (e) {
      console.warn('⚠️ Failed to persist plan repair:', e.message);
    }

    // Initialize defaults first
    currentPlan = normalizedPlan || 'free';
    planDetails = {
      name: 'Free Plan',
      price: 0,
      currency: 'INR',
      billingCycle: 'monthly',
      limits: { messagesPerMonth: 100 },
      features: {},
      restrictions: {},
      ui: {}
    };
    usageSummary = { plan: currentPlan, usage: {}, warnings: [] };

    try {
      const { PlanManager } = require('../config/planFeatures');
      console.log('📊 Getting plan details for plan:', currentPlan);
      
      if (PlanManager && typeof PlanManager.getPlanDetails === 'function') {
        const retrievedPlanDetails = PlanManager.getPlanDetails(currentPlan);
        if (retrievedPlanDetails) {
          planDetails = retrievedPlanDetails;
          console.log('📊 Plan details retrieved:', planDetails?.name);
        }
      }
      // Additional diagnostics for plan resolution
      try {
        console.log('🔎 Plan resolution diagnostics:', {
          userEmail: user.email,
          subscriptionPlan: user.subscription?.plan,
          resolvedPlan: currentPlan,
          resolvedPlanName: planDetails?.name
        });
      } catch (_) {}
    } catch (planError) {
      console.error('❌ Error getting plan information:', planError);
      console.error('❌ PlanManager error stack:', planError.stack);
      // Keep the default fallback values already set above
    }
    
    try {
      const { getUsageSummary } = require('../middleware/planAccessControl');
      if (getUsageSummary && typeof getUsageSummary === 'function') {
        const retrievedUsageSummary = getUsageSummary(user);
        if (retrievedUsageSummary) {
          usageSummary = retrievedUsageSummary;
          console.log('📊 Usage summary retrieved:', usageSummary?.plan);
        }
      }
    } catch (usageError) {
      console.error('❌ Error getting usage summary:', usageError);
      console.error('❌ Usage summary error stack:', usageError.stack);
      // Keep the default fallback values already set above
    }
    
    // Calculate days until billing renewal
    let daysUntilRenewal = null;
    if (user.subscription?.nextBilling) {
      const nextBilling = new Date(user.subscription.nextBilling);
      const now = new Date();
      daysUntilRenewal = Math.ceil((nextBilling - now) / (1000 * 60 * 60 * 24));
    }
    
    // Determine suggested upgrade
    let nextPlan, canUpgrade, planManagerForUpgrade;
    try {
      const { PlanManager } = require('../config/planFeatures');
      planManagerForUpgrade = PlanManager;
      nextPlan = PlanManager.getNextPlan(currentPlan);
      canUpgrade = !!nextPlan;
    } catch (err) {
      planManagerForUpgrade = null;
      nextPlan = null;
      canUpgrade = false;
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        company: user.company,
        website: user.website,
        phone: user.phone,
        apiKey: user.apiKey,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        
        // Enhanced subscription information
        subscription: {
          ...user.subscription,
          plan: currentPlan,
          planName: planDetails.name,
          status: user.subscription?.status || 'active',
          nextBilling: user.subscription?.nextBilling,
          daysUntilRenewal,
          canCancel: currentPlan !== 'free'
        },
        
        // Enhanced usage with plan context
        usage: {
          ...user.usage,
          summary: usageSummary,
          messagesThisMonth: user.usage?.messagesThisMonth || 0,
          totalMessages: user.usage?.totalMessages || 0
        },
        
        // Plan details and features
        plan: {
          current: {
            id: currentPlan,
            name: planDetails.name,
            price: planDetails.price,
            currency: planDetails.currency,
            billingCycle: planDetails.billingCycle,
            limits: planDetails.limits,
            features: planDetails.features,
            restrictions: planDetails.restrictions,
            ui: planDetails.ui
          },
          upgrade: canUpgrade ? {
            available: true,
            suggestedPlan: nextPlan,
            suggestedPlanDetails: planManagerForUpgrade ? planManagerForUpgrade.getPlanDetails(nextPlan) : null
          } : {
            available: false,
            reason: currentPlan === 'enterprise' ? 'Already on highest plan' : 'No upgrades available'
          }
        },
        
        // Widget configuration
        widgetConfig: user.widgetConfig,
        
        // Account status and capabilities
        capabilities: (() => {
          try {
            const { PlanManager } = require('../config/planFeatures');
            return {
              canSendMessages: PlanManager.isWithinLimit(currentPlan, 'messagesPerMonth', user.usage?.messagesThisMonth || 0),
              canAccessAnalytics: PlanManager.hasFeature(currentPlan, 'basicAnalytics'),
              canAccessAdvancedAnalytics: PlanManager.hasFeature(currentPlan, 'advancedAnalytics'),
              canCustomizeBranding: PlanManager.hasFeature(currentPlan, 'customBranding'),
              hasApiAccess: PlanManager.hasFeature(currentPlan, 'apiAccess'),
              hasPrioritySupport: PlanManager.hasFeature(currentPlan, 'prioritySupport'),
              canUseWebhooks: PlanManager.hasFeature(currentPlan, 'webhooks'),
              canExportData: PlanManager.hasFeature(currentPlan, 'exportData')
            };
          } catch (capError) {
            console.error('❌ Error getting capabilities:', capError);
            return {
              canSendMessages: true,
              canAccessAnalytics: false,
              canAccessAdvancedAnalytics: false,
              canCustomizeBranding: false,
              hasApiAccess: false,
              hasPrioritySupport: false,
              canUseWebhooks: false,
              canExportData: false
            };
          }
        })()
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug: Get normalized plan and subscription info by email (protected)
router.get('/debug-user-plan', async (req, res) => {
  try {
    const key = req.query.key || req.headers['x-internal-key'] || '';
    if (!process.env.INTERNAL_SERVICE_KEY || key !== process.env.INTERNAL_SERVICE_KEY) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const email = (req.query.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const user = await DatabaseService.findUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Reuse normalization from /profile
    const canonicalPlans = ['free','starter','professional','enterprise'];
    const planIdsByName = { 'free plan': 'free', 'starter plan': 'starter', 'professional plan': 'professional', 'enterprise plan': 'enterprise' };
    const amountToPlanINR = { 0: 'free', 499: 'starter', 1499: 'professional', 4999: 'enterprise' };

    const rawPlan = (user.subscription && typeof user.subscription.plan === 'string') ? user.subscription.plan.toLowerCase().trim() : 'free';
    const namePlan = planIdsByName[String(user.subscription?.planName || '').toLowerCase().trim()] || null;
    const amtPlan = (user.subscription?.currency || 'INR') === 'INR' && Object.prototype.hasOwnProperty.call(amountToPlanINR, user.subscription?.amount)
      ? amountToPlanINR[user.subscription.amount]
      : null;
    const planHierarchy = ['free','starter','professional','enterprise'];
    const rawCandidate = canonicalPlans.includes(rawPlan) ? rawPlan : null;
    const candidates = [rawCandidate, namePlan, amtPlan].filter(Boolean);
    const normalizedPlan = candidates.length
      ? candidates.reduce((acc, p) => (planHierarchy.indexOf(p) < planHierarchy.indexOf(acc) ? p : acc))
      : 'free';

    const { PlanManager } = require('../config/planFeatures');
    let planDetails = PlanManager.getPlanDetails(normalizedPlan);

    return res.json({
      email: user.email,
      rawPlan,
      planName: user.subscription?.planName || null,
      amount: user.subscription?.amount || null,
      currency: user.subscription?.currency || null,
      normalizedPlan,
      usage: user.usage || {},
      capabilities: {
        basicAnalytics: PlanManager.hasFeature(normalizedPlan, 'basicAnalytics'),
        advancedAnalytics: PlanManager.hasFeature(normalizedPlan, 'advancedAnalytics')
      },
      serverCommit: process.env.RAILWAY_GIT_COMMIT_SHA || null
    });
  } catch (e) {
    console.error('debug-user-plan error:', e);
    return res.status(500).json({ error: 'Internal server error' });
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
  body('userData.website').optional()
], async (req, res) => {
  try {
    console.log('🚀 NEW ACCOUNT CREATION - OTP verification and account creation started');
    console.log('📧 Request body email:', req.body.email);
    console.log('🔢 Request body OTP:', req.body.otp);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const { email, otp, userData } = req.body;
    const { name, password, company, website, phone } = userData;

    console.log(`🔍 Attempting to verify OTP for email: ${email}`);
    console.log(`🔐 OTP to verify: ${otp}`);
    
    // Verify OTP first
    const verificationResult = await OTPService.verifyOTP(email, otp);
    console.log('📊 OTP verification result:', verificationResult);
    
    if (!verificationResult.success) {
      console.log('❌ OTP verification failed:', verificationResult);
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
      redirectTo: '/welcome-dashboard',
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
      try {
        await EmailService.sendSignupOTPEmail(email, otp);
      } catch (sendErr) {
        console.error('❌ Failed to send signup OTP email:', sendErr);
        return res.status(502).json({ success: false, error: 'Failed to send verification code' });
      }
      
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
    const typedEmail = String(email || '').toLowerCase().trim();

    // Verify OTP first (for any email)
    const verificationResult = await OTPService.verifyOTP(typedEmail, otp);
    
    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        error: verificationResult.error || 'Invalid or expired OTP',
        code: verificationResult.code,
        attemptsRemaining: verificationResult.attemptsRemaining
      });
    }

    console.log(`✅ Login OTP verified successfully for: ${typedEmail}`);

    // Helper to unify gmail alias accounts and return the primary user to log in
    async function unifyGmailAliasesOnLogin(preferredEmail, foundUser) {
      try {
        const lower = preferredEmail.toLowerCase();
        const [local, domain] = lower.split('@');
        if (!domain || (domain !== 'gmail.com' && domain !== 'googlemail.com')) {
          return foundUser; // Non-gmail: nothing to unify
        }
        // Use robust alias lookup to collect all Gmail variants
        const aliasUsers = await DatabaseService.findUsersByGmailAlias(lower);
        if (!Array.isArray(aliasUsers) || aliasUsers.length === 0) return foundUser;

        // Choose primary: the one with the preferred (typed) email if exists, else the provided foundUser
        let primary = aliasUsers.find(u => String(u.email || '').toLowerCase() === lower) || foundUser;

        // Policy update: prefer the exact typed email's plan
        const hierarchy = ['free','starter','professional','enterprise'];
        function normalizePlan(u) {
          const planIdsByName = { 'free plan': 'free', 'starter plan': 'starter', 'professional plan': 'professional', 'enterprise plan': 'enterprise' };
          const amountToPlanINR = { 0: 'free', 499: 'starter', 1499: 'professional', 4999: 'enterprise' };
          const raw = (u.subscription && typeof u.subscription.plan === 'string') ? u.subscription.plan.toLowerCase().trim() : 'free';
          const byName = planIdsByName[String(u.subscription?.planName || '').toLowerCase().trim()] || null;
          const byAmt = (u.subscription?.currency || 'INR') === 'INR' && Object.prototype.hasOwnProperty.call(amountToPlanINR, u.subscription?.amount)
            ? amountToPlanINR[u.subscription.amount]
            : null;
          const cands = [raw, byName, byAmt].filter(Boolean);
          if (!cands.length) return 'free';
          // Keep raw's precedence if valid; otherwise pick first available
          return hierarchy.includes(raw) ? raw : cands[0];
        }

        // If typed email exists, use its plan; else use the found user's plan
        const typedUser = aliasUsers.find(u => String(u.email || '').toLowerCase() === lower);
        const planToApply = normalizePlan(typedUser || foundUser);

        // Update primary with typed email and keep its authoritative plan
        try {
          const { PlanManager } = require('../config/planFeatures');
          const canonical = PlanManager.getPlanDetails(planToApply);
          await DatabaseService.updateUser(primary._id, {
            email: lower,
            'subscription.plan': planToApply,
            'subscription.planName': canonical.name,
            'subscription.amount': canonical.price,
            'subscription.currency': canonical.currency,
            'subscription.billingCycle': canonical.billingCycle,
            'subscription.status': 'active',
            'subscription.updatedAt': new Date()
          });
          // Reload primary
          primary = await DatabaseService.findUserById(primary._id);
        } catch (e) {
          console.warn('Alias unify update warning:', e.message);
        }

        return primary;
      } catch (e) {
        console.warn('Alias unify error:', e.message);
        return foundUser;
      }
    }

    // Check if user exists (registered user)
    const existingUser = await DatabaseService.findUserByEmail(typedEmail);
    
    if (existingUser) {
      // Unify gmail aliases (if any) and prefer the typed email as account email
      const primaryUser = await unifyGmailAliasesOnLogin(typedEmail, existingUser);

      // Update last login
      await DatabaseService.updateUser(primaryUser._id, { lastLoginAt: new Date() });

      // Generate secure JWT token using the primary account
      const token = generateSecureToken({ userId: primaryUser._id, email: primaryUser.email });

      res.json({
        success: true,
        message: 'Login successful - Welcome back!',
        token,
        redirectTo: '/dashboard',
        userType: 'existing',
        user: {
          id: primaryUser._id,
          name: primaryUser.name,
          email: primaryUser.email,
          company: primaryUser.company,
          website: primaryUser.website,
          subscription: primaryUser.subscription,
          usage: primaryUser.usage,
          apiKey: primaryUser.apiKey
        }
      });
    } else {
      // New email verified — auto-provision a minimal account for a consistent experience
      console.log(`🆕 Creating minimal account after OTP verification for: ${typedEmail}`);
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const nameFromEmail = typedEmail.split('@')[0].replace(/[._]/g, ' ').trim() || 'New User';
      
      const user = await DatabaseService.createUser({
        name: nameFromEmail,
        email: typedEmail,
        password: randomPassword,
        company: '',
        website: '',
        phone: '',
        emailVerified: true,
        verificationStatus: { email: true, emailVerifiedAt: new Date() }
      });
      try {
        EmailService.sendWelcomeEmail(user.email, user.name).catch(()=>{});
      } catch(_) {}
      const token = generateSecureToken({ userId: user._id, email: user.email });
      return res.json({
        success: true,
        message: 'Account created via OTP verification. Welcome!',
        token,
        redirectTo: '/welcome-dashboard',
        userType: 'new',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          company: user.company,
          website: user.website,
          subscription: user.subscription,
          usage: user.usage,
          apiKey: user.apiKey
        }
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

    // Note: Allow resending OTP for both existing and new users (universal login)
    // If a user exists, we can personalize the email with their name; otherwise, use email prefix.
    let displayName = email.split('@')[0];
    try {
      const maybeUser = await DatabaseService.findUserByEmail(email);
      if (maybeUser && maybeUser.name) {
        displayName = maybeUser.name;
      }
    } catch (_) { /* non-fatal */ }

    // Resend OTP for login verification
    try {
      const otp = await OTPService.generateAndStoreOTP(email, 'login');
      
      // Send OTP via email
      try {
        await EmailService.sendLoginOTPEmail(email, displayName, otp);
      } catch (sendErr) {
        console.error('❌ Failed to resend login OTP email:', sendErr);
        return res.status(502).json({ success: false, error: 'Failed to send login verification code' });
      }
      
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

// Chat Configuration Management

// Get chat configuration
router.get('/chat-config', authenticateToken, async (req, res) => {
  try {
    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return chat configuration or defaults
    const chatConfig = user.chatConfig || {
      preset: 'professional',
      systemPrompt: 'You are a helpful AI assistant. Be professional, concise, and always try to provide accurate information. If you don\'t know something, say so honestly.',
      welcomeMessage: 'Hello! How can I help you today?',
      fallbackResponse: 'I\'m sorry, I don\'t have enough information to answer that question accurately. Would you like me to connect you with a human agent?',
      responseLength: 'medium',
      languageStyle: 'casual',
      focusTopics: 'general support, product information'
    };

    res.json({
      success: true,
      configuration: chatConfig
    });

  } catch (error) {
    console.error('Get chat config error:', error);
    res.status(500).json({ error: 'Failed to retrieve chat configuration' });
  }
});

// Save chat configuration
router.put('/chat-config', [
  body('preset').optional().isIn(['professional', 'friendly', 'expert', 'custom']).withMessage('Invalid preset'),
  body('systemPrompt').optional().isLength({ min: 10, max: 2000 }).withMessage('System prompt must be between 10-2000 characters'),
  body('welcomeMessage').optional().isLength({ min: 5, max: 200 }).withMessage('Welcome message must be between 5-200 characters'),
  body('fallbackResponse').optional().isLength({ min: 10, max: 500 }).withMessage('Fallback response must be between 10-500 characters'),
  body('responseLength').optional().isIn(['short', 'medium', 'long']).withMessage('Invalid response length'),
  body('languageStyle').optional().isIn(['formal', 'casual', 'technical']).withMessage('Invalid language style'),
  body('focusTopics').optional().isLength({ max: 200 }).withMessage('Focus topics must be under 200 characters')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has premium access for custom configurations
    const userPlan = user.subscription?.plan || 'free';
    if (userPlan === 'free') {
      return res.status(403).json({ 
        error: 'Premium feature required',
        message: 'Chat configuration is available for premium plan users only',
        upgradeUrl: '/pricing'
      });
    }

    const {
      preset,
      systemPrompt,
      welcomeMessage,
      fallbackResponse,
      responseLength,
      languageStyle,
      focusTopics
    } = req.body;

    // Build configuration object with only provided fields
    const chatConfig = {};
    if (preset !== undefined) chatConfig.preset = preset;
    if (systemPrompt !== undefined) chatConfig.systemPrompt = systemPrompt;
    if (welcomeMessage !== undefined) chatConfig.welcomeMessage = welcomeMessage;
    if (fallbackResponse !== undefined) chatConfig.fallbackResponse = fallbackResponse;
    if (responseLength !== undefined) chatConfig.responseLength = responseLength;
    if (languageStyle !== undefined) chatConfig.languageStyle = languageStyle;
    if (focusTopics !== undefined) chatConfig.focusTopics = focusTopics;
    
    // Add metadata
    chatConfig.lastUpdated = new Date();
    chatConfig.updatedBy = user._id;

    // Update user's chat configuration
    await DatabaseService.updateUser(user._id, { 
      chatConfig: {
        ...user.chatConfig,
        ...chatConfig
      }
    });

    console.log(`✅ Chat configuration updated for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Chat configuration saved successfully',
      configuration: {
        ...user.chatConfig,
        ...chatConfig
      }
    });

  } catch (error) {
    console.error('Save chat config error:', error);
    res.status(500).json({ error: 'Failed to save chat configuration' });
  }
});

// Setup Progress Tracking

// Get user setup progress
router.get('/setup-progress', authenticateToken, async (req, res) => {
  try {
    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate progress based on user data
    const progress = {
      signup: true, // Always true since they're logged in
      plan: user.subscription?.plan && user.subscription.plan !== 'free',
      customize: !!user.widgetConfig?.customized || !!user.chatConfig,
      embed: !!user.setupProgress?.embed || false,
      live: !!user.setupProgress?.live || false
    };

    // Calculate completion percentage
    const completedSteps = Object.values(progress).filter(Boolean).length;
    const totalSteps = Object.keys(progress).length;
    const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

    res.json({
      success: true,
      progress,
      completionPercentage,
      nextStep: getNextStep(progress)
    });

  } catch (error) {
    console.error('Get setup progress error:', error);
    res.status(500).json({ error: 'Failed to retrieve setup progress' });
  }
});

// Update user setup progress
router.put('/setup-progress', [
  body('step').isIn(['signup', 'plan', 'customize', 'embed', 'live']).withMessage('Invalid step'),
  body('completed').isBoolean().withMessage('Completed must be boolean')
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input', details: errors.array() });
    }

    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { step, completed } = req.body;

    // Initialize setupProgress if it doesn't exist
    const currentProgress = user.setupProgress || {};
    currentProgress[step] = completed;
    currentProgress.lastUpdated = new Date();

    // Special handling for certain steps
    if (step === 'customize' && completed) {
      // Mark widget as customized
      const widgetConfig = user.widgetConfig || {};
      widgetConfig.customized = true;
      await DatabaseService.updateUser(user._id, { 
        setupProgress: currentProgress,
        widgetConfig: widgetConfig
      });
    } else {
      await DatabaseService.updateUser(user._id, { 
        setupProgress: currentProgress
      });
    }

    console.log(`✅ Progress updated for user ${user.email}: ${step} = ${completed}`);

    // Return updated progress
    const updatedProgress = {
      signup: true,
      plan: user.subscription?.plan && user.subscription.plan !== 'free',
      customize: completed || !!user.widgetConfig?.customized || !!user.chatConfig,
      embed: currentProgress.embed || false,
      live: currentProgress.live || false
    };

    // Override with the step just updated
    updatedProgress[step] = completed;

    const completedSteps = Object.values(updatedProgress).filter(Boolean).length;
    const totalSteps = Object.keys(updatedProgress).length;
    const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

    res.json({
      success: true,
      message: `Setup progress updated: ${step}`,
      progress: updatedProgress,
      completionPercentage,
      nextStep: getNextStep(updatedProgress)
    });

  } catch (error) {
    console.error('Update setup progress error:', error);
    res.status(500).json({ error: 'Failed to update setup progress' });
  }
});

// Helper function to determine next step
function getNextStep(progress) {
  const steps = ['signup', 'plan', 'customize', 'embed', 'live'];
  for (const step of steps) {
    if (!progress[step]) {
      return step;
    }
  }
  return 'completed'; // All steps done
}

module.exports = { router, authenticateToken };
