const { USAGE_LIMITS } = require('../config/pricing');

/**
 * Middleware to check if user can create more tenants based on their subscription plan
 */
const canCreateTenant = async (req, res, next) => {
  try {
    console.log('🔍 [canCreateTenant] Starting validation...');
    console.log('🔍 [canCreateTenant] Request user object:', req.user);
    
    const userId = req.user.userId;
    console.log('🔍 [canCreateTenant] User ID:', userId);
    
    if (!userId) {
      console.log('❌ [canCreateTenant] No user ID found');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user from database
    const DatabaseService = require('../services/DatabaseService');
    console.log('🔍 [canCreateTenant] Fetching user from database...');
    const user = await DatabaseService.findUserById(userId);
    console.log('🔍 [canCreateTenant] Fetched user:', user ? 'Found' : 'Not found');
    
    if (!user) {
      console.log('❌ [canCreateTenant] User not found in database');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('🔍 [canCreateTenant] User subscription:', user.subscription);
    const currentPlan = user.subscription?.plan || 'free';
    console.log('🔍 [canCreateTenant] Current plan:', currentPlan);
    
    const limits = USAGE_LIMITS[currentPlan];
    console.log('🔍 [canCreateTenant] Plan limits:', limits);
    
    // Check if plan supports additional tenants
    if (limits.personalTenantOnly) {
      console.log('❌ [canCreateTenant] Plan only supports personal tenant');
      return res.status(403).json({
        success: false,
        message: 'Your current plan only supports personal tenant. Upgrade to Professional or Enterprise to manage client tenants.',
        upgradeRequired: true,
        currentPlan: currentPlan,
        suggestedPlans: ['professional', 'enterprise']
      });
    }
    
    // Get current tenant count from database
    const TenantSettings = require('../models/TenantSettings');
    console.log('🔍 [canCreateTenant] Counting existing tenants for user...');
    const currentTenantCount = await TenantSettings.countDocuments({ 
      userId: user._id, 
      status: { $ne: 'suspended' }
    });
    console.log('🔍 [canCreateTenant] Current tenant count:', currentTenantCount);
    console.log('🔍 [canCreateTenant] Max tenants allowed:', limits.tenants);
    
    // Check if user has reached tenant limit
    if (limits.tenants !== 'unlimited' && currentTenantCount >= limits.tenants) {
      console.log('❌ [canCreateTenant] Tenant limit reached');
      return res.status(403).json({
        success: false,
        message: `You have reached your tenant limit of ${limits.tenants}. Upgrade to create more client tenants.`,
        upgradeRequired: true,
        currentPlan: currentPlan,
        currentTenants: currentTenantCount,
        maxTenants: limits.tenants,
        suggestedPlans: currentPlan === 'professional' ? ['enterprise'] : ['professional', 'enterprise']
      });
    }
    
    console.log('✅ [canCreateTenant] Validation passed, allowing tenant creation');
    // Add user object to request for use in route
    req.user = user;
    
    next();
  } catch (error) {
    console.error('❌ [canCreateTenant] Subscription validation error:', error);
    console.error('❌ [canCreateTenant] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during subscription validation',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user can access tenant features based on their plan
 */
const canAccessTenantFeature = (featureName) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const limits = USAGE_LIMITS[user.subscription.plan];
      
      // Define feature requirements
      const featureRequirements = {
        'whiteLabel': {
          requiredPlans: ['professional', 'enterprise'],
          feature: 'whiteLabel'
        },
        'customDomain': {
          requiredPlans: ['enterprise'],
          feature: 'customDomain'
        },
        'dedicatedBilling': {
          requiredPlans: ['enterprise'],
          feature: 'dedicatedBilling'
        },
        'rolesPermissions': {
          requiredPlans: ['enterprise'],
          feature: 'rolesPermissions'
        }
      };
      
      const requirement = featureRequirements[featureName];
      if (!requirement) {
        return next(); // Feature doesn't have restrictions
      }
      
      if (!requirement.requiredPlans.includes(user.subscription.plan)) {
        return res.status(403).json({
          success: false,
          message: `This feature requires ${requirement.requiredPlans.join(' or ')} plan.`,
          upgradeRequired: true,
          currentPlan: user.subscription.plan,
          requiredPlans: requirement.requiredPlans,
          feature: featureName
        });
      }
      
      // Check if plan has the specific feature
      if (requirement.feature && !limits[requirement.feature]) {
        return res.status(403).json({
          success: false,
          message: `This feature is not available in your current plan.`,
          upgradeRequired: true,
          currentPlan: user.subscription.plan,
          requiredPlans: requirement.requiredPlans,
          feature: featureName
        });
      }
      
      next();
    } catch (error) {
      console.error('Feature access validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during feature validation'
      });
    }
  };
};

/**
 * Get user's subscription limits and current usage
 */
const getSubscriptionInfo = (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const limits = USAGE_LIMITS[user.subscription.plan];
    
    req.subscriptionInfo = {
      plan: user.subscription.plan,
      limits: limits,
      usage: {
        currentTenants: user.tenantLimits.currentTenants,
        maxTenants: limits.tenants,
        messagesThisMonth: user.usage.messagesThisMonth,
        maxMessages: limits.messagesPerMonth
      },
      features: {
        canCreateTenants: !limits.personalTenantOnly && (limits.tenants === 'unlimited' || user.tenantLimits.currentTenants < limits.tenants),
        whiteLabel: limits.whiteLabel || false,
        customDomain: limits.customDomain || false,
        dedicatedBilling: limits.dedicatedBilling || false,
        rolesPermissions: limits.rolesPermissions || false
      }
    };
    
    next();
  } catch (error) {
    console.error('Subscription info error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error getting subscription info'
    });
  }
};

/**
 * Middleware to ensure user has a personal tenant (backward compatibility)
 */
const ensurePersonalTenant = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Get or create personal tenant
    const personalTenant = await user.getPersonalTenant();
    req.personalTenant = personalTenant;
    
    next();
  } catch (error) {
    console.error('Personal tenant creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error ensuring personal tenant exists'
    });
  }
};

/**
 * Get plan upgrade suggestions
 */
const getUpgradeSuggestions = (currentPlan, desiredFeature) => {
  const planHierarchy = ['free', 'starter', 'professional', 'enterprise'];
  const currentIndex = planHierarchy.indexOf(currentPlan);
  
  const featureToPlans = {
    'tenants': ['professional', 'enterprise'],
    'whiteLabel': ['professional', 'enterprise'],
    'customDomain': ['enterprise'],
    'dedicatedBilling': ['enterprise'],
    'rolesPermissions': ['enterprise']
  };
  
  const requiredPlans = featureToPlans[desiredFeature] || [];
  return requiredPlans.filter(plan => {
    const planIndex = planHierarchy.indexOf(plan);
    return planIndex > currentIndex;
  });
};

module.exports = {
  canCreateTenant,
  canAccessTenantFeature,
  getSubscriptionInfo,
  ensurePersonalTenant,
  getUpgradeSuggestions
};
