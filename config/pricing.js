// INR pricing configuration
const CURRENCY_CONFIG = {
  'INR': {
    symbol: '₹',
    locale: 'en-IN'
  }
};

// Base pricing in INR (will be converted to other currencies)
const BASE_PRICING_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    basePrice: 0,
    interval: 'month',
    features: {
      monthlyMessages: 100,
      websites: 1,
      customization: false,
      analytics: 'basic',
      support: 'community',
      branding: 'with_branding',
      responseTime: 'standard'
    },
    description: 'Perfect for testing and small websites',
    popular: false
  },
  
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 499,
    currency: 'INR',
    interval: 'month',
    features: {
      monthlyMessages: 1000,
      websites: 2,
      customization: true,
      analytics: 'detailed',
      support: 'email',
      branding: 'removable',
      responseTime: 'fast'
    },
    description: 'Great for small businesses and startups',
    popular: true
  },
  
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 1499,
    currency: 'INR',
    interval: 'month',
    features: {
      monthlyMessages: 3000,
      websites: 10,
      customization: true,
      analytics: 'advanced',
      support: 'priority_email',
      branding: 'white_label',
      responseTime: 'priority',
      webhooks: true,
      apiAccess: true
    },
    description: 'Perfect for growing businesses',
    popular: false
  },
  
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 4999,
    currency: 'INR',
    interval: 'month',
    features: {
      monthlyMessages: 15000,
      websites: 'unlimited',
      customization: true,
      analytics: 'enterprise',
      support: 'phone_priority',
      branding: 'white_label',
      responseTime: 'immediate',
      webhooks: true,
      apiAccess: true,
      customIntegrations: true,
      sla: '99.9%'
    },
    description: 'For large enterprises with high volume',
    popular: false
  }
};

// Simplified Pricing Plans Structure - INR Based (Automated, no customer support)
const PRICING_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    subtitle: 'For testing and demo purposes',
    price: 0,
    currency: 'INR',
    interval: 'month',
    icon: '💡',
    features: {
      monthlyMessages: 100,
      websites: 1,
      customization: 'basic',
      analytics: false,
      dashboard: false,
      branding: 'with_watermark',
      apiAccess: false
    },
    featureList: [
      '100 messages/month',
      'Basic AI responses',
      'Basic widget customization (colors, position)',
      'Mouna branding watermark'
    ],
    description: 'Perfect for testing our AI chatbot',
    popular: false,
    limitations: ['Message limit enforced', 'Watermark required', 'No dashboard access']
  },
  
  starter: {
    id: 'starter',
    name: 'Starter',
    subtitle: 'For small businesses',
    price: 499,
    currency: 'INR',
    interval: 'month',
    icon: '✅',
    features: {
      monthlyMessages: 1000,
      websites: 2,
      customization: 'standard',
      analytics: 'basic',
      dashboard: true,
      branding: 'removable',
      apiAccess: true
    },
    featureList: [
      '1,000 messages/month',
      '2 websites/tenants support',
      'Advanced AI responses',
      'Custom branding (colors, position)',
      'Basic analytics',
      'Dashboard access'
    ],
    description: 'Great for small businesses and startups',
    popular: true
  },
  
  professional: {
    id: 'professional',
    name: 'Professional',
    subtitle: 'For freelancers & consultants',
    price: 1499,
    currency: 'INR',
    interval: 'month',
    icon: '🏢',
    features: {
      monthlyMessages: 3000,
      websites: 10,
      customization: 'advanced',
      analytics: 'advanced',
      dashboard: true,
      branding: 'removable',
      apiAccess: true,
      tenants: 2,
      whiteLabel: 'basic'
    },
    featureList: [
      '3,000 messages/month',
      '2 client tenants maximum',
      'Basic white-label (logo/title)',
      'Advanced analytics',
      'API access',
      'Shared billing'
    ],
    description: 'Perfect for freelancers and small agencies',
    popular: true
  },
  
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'For agencies & large organizations',
    price: 4999,
    currency: 'INR',
    interval: 'month',
    icon: '🚀',
    features: {
      monthlyMessages: 15000,
      websites: 'unlimited',
      customization: 'enterprise',
      analytics: 'enterprise',
      dashboard: true,
      branding: 'white_label',
      apiAccess: true,
      tenants: 'unlimited',
      whiteLabel: 'full',
      customDomain: true,
      dedicatedBilling: true,
      rolesPermissions: true
    },
    featureList: [
      '15,000 messages/month',
      'Unlimited client tenants',
      'Full white-label (custom domain)',
      'Roles & permissions per tenant',
      'Dedicated billing & analytics',
      'Custom deployment options'
    ],
    description: 'For digital agencies and large organizations',
    popular: false
  }
};


