const express = require('express');
const router = express.Router();

// Demo tenant configurations for preview system
const DEMO_TENANT_CONFIGS = {
  demo_restaurant_tenant: {
    name: 'Bella Vista Restaurant',
    type: 'restaurant',
    primaryColor: '#f59e0b',
    welcomeMessage: 'Welcome to Bella Vista! 🍽️ I can help you make reservations, browse our menu, or answer questions about our authentic Italian cuisine. How can I assist you today?',
    enabledFeatures: {
      bookings: true,
      orders: true,
      slots: true,
      analytics: true
    },
    businessInfo: {
      hours: 'Tuesday-Sunday 5pm-10pm, closed Mondays',
      cuisine: 'Authentic Italian cuisine with fresh pasta made daily',
      specialties: ['Osso Buco', 'Homemade Ravioli', 'Wood-fired Pizza', 'Tiramisu'],
      location: 'Located in the historic downtown district',
      phoneReservations: '(555) 123-4567'
    },
    autoResponses: [
      {
        keywords: ['reservation', 'book', 'table', 'booking'],
        response: "I'd love to help you make a reservation! 📋 \n\nFor tonight, I can check availability for:\n• 6:00 PM - 2 tables available\n• 7:00 PM - 3 tables available  \n• 8:00 PM - 1 table available\n\nHow many guests will be joining you, and what time would you prefer?"
      },
      {
        keywords: ['menu', 'food', 'specials', 'dishes'],
        response: "Tonight's menu highlights include: 🍝\n\n**Chef's Specials:**\n• Osso Buco with Risotto Milanese - $32\n• Fresh Lobster Ravioli in Sage Butter - $28\n• Grilled Branzino with Lemon Herbs - $26\n\n**Popular Dishes:**\n• Homemade Pappardelle Bolognese - $22\n• Margherita Pizza (wood-fired) - $18\n• Chicken Parmigiana - $24\n\nWould you like me to tell you more about any dish or check for dietary restrictions?"
      },
      {
        keywords: ['hours', 'open', 'closed', 'time'],
        response: "Our restaurant hours are:\n• Tuesday - Sunday: 5:00 PM - 10:00 PM\n• Closed Mondays\n\nKitchen closes at 9:30 PM. We're currently accepting reservations for tonight! Would you like to book a table?"
      }
    ]
  },
  
  demo_clinic_tenant: {
    name: 'City Medical Clinic',
    type: 'clinic',
    primaryColor: '#10b981',
    welcomeMessage: 'Welcome to City Medical Clinic! 🏥 I can help you schedule appointments, provide information about our services, and answer questions about your healthcare needs. How may I assist you?',
    enabledFeatures: {
      bookings: true,
      slots: true,
      analytics: true
    },
    businessInfo: {
      hours: 'Monday-Friday 8am-6pm, Saturday 9am-2pm',
      services: ['General Medicine', 'Cardiology', 'Dermatology', 'Pediatrics'],
      doctors: ['Dr. Sarah Smith - Internal Medicine', 'Dr. Michael Johnson - Cardiology', 'Dr. Lisa Chen - Dermatology'],
      insurance: ['Blue Cross Blue Shield', 'Aetna', 'United Healthcare', 'Cigna', 'Medicare/Medicaid'],
      locations: ['Downtown Clinic', 'Westside Branch']
    },
    autoResponses: [
      {
        keywords: ['appointment', 'schedule', 'booking', 'doctor'],
        response: "I'd be happy to help you schedule an appointment! 👩‍⚕️\n\n**Available Doctors:**\n• Dr. Sarah Smith (Internal Medicine) - Next available: Tomorrow 10:30 AM\n• Dr. Michael Johnson (Cardiology) - Next available: Thursday 2:15 PM\n• Dr. Lisa Chen (Dermatology) - Next available: Friday 9:00 AM\n\nWhich doctor would you prefer, and what type of appointment do you need?"
      },
      {
        keywords: ['insurance', 'coverage', 'accept'],
        response: "We accept most major insurance plans including:\n✅ Blue Cross Blue Shield\n✅ Aetna\n✅ United Healthcare\n✅ Cigna\n✅ Medicare/Medicaid\n\nTo verify your specific coverage, please provide your insurance company name and I can check if we're in-network. Would you also like me to help schedule an appointment?"
      },
      {
        keywords: ['hours', 'open', 'closed', 'time'],
        response: "Our clinic hours are:\n• Monday - Friday: 8:00 AM - 6:00 PM\n• Saturday: 9:00 AM - 2:00 PM\n• Sunday: Closed\n\nWe're currently open and accepting appointments. Would you like me to help schedule a visit?"
      }
    ]
  },

  demo_ecommerce_tenant: {
    name: 'TechStore Pro',
    type: 'ecommerce',
    primaryColor: '#8b5cf6',
    welcomeMessage: 'Welcome to TechStore Pro! 🛍️ I can help you track orders, find products, process returns, and provide technical support. What can I help you with today?',
    enabledFeatures: {
      orders: true,
      analytics: true
    },
    businessInfo: {
      categories: ['Laptops', 'Smartphones', 'Accessories', 'Gaming', 'Audio'],
      shipping: 'Free shipping on orders over $50',
      returns: '30-day return policy',
      support: '24/7 technical support available'
    },
    autoResponses: [
      {
        keywords: ['order', 'tracking', 'shipped', 'delivery'],
        response: "Let me help you track your order! 📦\n\n**Sample Order Status:**\n• Order #12345: **In Transit** - Expected delivery tomorrow by 6 PM\n• Order #67890: **Preparing to Ship** - Will ship today\n\n🚚 **Tracking Details:**\n• Current location: Out for delivery in your city\n• Tracking number: UPS1234567890\n• You'll receive SMS updates\n\nPlease provide your order number and I'll get the exact status for you!"
      },
      {
        keywords: ['return', 'refund', 'exchange'],
        response: "I can help you with returns and refunds! 🔄\n\n**Return Process:**\n1️⃣ Verify your order details\n2️⃣ Check 30-day return window\n3️⃣ Generate prepaid return label\n4️⃣ Package and ship back\n\n**What You'll Need:**\n• Order number or email address\n• Reason for return\n• Original packaging (preferred)\n\nWhat would you like to return today?"
      },
      {
        keywords: ['product', 'search', 'laptop', 'phone', 'tech'],
        response: "I can help you find the perfect tech product! 💻📱\n\n**Popular Categories:**\n• **Laptops** - MacBooks, Gaming, Business\n• **Smartphones** - iPhone, Samsung, Google\n• **Audio** - AirPods, Headphones, Speakers\n• **Gaming** - Consoles, Accessories, Games\n\nWhat type of product are you looking for? I can provide recommendations based on your needs and budget!"
      }
    ]
  },

  demo_service_tenant: {
    name: 'Digital Solutions Agency',
    type: 'service',
    primaryColor: '#06b6d4',
    welcomeMessage: 'Welcome to Digital Solutions Agency! 💼 I can help you learn about our services, get project quotes, and connect you with our team. How can I help grow your business?',
    enabledFeatures: {
      analytics: true
    },
    businessInfo: {
      services: ['Website Development', 'Logo Design', 'Digital Marketing', 'Mobile Apps'],
      portfolio: ['MedCare Clinic', 'Tony\'s Pizza', 'Law Firm Site'],
      pricing: {
        starter: '$2,500 - $4,000',
        professional: '$4,000 - $8,000',
        enterprise: '$8,000+'
      }
    },
    autoResponses: [
      {
        keywords: ['website', 'web', 'development', 'pricing', 'cost'],
        response: "I'd love to help you with a website! 🌐\n\n**Our Website Packages:**\n💼 **Starter** (5 pages): $2,500 - $4,000\n🚀 **Professional** (10+ pages): $4,000 - $8,000\n⚡ **Enterprise** (custom): $8,000+\n\n**Quick Questions for Accurate Quote:**\n• What type of business?\n• How many pages needed?\n• E-commerce functionality?\n• Special features required?\n\nWould you like me to schedule a free consultation to discuss your project?"
      },
      {
        keywords: ['portfolio', 'examples', 'work', 'projects'],
        response: "Here are some of our recent success stories! 🎨\n\n**Featured Projects:**\n\n🏥 **MedCare Clinic Website**\n• Patient portal & appointment booking\n• 300% increase in online appointments\n• [View Case Study]\n\n🍕 **Tony's Pizza Online Ordering**\n• Custom ordering system & tracking\n• $50K additional monthly revenue\n• [View Live Site]\n\n💼 **Law Firm Professional Site**\n• Client portal & document management\n• 200% increase in consultation requests\n\nWould you like to see more examples in your industry?"
      },
      {
        keywords: ['services', 'design', 'marketing', 'logo'],
        response: "We offer comprehensive digital solutions: 🚀\n\n**Our Services:**\n• **Website Development** - Custom, responsive sites\n• **Logo & Branding** - Complete brand identity\n• **Digital Marketing** - SEO, social media, ads\n• **Mobile Apps** - iOS and Android development\n• **E-commerce** - Online stores and payment integration\n\nWhich service interests you most? I can provide detailed information and pricing!"
      }
    ]
  }
};

