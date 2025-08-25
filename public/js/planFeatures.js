// Frontend Plan Features Configuration
// This mirrors the backend plan configuration for consistent UI behavior

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
      removeMonuaBranding: false
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
      apiAccess: true,
      prioritySupport: false,
      customPrompts: true,
      multiLanguageSupport: false,
      webhooks: false,
      exportData: true,
      whiteLabeling: false,
      advancedIntegrations: false,
      customCSS: true,
      removeMonuaBranding: true
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
      messagesPerMonth: 3000,
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
      removeMonuaBranding: true
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
    price: 4999,
    currency: 'INR',
    billingCycle: 'monthly',
    limits: {
      messagesPerMonth: 15000,
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
      removeMonuaBranding: true
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

// Frontend Plan Manager Class
class FrontendPlanManager {
  static getPlanDetails(planId) {
    return PLAN_FEATURES[planId] || PLAN_FEATURES.free;
  }
  
  static getAllPlans() {
    return PLAN_FEATURES;
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
  
  static getNextPlan(currentPlan) {
    const hierarchy = ['free', 'starter', 'professional', 'enterprise'];
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
  
  static getUpgradeSuggestion(currentPlan) {
    return this.getNextPlan(currentPlan) || 'professional';
  }
}

// Feature Gate Helper Functions
class FeatureGate {
  static checkAccess(userPlan, featureName) {
    return FrontendPlanManager.hasFeature(userPlan, featureName);
  }
  
  static showUpgradePrompt(currentPlan, requiredFeature) {
    const nextPlan = FrontendPlanManager.getNextPlan(currentPlan);
    if (!nextPlan) return null;
    
    const nextPlanDetails = FrontendPlanManager.getPlanDetails(nextPlan);
    if (nextPlanDetails.features[requiredFeature]) {
      return {
        message: `Upgrade to ${nextPlanDetails.name} to access this feature`,
        planName: nextPlanDetails.name,
        planId: nextPlan,
        upgradeUrl: `/pricing?suggested=${nextPlan}`
      };
    }
    
    // Check other plans
    const allPlans = Object.keys(PLAN_FEATURES);
    for (const planId of allPlans) {
      const planDetails = FrontendPlanManager.getPlanDetails(planId);
      if (planDetails.features[requiredFeature] && planId !== currentPlan) {
        return {
          message: `Upgrade to ${planDetails.name} to access this feature`,
          planName: planDetails.name,
          planId: planId,
          upgradeUrl: `/pricing?suggested=${planId}`
        };
      }
    }
    
    return null;
  }
  
  static hideElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = 'none';
    }
  }
  
  static showElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = '';
    }
  }
  
  static disableElement(selector, message = 'Upgrade required') {
    const element = document.querySelector(selector);
    if (element) {
      element.disabled = true;
      element.title = message;
      element.style.opacity = '0.5';
      element.style.cursor = 'not-allowed';
    }
  }
  
  static enableElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.disabled = false;
      element.title = '';
      element.style.opacity = '1';
      element.style.cursor = '';
    }
  }
  
  static addUpgradeOverlay(selector, upgradePrompt) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'feature-gate-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10;
      border-radius: inherit;
      cursor: pointer;
    `;
    
    overlay.innerHTML = `
      <div style="text-align: center; padding: 1rem;">
        <i class="fas fa-lock" style="font-size: 2rem; color: #64748b; margin-bottom: 0.5rem;"></i>
        <h3 style="margin: 0 0 0.5rem 0; color: #1e293b;">${upgradePrompt.planName} Feature</h3>
        <p style="margin: 0 0 1rem 0; color: #64748b;">${upgradePrompt.message}</p>
        <a href="${upgradePrompt.upgradeUrl}" class="btn" style="font-size: 0.9rem;">Upgrade Now</a>
      </div>
    `;
    
    // Make parent element relative if not already positioned
    if (getComputedStyle(element).position === 'static') {
      element.style.position = 'relative';
    }
    
    element.appendChild(overlay);
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.PLAN_FEATURES = PLAN_FEATURES;
  window.FrontendPlanManager = FrontendPlanManager;
  window.FeatureGate = FeatureGate;
}
