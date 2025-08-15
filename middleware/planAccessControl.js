const { PlanManager } = require('../config/planFeatures');

/**
 * Middleware to check if user has access to specific features based on their plan
 * @param {string} requiredFeature - Feature name that needs to be checked
 * @returns {Function} Express middleware function
 */
function requireFeature(requiredFeature) {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userPlan = user.subscription?.plan || 'free';
      const hasFeature = PlanManager.hasFeature(userPlan, requiredFeature);

      if (!hasFeature) {
        const nextPlan = PlanManager.getNextPlan(userPlan);
        return res.status(403).json({
          error: `This feature requires a higher plan subscription`,
          code: 'FEATURE_RESTRICTED',
          currentPlan: userPlan,
          requiredFeature,
          suggestedUpgrade: nextPlan,
          upgradeUrl: '/pricing'
        });
      }

      next();
    } catch (error) {
      console.error('Feature access control error:', error);
      res.status(500).json({ 
        error: 'Access control check failed',
        code: 'ACCESS_CHECK_ERROR'
      });
    }
  };
}

/**
 * Middleware to check if user is within usage limits
 * @param {string} limitType - Type of limit to check (e.g., 'messagesPerMonth')
 * @param {number} increment - How much to increment usage by (default 1)
 * @returns {Function} Express middleware function
 */
function checkUsageLimit(limitType, increment = 1) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userPlan = user.subscription?.plan || 'free';
      const currentUsage = user.usage?.[limitType] || 0;
      const newUsage = currentUsage + increment;
      
      const isWithinLimit = PlanManager.isWithinLimit(userPlan, limitType, newUsage);
      
      if (!isWithinLimit) {
        const limit = PlanManager.getLimit(userPlan, limitType);
        const nextPlan = PlanManager.getNextPlan(userPlan);
        
        return res.status(429).json({
          error: `Usage limit exceeded for ${limitType}`,
          code: 'USAGE_LIMIT_EXCEEDED',
          currentPlan: userPlan,
          currentUsage,
          limit,
          limitType,
          suggestedUpgrade: nextPlan,
          upgradeUrl: '/pricing'
        });
      }

      // Store the increment for potential usage tracking
      req.usageIncrement = { [limitType]: increment };
      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      res.status(500).json({ 
        error: 'Usage limit check failed',
        code: 'LIMIT_CHECK_ERROR'
      });
    }
  };
}

/**
 * Middleware to increment usage after successful operation
 * Must be used after checkUsageLimit
 * @param {Object} DatabaseService - Database service instance
 * @returns {Function} Express middleware function
 */
function incrementUsage(DatabaseService) {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Only increment if the response was successful
      if (res.statusCode < 400 && req.usageIncrement && req.user) {
        // Increment usage in background (don't wait for it)
        setImmediate(async () => {
          try {
            for (const [limitType, increment] of Object.entries(req.usageIncrement)) {
              await DatabaseService.incrementUserUsage(req.user._id, limitType, increment);
            }
          } catch (error) {
            console.error('Error incrementing usage:', error);
          }
        });
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * Middleware to validate plan access for premium endpoints
 * @param {string|string[]} allowedPlans - Plan(s) that have access to this endpoint
 * @returns {Function} Express middleware function
 */
function requirePlan(allowedPlans) {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userPlan = user.subscription?.plan || 'free';
      const plansArray = Array.isArray(allowedPlans) ? allowedPlans : [allowedPlans];
      
      if (!plansArray.includes(userPlan)) {
        const hierarchy = PlanManager.getPlanHierarchy();
        const suggestedPlan = plansArray.find(plan => 
          PlanManager.canUpgradeTo(userPlan, plan)
        ) || plansArray[0];
        
        return res.status(403).json({
          error: `This endpoint requires a ${plansArray.join(' or ')} plan subscription`,
          code: 'PLAN_REQUIRED',
          currentPlan: userPlan,
          requiredPlans: plansArray,
          suggestedUpgrade: suggestedPlan,
          upgradeUrl: '/pricing'
        });
      }

      next();
    } catch (error) {
      console.error('Plan access control error:', error);
      res.status(500).json({ 
        error: 'Plan access check failed',
        code: 'PLAN_CHECK_ERROR'
      });
    }
  };
}

/**
 * Middleware to add plan information to response
 * Useful for endpoints that need to return plan-specific data
 */
function enrichWithPlanInfo(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (req.user && data) {
      const userPlan = req.user.subscription?.plan || 'free';
      const planDetails = PlanManager.getPlanDetails(userPlan);
      
      // Add plan context to response
      if (typeof data === 'object' && !Array.isArray(data)) {
        data.planContext = {
          currentPlan: userPlan,
          planName: planDetails.name,
          limits: planDetails.limits,
          features: planDetails.features,
          canUpgrade: !!PlanManager.getNextPlan(userPlan)
        };
      }
    }
    
    originalJson.call(this, data);
  };
  
  next();
}

/**
 * Helper function to get usage summary for a user
 * @param {Object} user - User object
 * @returns {Object} Usage summary with percentages and warnings
 */
function getUsageSummary(user) {
  const userPlan = user.subscription?.plan || 'free';
  const planDetails = PlanManager.getPlanDetails(userPlan);
  const usage = user.usage || {};
  
  const summary = {
    plan: userPlan,
    planName: planDetails.name,
    usage: {},
    warnings: [],
    isNearLimit: false,
    isOverLimit: false
  };
  
  // Calculate usage percentages for each limit
  for (const [limitType, limit] of Object.entries(planDetails.limits)) {
    const currentUsage = usage[limitType] || 0;
    const percentage = PlanManager.calculateUsagePercentage(userPlan, limitType, currentUsage);
    const isWithinLimit = PlanManager.isWithinLimit(userPlan, limitType, currentUsage);
    
    summary.usage[limitType] = {
      current: currentUsage,
      limit,
      percentage: Math.round(percentage),
      isWithinLimit,
      isUnlimited: limit === 'unlimited'
    };
    
    // Generate warnings
    if (limit !== 'unlimited') {
      if (percentage >= 90) {
        summary.warnings.push({
          type: 'critical',
          limitType,
          message: `You've used ${Math.round(percentage)}% of your ${limitType} limit`
        });
        summary.isOverLimit = true;
      } else if (percentage >= 75) {
        summary.warnings.push({
          type: 'warning',
          limitType,
          message: `You've used ${Math.round(percentage)}% of your ${limitType} limit`
        });
        summary.isNearLimit = true;
      }
    }
  }
  
  return summary;
}

module.exports = {
  requireFeature,
  checkUsageLimit,
  incrementUsage,
  requirePlan,
  enrichWithPlanInfo,
  getUsageSummary
};