// GET demo tenant configuration
router.get('/config/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  
  console.log(`[DEMO] Loading demo tenant config for: ${tenantId}`);
  
  const config = DEMO_TENANT_CONFIGS[tenantId];
  
  if (!config) {
    console.log(`[DEMO] Demo tenant not found: ${tenantId}`);
    return res.status(404).json({
      error: 'Demo tenant configuration not found',
      tenantId,
      fallbackConfig: {
        enabledFeatures: {
          bookings: false,
          orders: false,
          slots: false,
          analytics: false
        }
      }
    });
  }
  
  console.log(`[DEMO] ✅ Demo tenant config loaded for: ${config.name}`);
  
  res.json({
    success: true,
    config: {
      tenantId,
      name: config.name,
      type: config.type,
      primaryColor: config.primaryColor,
      welcomeMessage: config.welcomeMessage,
      enabledFeatures: config.enabledFeatures,
      autoResponses: config.autoResponses,
      businessInfo: config.businessInfo
    },
    // Mock subscription info for demo
    ownerSubscription: {
      plan: 'professional', // Enable white-labeling for demo
      status: 'active'
    }
  });
});

// GET all demo tenant types
router.get('/types', (req, res) => {
  const types = Object.keys(DEMO_TENANT_CONFIGS).map(key => {
    const config = DEMO_TENANT_CONFIGS[key];
    return {
      id: key,
      name: config.name,
      type: config.type,
      primaryColor: config.primaryColor,
      description: `Demo ${config.type} chatbot with specialized features`
    };
  });
  
  res.json({
    success: true,
    demoTypes: types
  });
});

module.exports = router;
