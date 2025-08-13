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
    price: 299,
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
    popular: true,
    stripeProductId: 'prod_starter_india', // Will be created in Stripe
    stripePriceId: 'price_starter_monthly_india'
  },
  
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 999,
    currency: 'INR',
    interval: 'month',
    features: {
      monthlyMessages: 5000,
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
    popular: false,
    stripeProductId: 'prod_professional_india',
    stripePriceId: 'price_professional_monthly_india'
  },
  
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 2999,
    currency: 'INR',
    interval: 'month',
    features: {
      monthlyMessages: 25000,
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
    popular: false,
    stripeProductId: 'prod_enterprise_india',
    stripePriceId: 'price_enterprise_monthly_india'
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
      'Advanced AI responses',
      'Custom branding',
      'Basic analytics',
      'Dashboard access'
    ],
    description: 'Great for small businesses and startups',
    popular: true,
    stripeProductId: 'prod_starter_india',
    stripePriceId: 'price_starter_monthly_india'
  },
  
  professional: {
    id: 'professional',
    name: 'Professional',
    subtitle: 'For growing businesses',
    price: 1499,
    currency: 'INR',
    interval: 'month',
    icon: '🏢',
    features: {
      monthlyMessages: 10000,
      websites: 10,
      customization: 'advanced',
      analytics: 'advanced',
      dashboard: true,
      branding: 'removable',
      apiAccess: true
    },
    featureList: [
      '10,000 messages/month',
      'Advanced AI responses',
      'Custom branding',
      'Advanced analytics',
      'API access',
      'Multiple websites'
    ],
    description: 'Perfect for growing businesses',
    popular: false,
    stripeProductId: 'prod_professional_india',
    stripePriceId: 'price_professional_monthly_india'
  }
};


// Feature limits and descriptions
const FEATURE_DESCRIPTIONS = {
  monthlyMessages: 'Number of AI chat messages per month',
  websites: 'Number of websites you can add the widget to',
  customization: 'Customize colors, position, and messages',
  analytics: 'Conversation analytics and insights',
  support: 'Customer support level',
  branding: 'Remove or customize "Powered by" branding',
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
    dashboard: false
  },
  starter: {
    messagesPerMonth: 1000,
    overageRate: 0.50, // ₹0.50 per extra message
    maxOverageMessages: 500,
    websites: 2,
    analytics: true,
    dashboard: true
  },
  professional: {
    messagesPerMonth: 10000,
    overageRate: 0.30, // ₹0.30 per extra message
    maxOverageMessages: 2000,
    websites: 10,
    analytics: true,
    dashboard: true,
    apiAccess: true
  }
};


module.exports = {
  CURRENCY_CONFIG,
  BASE_PRICING_PLANS,
  PRICING_PLANS,
  FEATURE_DESCRIPTIONS,
  USAGE_LIMITS
};