// Feature limits and descriptions
const FEATURE_DESCRIPTIONS = {
  monthlyMessages: 'Number of AI chat messages per month',
  websites: 'Number of websites you can add the widget to',
  customization: 'Customize colors, position, and messages',
  analytics: 'Conversation analytics and insights',
  support: 'Customer support level (e.g., community, email, priority)',
  branding: 'Remove or customize the “Powered by” watermark and apply your own branding',
  dashboard: 'Access to the in-app dashboard for usage, settings, and basic analytics',
  tenants: 'Number of client tenants you can manage (personal tenant excluded unless specified)',
  responseTime: 'AI response speed priority',
  webhooks: 'Connect to external services',
  apiAccess: 'Direct API access for custom integrations',
  customIntegrations: 'Custom development and integrations',
  sla: 'Service Level Agreement uptime guarantee'
};

// Usage limits for simplified pricing structure
const USAGE_LIMITS = {
  free: {
    messagesPerMonth: 100,
    overageRate: 0, // No overages for free plan
    maxOverageMessages: 0,
    websites: 1,
    analytics: false,
    dashboard: false,
    tenants: 0, // No tenant support for free plan
    personalTenantOnly: true
  },
  starter: {
    messagesPerMonth: 1000,
    overageRate: 0.50, // ₹0.50 per extra message
    maxOverageMessages: 500,
    websites: 2,
    analytics: true,
    dashboard: true,
    tenants: 2, // Support 2 client tenants to match websites limit
    personalTenantOnly: false
  },
  professional: {
    messagesPerMonth: 3000,
    overageRate: 0.30, // ₹0.30 per extra message
    maxOverageMessages: 4000,
    websites: 10,
    analytics: true,
    dashboard: true,
    apiAccess: true,
    tenants: 2, // Up to 2 client tenants
    personalTenantOnly: false,
    whiteLabel: 'basic'
  },
  enterprise: {
    messagesPerMonth: 15000,
    overageRate: 0.20, // ₹0.20 per extra message
    maxOverageMessages: 20000,
    websites: 'unlimited',
    analytics: true,
    dashboard: true,
    apiAccess: true,
    tenants: 'unlimited', // Unlimited client tenants
    personalTenantOnly: false,
    whiteLabel: 'full',
    customDomain: true,
    dedicatedBilling: true,
    rolesPermissions: true
  }
};


// Message add-on packs (for overage top-ups)
const ADDONS = {
  messages_1k: {
    id: 'messages_1k',
    name: '1,000 extra messages',
    messages: 1000,
    price: 499, // ₹0.499/message target cost, adjust as needed
    currency: 'INR'
  },
  messages_5k: {
    id: 'messages_5k',
    name: '5,000 extra messages',
    messages: 5000,
    price: 1499, // ₹0.30/message with volume discount
    currency: 'INR'
  }
};

module.exports = {
  CURRENCY_CONFIG,
  BASE_PRICING_PLANS,
  PRICING_PLANS,
  FEATURE_DESCRIPTIONS,
  USAGE_LIMITS,
  ADDONS
};
