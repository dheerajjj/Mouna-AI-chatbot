// Centralized Plan Features Configuration
// This defines all plan limits, features, and pricing in one place

const PLAN_FEATURES = {
  free: {
    name: 'Free Plan',
    price: 0,
    currency: 'INR',
    billingCycle: 'monthly',
    limits: {
      messagesPerMonth: 100,
      apiCallsPerMonth: 100,
      customResponses: 5,
      knowledgeBaseEntries: 10,
      widgetCustomizations: 1,
      maxFileUploads: 1,
      maxFileSizeMB: 1
    },
    features: {
      basicChatbot: true,
      basicAnalytics: false,
      advancedAnalytics: false,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
      customPrompts: false,
      multiLanguageSupport: false,
      webhooks: false,
      exportData: false,
      whiteLabeling: false,
      advancedIntegrations: false,
      customCSS: false,
      removeMonuaBranding: false,
      bookings: false
    },
    restrictions: {
      maxConcurrentChats: 1,
      responseTimeMinutes: 5,
      supportLevel: 'community'
    },
    ui: {
      badgeText: 'FREE',
      badgeColor: '#64748b',
      upgradePrompt: 'Upgrade to unlock more features!'
    }
  },
  
  starter: {
    name: 'Starter Plan',
    price: 499,
    currency: 'INR',
    billingCycle: 'monthly',
    limits: {
      messagesPerMonth: 1000,
      apiCallsPerMonth: 1000,
      customResponses: 50,
      knowledgeBaseEntries: 100,
      widgetCustomizations: 3,
      maxFileUploads: 5,
      maxFileSizeMB: 5
    },
    features: {
      basicChatbot: true,
      basicAnalytics: true,
      advancedAnalytics: false,
      customBranding: true,
      apiAccess: false,
      prioritySupport: false,
      customPrompts: true,
      multiLanguageSupport: false,
      webhooks: false,
      exportData: true,
      whiteLabeling: false,
      advancedIntegrations: false,
      customCSS: true,
      removeMonuaBranding: true,
      logoGallery: true,
      logoUpload: false,
      bookings: true
    },
    restrictions: {
      maxConcurrentChats: 3,
      responseTimeMinutes: 2,
      supportLevel: 'email'
    },
    ui: {
      badgeText: 'STARTER',
      badgeColor: '#10b981',
      upgradePrompt: 'Upgrade to Professional for advanced features!'
    }
  },
  
  professional: {
    name: 'Professional Plan',
    price: 1499,
    currency: 'INR',
    billingCycle: 'monthly',
    limits: {
      messagesPerMonth: 5000,
      apiCallsPerMonth: 10000,
      customResponses: 200,
      knowledgeBaseEntries: 500,
      widgetCustomizations: 10,
      maxFileUploads: 20,
      maxFileSizeMB: 10
    },
    features: {
      basicChatbot: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
      customPrompts: true,
      multiLanguageSupport: true,
      webhooks: true,
      exportData: true,
      whiteLabeling: true,
      advancedIntegrations: true,
      customCSS: true,
      removeMonuaBranding: true,
      logoGallery: true,
      logoUpload: true,
      bookings: true
    },
    restrictions: {
      maxConcurrentChats: 10,
      responseTimeMinutes: 1,
      supportLevel: 'priority'
    },
    ui: {
      badgeText: 'PROFESSIONAL',
      badgeColor: '#3b82f6',
      upgradePrompt: 'You have access to all features!'
    }
  },
  
  enterprise: {
    name: 'Enterprise Plan',
    price: 2999,
    currency: 'INR',
    billingCycle: 'monthly',
    limits: {
      messagesPerMonth: 'unlimited',
      apiCallsPerMonth: 'unlimited',
      customResponses: 'unlimited',
      knowledgeBaseEntries: 'unlimited',
      widgetCustomizations: 'unlimited',
      maxFileUploads: 'unlimited',
      maxFileSizeMB: 100
    },
    features: {
      basicChatbot: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
      customPrompts: true,
      multiLanguageSupport: true,
      webhooks: true,
      exportData: true,
      whiteLabeling: true,
      advancedIntegrations: true,
      customCSS: true,
      removeMonuaBranding: true,
      logoGallery: true,
      logoUpload: true,
      bookings: true
    },
    restrictions: {
      maxConcurrentChats: 'unlimited',
      responseTimeMinutes: 0.5,
      supportLevel: 'dedicated'
    },
    ui: {
      badgeText: 'ENTERPRISE',
      badgeColor: '#f59e0b',
      upgradePrompt: 'You have access to all enterprise features!'
    }
  }
};

// Helper functions for plan management
class PlanManager {
  static getPlanDetails(planId) {
    return PLAN_FEATURES[planId] || PLAN_FEATURES.free;
  }
  
  static getAllPlans() {
    return PLAN_FEATURES;
  }
  
  static getPlanList() {
    return Object.keys(PLAN_FEATURES);
  }
  
  static hasFeature(planId, featureName) {
    const plan = this.getPlanDetails(planId);
    return plan.features[featureName] || false;
  }
  
  static getLimit(planId, limitName) {
    const plan = this.getPlanDetails(planId);
    return plan.limits[limitName] || 0;
  }
  
  static isWithinLimit(planId, limitName, currentUsage) {
    const limit = this.getLimit(planId, limitName);
    if (limit === 'unlimited') return true;
    return currentUsage < limit;
  }
  
  static calculateUsagePercentage(planId, limitName, currentUsage) {
    const limit = this.getLimit(planId, limitName);
    if (limit === 'unlimited') return 0;
    return Math.min((currentUsage / limit) * 100, 100);
  }
  
  static getPlanHierarchy() {
    return ['free', 'starter', 'professional', 'enterprise'];
  }
  
  static canUpgradeTo(currentPlan, targetPlan) {
    const hierarchy = this.getPlanHierarchy();
    const currentIndex = hierarchy.indexOf(currentPlan);
    const targetIndex = hierarchy.indexOf(targetPlan);
    return targetIndex > currentIndex;
  }
  
  static getNextPlan(currentPlan) {
    const hierarchy = this.getPlanHierarchy();
    const currentIndex = hierarchy.indexOf(currentPlan);
    if (currentIndex < hierarchy.length - 1) {
      return hierarchy[currentIndex + 1];
    }
    return null;
  }
  
  static formatPrice(planId) {
    const plan = this.getPlanDetails(planId);
    if (plan.price === 0) return 'Free';
    return `₹${plan.price}/${plan.billingCycle}`;
  }
  
  static getPricingForCheckout(planId) {
    const plan = this.getPlanDetails(planId);
    return {
      amount: plan.price * 100, // Convert to paise for Razorpay
      currency: plan.currency,
      name: plan.name,
      description: `${plan.name} - ${plan.limits.messagesPerMonth} messages/month`
    };
  }
}

// Export for use in both frontend and backend
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment (backend)
  module.exports = {
    PLAN_FEATURES,
    PlanManager
  };
} else {
  // Browser environment (frontend)
  window.PLAN_FEATURES = PLAN_FEATURES;
  window.PlanManager = PlanManager;
}
