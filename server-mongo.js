const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

// Import services and models
const DatabaseService = require('./services/DatabaseService');
const OpenAI = require('openai');
const mongoose = require('mongoose');
const { SUPPORTED_LANGUAGES, TRANSLATIONS, LANGUAGE_DETECTION, AI_SYSTEM_PROMPTS } = require('./config/languages');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// Initialize OpenAI with error handling
let openai;
try {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY not found in environment variables');
    console.warn('Please check your .env file and ensure OPENAI_API_KEY is set');
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI client initialized successfully');
  }
} catch (error) {
  console.error('❌ Failed to initialize OpenAI client:', error.message);
  console.error('Please check your OPENAI_API_KEY in the .env file');
}

// Security and middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://checkout.razorpay.com", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3000", "https://localhost:3000", "https://mouna-ai-chatbot-production.up.railway.app", "https://api.razorpay.com"]
    }
  }
}));

// CORS configuration - Allow GitHub Pages and other legitimate domains
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:5500',
  'https://five-coat-production.up.railway.app',
  'file://',
  'null'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow GitHub Pages domains (*.github.io)
    if (origin.match(/^https:\/\/[\w-]+\.github\.io$/)) {
      return callback(null, true);
    }
    
    // Allow any HTTPS domain for widget integration (production chatbot widget use)
    if (origin.match(/^https:\/\/[\w.-]+\.[a-z]{2,}$/)) {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.match(/^https?:\/\/localhost(:[0-9]+)?$/)) {
      return callback(null, true);
    }
    
    console.log(`❌ CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files with proper MIME types and cache headers
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache for JS files
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache for CSS files
    } else if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // No cache for HTML
    } else {
      res.setHeader('Cache-Control', 'public, max-age=1800'); // 30 minutes for other files
    }
  }
}));

// Serve images from the images folder
app.use('/images', express.static('images', {
  setHeaders: (res, path) => {
    // Add proper cache headers for images
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

// Session middleware for OAuth (will be configured after DB connection)
let sessionMiddleware;

// Initialize Passport and OAuth
const passport = require('passport');
const { initializeOAuth } = require('./config/oauth');
// Initialize OAuth strategies after DatabaseService is available
let oauthInitialized = false;

app.use(passport.initialize());
app.use(passport.session());

// API Key validation middleware
async function validateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // Check if it's the test API key from environment
    if (apiKey === process.env.TEST_API_KEY) {
      // Create a mock user for the test API key
      req.user = {
        _id: new mongoose.Types.ObjectId(), // Generate a valid ObjectId
        name: 'Test User',
        email: 'test@mouna-ai.com',
        subscription: {
          plan: 'professional',
          status: 'active'
        },
        usage: {
          messagesThisMonth: 0,
          totalMessages: 0
        },
        canSendMessage: () => true // Always allow for testing
      };
      return next();
    }

    // Check regular database users
    const user = await DatabaseService.findUserByApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

// Initialize Knowledge Base Service
const KnowledgeBaseService = require('./services/KnowledgeBaseService');
const knowledgeService = new KnowledgeBaseService();
console.log('🧠 Knowledge Base Service initialized');

// Initialize database and start server
async function startServer() {
  try {
    console.log('🚀 Starting AI Chatbot Server with MongoDB integration...');
    
    // Initialize database (MongoDB with fallback to mock)
    const mongoConnected = await DatabaseService.initialize();
    const dbStatus = DatabaseService.getConnectionStatus();
    
    console.log(`📊 Database: ${dbStatus.type} (${dbStatus.status})`);
    
    // Configure session middleware with proper store
    if (mongoConnected) {
      // Use MongoDB session store for production
      const MongoStore = require('connect-mongo');
      sessionMiddleware = session({
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
          mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chatbot',
          touchAfter: 24 * 3600 // lazy session update
        }),
        cookie: { 
          secure: process.env.NODE_ENV === 'production', // HTTPS in production
          maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
        }
      });
      console.log('✅ MongoDB session store configured');
    } else {
      // Fallback to memory store (development only)
      sessionMiddleware = session({
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
      });
      console.log('⚠️ Using memory session store (development only)');
    }
    
    // Apply session middleware
    app.use(sessionMiddleware);
    
    // Initialize OAuth strategies now that DatabaseService is ready
    if (!oauthInitialized) {
        initializeOAuth(DatabaseService);
        oauthInitialized = true;
        console.log('🔐 OAuth strategies initialized');
    }
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      const status = DatabaseService.getConnectionStatus();
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: status,
        openai: !!process.env.OPENAI_API_KEY
      });
    });

    // Get Started page
    app.get('/get-started', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'get-started.html'));
    });

    // Quick Setup page
    app.get('/quick-setup', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'quick-setup.html'));
    });

    // Universal Email Verification endpoint for Get Started page
    app.post('/api/verify-email', async (req, res) => {
      try {
        const { email } = req.body;
        
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }
        
        const EmailValidationService = require('./services/EmailValidationService');
        const validation = await EmailValidationService.validateEmail(email);
        
        if (!validation.isValid) {
          return res.status(400).json({
            valid: false,
            error: validation.errors[0] || 'Invalid email address',
            suggestions: EmailValidationService.getEmailSuggestions(email)
          });
        }
        
        // Check if user already exists
        const existingUser = await DatabaseService.findUserByEmail(email);
        
        res.json({
          valid: true,
          exists: !!existingUser,
          message: existingUser 
            ? 'This email is already registered. You can sign in instead.'
            : 'Email is valid and available for registration.'
        });
        
      } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Email verification failed' });
      }
    });

    // Send OTP for Get Started signup
    app.post('/api/send-signup-otp', async (req, res) => {
      try {
        const { email } = req.body;
        
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }
        
        // Validate email first
        const EmailValidationService = require('./services/EmailValidationService');
        const validation = await EmailValidationService.validateEmail(email);
        
        if (!validation.isValid) {
          return res.status(400).json({
            error: validation.errors[0] || 'Invalid email address'
          });
        }
        
        // Check if user already exists
        const existingUser = await DatabaseService.findUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({
            error: 'Email already registered. Please sign in instead.'
          });
        }
        
        // Generate and send OTP
        const OTPService = require('./services/OTPService');
        const otp = await OTPService.generateAndStoreOTP(email, 'signup');
        
        // Send OTP email
        const EmailService = require('./services/EmailService');
        await EmailService.sendSignupOTPEmail(email, otp);
        
        res.json({
          success: true,
          message: 'OTP sent successfully to your email address'
        });
        
      } catch (error) {
        console.error('Send signup OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
      }
    });

    // Verify OTP and create account for Get Started
    app.post('/api/verify-signup-otp', async (req, res) => {
      try {
        const { email, otp, name, password } = req.body;
        
        if (!email || !otp || !name || !password) {
          return res.status(400).json({ 
            error: 'Email, OTP, name, and password are required' 
          });
        }
        
        // Verify OTP
        const OTPService = require('./services/OTPService');
        const isValidOTP = await OTPService.verifyOTP(email, otp, 'signup');
        
        if (!isValidOTP) {
          return res.status(400).json({ error: 'Invalid or expired OTP' });
        }
        
        // Check if user already exists (double-check)
        const existingUser = await DatabaseService.findUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({
            error: 'Email already registered'
          });
        }
        
        // Create new user
        const newUser = await DatabaseService.createUser({
          name,
          email,
          password,
          emailVerified: true, // Since we verified via OTP
          registrationSource: 'get-started-page'
        });
        
        // Generate auth token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          { userId: newUser._id, email: newUser.email },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '7d' }
        );
        
        res.json({
          success: true,
          message: 'Account created successfully',
          token,
          user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            apiKey: newUser.apiKey
          }
        });
        
      } catch (error) {
        console.error('Verify signup OTP error:', error);
        res.status(500).json({ error: 'Account creation failed' });
      }
    });

    // Resend OTP for Get Started signup
    app.post('/api/resend-signup-otp', async (req, res) => {
      try {
        const { email } = req.body;
        
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }
        
        // Generate and send new OTP
        const OTPService = require('./services/OTPService');
        const otp = await OTPService.generateAndStoreOTP(email, 'signup');
        
        // Send OTP email
        const EmailService = require('./services/EmailService');
        await EmailService.sendSignupOTPEmail(email, otp);
        
        res.json({
          success: true,
          message: 'New OTP sent successfully'
        });
        
      } catch (error) {
        console.error('Resend signup OTP error:', error);
        res.status(500).json({ error: 'Failed to resend OTP' });
      }
    });

    // Save chatbot settings from Quick Setup
    app.post('/api/chatbot/setup', validateApiKey, async (req, res) => {
      try {
        const userId = req.user._id;
        const { name, goal, customization } = req.body;
        
        if (!name) {
          return res.status(400).json({ error: 'Chatbot name is required' });
        }
        
        // Update user's chatbot configuration
        const updateData = {
          'chatbotConfig.name': name,
          'chatbotConfig.goal': goal || 'general',
          'chatbotConfig.customization': customization || {},
          'chatbotConfig.lastUpdated': new Date()
        };
        
        // Set default widget configuration based on goal
        const goalSettings = {
          leads: {
            welcomeMessage: `Hi! I'm ${name}. I can help you learn more about our services. What are you interested in?`,
            systemPrompt: `You are ${name}, a lead generation assistant. Your goal is to understand visitor needs and capture their interest. Be helpful, ask qualifying questions, and guide conversations toward business opportunities.`,
            primaryColor: '#10B981',
            title: name
          },
          support: {
            welcomeMessage: `Hello! I'm ${name}, your support assistant. How can I help you today?`,
            systemPrompt: `You are ${name}, a customer support assistant. Help users with questions, troubleshoot issues, and provide helpful information. Be patient, thorough, and professional.`,
            primaryColor: '#3B82F6',
            title: `${name} - Support`
          },
          bookings: {
            welcomeMessage: `Hi there! I'm ${name}. I can help you schedule an appointment or booking. What service are you interested in?`,
            systemPrompt: `You are ${name}, a booking assistant. Help users understand available services, check availability, and guide them through the booking process. Be helpful and efficient.`,
            primaryColor: '#F59E0B',
            title: `${name} - Bookings`
          },
          faq: {
            welcomeMessage: `Hello! I'm ${name}. I can answer frequently asked questions about our services. What would you like to know?`,
            systemPrompt: `You are ${name}, an FAQ assistant. Provide clear, accurate answers to common questions. If you don't know something, suggest contacting support for more specific help.`,
            primaryColor: '#8B5CF6',
            title: `${name} - FAQ`
          }
        };
        
        const settings = goalSettings[goal] || goalSettings.general || {
          welcomeMessage: `Hi! I'm ${name}. How can I help you today?`,
          systemPrompt: `You are ${name}, a helpful AI assistant. Provide helpful, accurate information and assist users with their questions.`,
          primaryColor: '#667eea',
          title: name
        };
        
        // Update widget configuration with goal-based settings
        updateData['widgetConfig.title'] = settings.title;
        updateData['widgetConfig.welcomeMessage'] = settings.welcomeMessage;
        updateData['widgetConfig.systemPrompt'] = settings.systemPrompt;
        updateData['widgetConfig.primaryColor'] = settings.primaryColor;
        
        await DatabaseService.updateUser(userId, updateData);
        
        res.json({
          success: true,
          message: 'Chatbot setup saved successfully',
          settings: {
            name,
            goal,
            ...settings
          }
        });
        
      } catch (error) {
        console.error('Chatbot setup error:', error);
        res.status(500).json({ error: 'Failed to save chatbot setup' });
      }
    });

    // Get chatbot settings
    app.get('/api/chatbot/setup', validateApiKey, async (req, res) => {
      try {
        const userId = req.user._id;
        const user = await DatabaseService.findUserById(userId);
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        const chatbotConfig = user.chatbotConfig || {};
        const widgetConfig = user.widgetConfig || {};
        
        res.json({
          success: true,
          chatbot: {
            name: chatbotConfig.name || 'AI Assistant',
            goal: chatbotConfig.goal || 'general',
            customization: chatbotConfig.customization || {},
            lastUpdated: chatbotConfig.lastUpdated
          },
          widget: {
            title: widgetConfig.title || 'AI Assistant',
            welcomeMessage: widgetConfig.welcomeMessage || 'Hello! How can I help you today?',
            primaryColor: widgetConfig.primaryColor || '#667eea',
            systemPrompt: widgetConfig.systemPrompt
          },
          user: {
            name: user.name,
            email: user.email,
            apiKey: user.apiKey
          }
        });
        
      } catch (error) {
        console.error('Get chatbot setup error:', error);
        res.status(500).json({ error: 'Failed to get chatbot setup' });
      }
    });

    // Load sample data for testing
    app.post('/api/chatbot/load-sample-data', validateApiKey, async (req, res) => {
      try {
        const userId = req.user._id;
        const { dataType } = req.body; // 'restaurant', 'tech', 'healthcare', etc.
        
        // Sample data templates
        const sampleData = {
          restaurant: {
            name: 'Bella Vista Restaurant Assistant',
            goal: 'bookings',
            systemPrompt: 'You are the Bella Vista Restaurant booking assistant. Help customers make reservations, learn about our menu, and answer questions about our Italian cuisine. Our restaurant is open Tuesday-Sunday, 5pm-10pm.',
            welcomeMessage: 'Welcome to Bella Vista! I can help you make a reservation or answer questions about our authentic Italian menu. How can I assist you?',
            sampleKnowledge: {
              hours: 'Tuesday-Sunday 5pm-10pm, closed Mondays',
              cuisine: 'Authentic Italian cuisine with fresh pasta made daily',
              specialties: 'Signature dishes include Osso Buco, Homemade Ravioli, and Tiramisu',
              reservations: 'Reservations recommended, especially weekends',
              location: 'Located in the historic downtown district with street parking available'
            }
          },
          tech: {
            name: 'TechFlow Support Bot',
            goal: 'support',
            systemPrompt: 'You are TechFlow\'s technical support assistant. Help users with software issues, account problems, and product questions. Be technical but approachable.',
            welcomeMessage: 'Hi! I\'m here to help with any TechFlow questions or issues. What can I assist you with today?',
            sampleKnowledge: {
              products: 'Cloud management platform, API tools, and developer dashboard',
              support: '24/7 support available, with priority support for Pro customers',
              documentation: 'Comprehensive API docs and tutorials available',
              billing: 'Flexible pricing plans from Starter to Enterprise',
              status: 'System status page available at status.techflow.com'
            }
          },
          healthcare: {
            name: 'MedCare Appointment Assistant',
            goal: 'bookings',
            systemPrompt: 'You are MedCare\'s appointment scheduling assistant. Help patients book appointments, understand services, and provide general practice information. Never provide medical advice.',
            welcomeMessage: 'Hello! I can help you schedule an appointment or learn about our medical services. How may I assist you?',
            sampleKnowledge: {
              services: 'General medicine, cardiology, dermatology, and pediatrics',
              hours: 'Monday-Friday 8am-6pm, Saturday 9am-2pm',
              appointments: 'Online scheduling available, same-day appointments often available',
              insurance: 'We accept most major insurance plans',
              location: 'Two convenient locations: Downtown and Westside clinics'
            }
          }
        };
        
        const selectedData = sampleData[dataType] || sampleData.tech;
        
        // Update user configuration with sample data
        const updateData = {
          'chatbotConfig.name': selectedData.name,
          'chatbotConfig.goal': selectedData.goal,
          'chatbotConfig.sampleData': selectedData.sampleKnowledge,
          'chatbotConfig.lastUpdated': new Date(),
          'widgetConfig.title': selectedData.name,
          'widgetConfig.welcomeMessage': selectedData.welcomeMessage,
          'widgetConfig.systemPrompt': selectedData.systemPrompt,
          'widgetConfig.primaryColor': selectedData.goal === 'bookings' ? '#F59E0B' : 
                                       selectedData.goal === 'support' ? '#3B82F6' : '#667eea'
        };
        
        await DatabaseService.updateUser(userId, updateData);
        
        res.json({
          success: true,
          message: `Sample ${dataType} data loaded successfully`,
          data: selectedData
        });
        
      } catch (error) {
        console.error('Load sample data error:', error);
        res.status(500).json({ error: 'Failed to load sample data' });
      }
    });

    // Send widget code to developer/email
    app.post('/api/chatbot/send-to-developer', validateApiKey, async (req, res) => {
      try {
        const { email, platform, message, widgetCode } = req.body;
        const user = req.user;
        
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }
        
        // Prepare email content
        const emailContent = {
          to: email,
          subject: `Widget Integration Code from ${user.name}`,
          html: `
            <h2>Chatbot Widget Integration</h2>
            <p>Hi there!</p>
            <p>${user.name} has sent you the integration code for their AI chatbot widget.</p>
            
            ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
            
            <h3>Integration Code (${platform}):</h3>
            <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto;"><code>${widgetCode}</code></pre>
            
            <p><strong>Platform:</strong> ${platform}</p>
            <p><strong>API Key:</strong> ${user.apiKey}</p>
            
            <hr>
            <p><small>Sent from Mouna AI Chatbot Platform</small></p>
          `
        };
        
        // Send email using EmailService
        const EmailService = require('./services/EmailService');
        await EmailService.sendEmail(emailContent);
        
        res.json({
          success: true,
          message: 'Widget code sent successfully to developer'
        });
        
      } catch (error) {
        console.error('Send to developer error:', error);
        res.status(500).json({ error: 'Failed to send widget code' });
      }
    });

    // Widget customization -- Save appearance
    app.post('/api/widget/customize', validateApiKey, async (req, res) => {
      try {
        const userId = req.user._id;
        const { primaryColor, title, welcomeMessage } = req.body;
        const update = {
          'widgetConfig.primaryColor': primaryColor,
          'widgetConfig.title': title,
          'widgetConfig.welcomeMessage': welcomeMessage
        };
        await DatabaseService.updateUser(userId, update);
        res.json({ success: true, message: "Widget customization saved." });
      } catch (error) {
        res.status(500).json({ error: 'Failed to save widget customization.' });
      }
    });

    // Widget prompt -- Save system prompt
    app.post('/api/widget/prompt', validateApiKey, async (req, res) => {
      try {
        const userId = req.user._id;
        const { systemPrompt } = req.body;
        await DatabaseService.updateUser(userId, { 'widgetConfig.systemPrompt': systemPrompt });
        res.json({ success: true, message: "System prompt saved." });
      } catch (error) {
        res.status(500).json({ error: 'Failed to save prompt.' });
      }
    });
    
    // Advanced Widget Customization -- Save comprehensive configuration
    app.post('/api/widget/customize-advanced', validateApiKey, async (req, res) => {
      try {
        const userId = req.user._id;
        const advancedConfig = req.body;
        
        // Update user's advanced widget configuration
        const updateData = {
          'widgetConfig.advanced': advancedConfig,
          'widgetConfig.lastUpdated': new Date()
        };
        
        await DatabaseService.updateUser(userId, updateData);
        
        res.json({ 
          success: true, 
          message: "Advanced widget configuration saved successfully!",
          config: advancedConfig
        });
      } catch (error) {
        console.error('Advanced customization save error:', error);
        res.status(500).json({ error: 'Failed to save advanced widget configuration.' });
      }
    });
    
    // Get Widget Configuration -- Including advanced settings
    app.get('/api/widget/config', validateApiKey, async (req, res) => {
      try {
        const userId = req.user._id;
        const user = await DatabaseService.findUserById(userId);
        
        if (!user || !user.widgetConfig) {
          return res.json({
            success: true,
            config: {
              // Default advanced configuration
              primaryColor: '#667eea',
              secondaryColor: '#764ba2',
              backgroundStyle: 'gradient',
              fontFamily: 'Inter',
              fontSize: 14,
              borderRadius: 12,
              shadowIntensity: 50,
              widgetPosition: 'bottom-right',
              widgetSize: 'medium',
              autoOpenDelay: 0,
              autoMinimize: false,
              rememberConversation: true,
              showTyping: true,
              entryAnimation: 'slideUp',
              animationSpeed: 500,
              bubbleAnimation: true,
              smoothScrolling: true,
              breathingEffect: false,
              enableSounds: false,
              soundTheme: 'gentle',
              soundVolume: 50,
              personalityTraits: ['friendly'],
              responseStyle: 'balanced',
              aiName: 'AI Assistant',
              avatarStyle: 'robot',
              useEmojis: true,
              customCSS: '',
              autoHideMobile: false,
              fullScreenMobile: true,
              lazyLoading: true,
              preloadMessages: false,
              rememberPreferences: true,
              analyticsTracking: true
            }
          });
        }
        
        res.json({
          success: true,
          config: user.widgetConfig.advanced || {}
        });
      } catch (error) {
        console.error('Widget config fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch widget configuration.' });
      }
    });
    
    // Test API key endpoint (for demo/testing purposes)
    app.get('/test-api-key', (req, res) => {
      if (process.env.TEST_API_KEY) {
        res.json({ apiKey: process.env.TEST_API_KEY });
      } else {
        res.status(404).json({ error: 'Test API key not configured' });
      }
    });
    
    // Knowledge Base Management Endpoints
    
    // Get knowledge base for a domain
    app.get('/api/knowledge/:domain', validateApiKey, async (req, res) => {
      try {
        const domain = req.params.domain;
        const knowledge = knowledgeService.getKnowledgeBase(domain);
        
        if (!knowledge) {
          return res.status(404).json({ 
            error: 'Knowledge base not found for domain',
            domain: domain 
          });
        }
        
        res.json({
          success: true,
          domain: domain,
          knowledge: knowledge,
          lastUpdated: knowledge.last_updated || knowledge.extracted_at
        });
      } catch (error) {
        console.error('Knowledge base fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch knowledge base' });
      }
    });
    
    // Update/Create knowledge base for a domain
    app.post('/api/knowledge/:domain', validateApiKey, async (req, res) => {
      try {
        const domain = req.params.domain;
        const { customKnowledge, extractFromUrls } = req.body;
        
        let success = false;
        let message = '';
        
        if (customKnowledge) {
          // Direct knowledge injection
          success = await knowledgeService.updateKnowledgeBase(domain, customKnowledge);
          message = success ? 'Custom knowledge base updated successfully' : 'Failed to update knowledge base';
        } else if (extractFromUrls && extractFromUrls.length > 0) {
          // Extract from provided URLs
          success = await knowledgeService.extractWebsiteKnowledge(domain, extractFromUrls);
          message = success ? `Knowledge extracted from ${extractFromUrls.length} URLs` : 'Failed to extract knowledge';
        } else {
          // Auto-extract from domain
          success = await knowledgeService.updateKnowledgeBase(domain);
          message = success ? 'Knowledge base auto-extracted and updated' : 'Failed to auto-extract knowledge';
        }
        
        if (success) {
          const updatedKnowledge = knowledgeService.getKnowledgeBase(domain);
          res.json({
            success: true,
            message: message,
            domain: domain,
            knowledge: updatedKnowledge
          });
        } else {
          res.status(500).json({
            success: false,
            error: message
          });
        }
        
      } catch (error) {
        console.error('Knowledge base update error:', error);
        res.status(500).json({ error: 'Failed to update knowledge base' });
      }
    });
    
    // Search knowledge base
    app.post('/api/knowledge/:domain/search', validateApiKey, async (req, res) => {
      try {
        const domain = req.params.domain;
        const { query } = req.body;
        
        if (!query) {
          return res.status(400).json({ error: 'Search query is required' });
        }
        
        const results = knowledgeService.searchKnowledge(domain, query);
        
        res.json({
          success: true,
          domain: domain,
          query: query,
          results: results || [],
          found: !!results
        });
        
      } catch (error) {
        console.error('Knowledge search error:', error);
        res.status(500).json({ error: 'Knowledge search failed' });
      }
    });
    
    // Get contextual prompt for a domain
    app.get('/api/knowledge/:domain/prompt', validateApiKey, async (req, res) => {
      try {
        const domain = req.params.domain;
        const language = req.query.language || 'en';
        
        const prompt = knowledgeService.generateContextualPrompt(domain, language);
        
        if (!prompt) {
          return res.status(404).json({ 
            error: 'No contextual prompt available for domain',
            domain: domain 
          });
        }
        
        res.json({
          success: true,
          domain: domain,
          language: language,
          prompt: prompt
        });
        
      } catch (error) {
        console.error('Contextual prompt error:', error);
        res.status(500).json({ error: 'Failed to generate contextual prompt' });
      }
    });
    
    // Email validation test endpoint
    app.post('/api/validate-email', async (req, res) => {
      try {
        const { email } = req.body;
        
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }
        
        const EmailValidationService = require('./services/EmailValidationService');
        const validation = await EmailValidationService.validateEmail(email);
        
        res.json({
          email: email,
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          details: validation.details,
          suggestions: validation.isValid ? [] : EmailValidationService.getEmailSuggestions(email),
          mxRecords: validation.mxRecords
        });
        
      } catch (error) {
        console.error('Email validation test error:', error);
        res.status(500).json({ error: 'Email validation failed' });
      }
    });
    
    // IP detection endpoint
    app.get('/ip', async (req, res) => {
      try {
        // Get external IP using a third-party service
        const https = require('https');
        const options = {
          hostname: 'api.ipify.org',
          port: 443,
          path: '/',
          method: 'GET'
        };
        
        const ipReq = https.request(options, (ipRes) => {
          let data = '';
          ipRes.on('data', (chunk) => {
            data += chunk;
          });
          ipRes.on('end', () => {
            res.json({
              serverIP: data.trim(),
              requestIP: req.ip,
              forwardedFor: req.headers['x-forwarded-for'],
              timestamp: new Date().toISOString()
            });
          });
        });
        
        ipReq.on('error', (error) => {
          res.json({
            error: 'Could not determine external IP',
            requestIP: req.ip,
            forwardedFor: req.headers['x-forwarded-for'],
            timestamp: new Date().toISOString()
          });
        });
        
        ipReq.end();
      } catch (error) {
        res.json({
          error: error.message,
          requestIP: req.ip,
          forwardedFor: req.headers['x-forwarded-for'],
          timestamp: new Date().toISOString()
        });
      }
    });


    // Widget configuration endpoint
    app.get('/config/:apiKey?', async (req, res) => {
      try {
        const apiKey = req.params.apiKey || req.query.apiKey;
        
        if (apiKey) {
          const user = await DatabaseService.findUserByApiKey(apiKey);
          if (user && user.widgetConfig) {
            return res.json(user.widgetConfig);
          }
        }
        
        // Default configuration
        res.json({
          primaryColor: '#667eea',
          position: 'bottom-right',
          title: 'AI Assistant',
          subtitle: 'Online • Usually replies instantly',
          welcomeMessage: 'Hello! How can I help you today?',
          placeholder: 'Type your message...',
          maxMessages: 10,
          branding: true
        });
      } catch (error) {
        console.error('Config error:', error);
        res.status(500).json({ error: 'Configuration error' });
      }
    });

    // Debug endpoint to test API key validation
    app.post('/debug-auth', async (req, res) => {
      const apiKey = req.headers['x-api-key'] || req.query.apiKey;
      console.log('Debug: Received API key:', apiKey ? apiKey.substring(0, 10) + '...' : 'None');
      
      if (!apiKey) {
        return res.json({ error: 'No API key provided', headers: req.headers });
      }
      
      try {
        const user = await DatabaseService.findUserByApiKey(apiKey);
        console.log('Debug: User found:', !!user, user ? user.email : 'N/A');
        res.json({ 
          success: !!user, 
          user: user ? { email: user.email, plan: user.subscription?.plan } : null 
        });
      } catch (error) {
        console.error('Debug: Error finding user:', error);
        res.json({ error: error.message });
      }
    });

    // Language endpoints
    app.get('/api/languages', (req, res) => {
      res.json({
        supported: SUPPORTED_LANGUAGES,
        translations: TRANSLATIONS,
        success: true
      });
    });

    app.get('/api/translations/:language', (req, res) => {
      const language = req.params.language;
      const translations = TRANSLATIONS[language];
      
      if (!translations) {
        return res.status(404).json({ 
          error: 'Language not supported',
          supported: Object.keys(SUPPORTED_LANGUAGES)
        });
      }
      
      res.json({
        language,
        translations,
        success: true
      });
    });

    // Transliteration endpoint
    app.post('/api/transliterate', (req, res) => {
        const { text, fromScript = 'latin', toScript = 'telugu' } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        
        try {
            // Basic Telugu transliteration mapping
            const teluguMap = {
                'ela unnaru': 'ఎలా ఉన్నారు',
                'meeru bagunnara': 'మీరు బాగున్నారా',
                'nenu bagunnanu': 'నేను బాగున్నాను',
                'dhanyavadalu': 'ధన్యవాదాలు',
                'namaste': 'నమస్తే',
                'hello': 'హలో',
                'good morning': 'శుభోదయం',
                'good night': 'శుభరాత్రి',
                'thank you': 'ధన్యవాదాలు',
                'how are you': 'ఎలా ఉన్నారు',
                'what is your name': 'మీ పేరు ఏమిటి',
                'my name is': 'నా పేరు',
                'nice to meet you': 'మిమ్మల్ని కలవడం సంతోషం',
                'see you later': 'తర్వాత కలుద్దాం',
                'goodbye': 'వీడ్కోలు',
                'yes': 'అవును',
                'no': 'లేదు',
                'please': 'దయచేసి',
                'sorry': 'క్షమించండి',
                'excuse me': 'క్షమించండి',
                'help me': 'నాకు సహాయం చేయండి',
                'i need help': 'నాకు సహాయం కావాలి',
                'where are you': 'మీరు ఎక్కడ ఉన్నారు',
                'what are you doing': 'మీరు ఏమి చేస్తున్నారు',
                'i am fine': 'నేను బాగున్నాను',
                'i am good': 'నేను బాగున్నాను',
                'very good': 'చాలా బాగుంది'
            };
            
            let transliteratedText = text;
            
            // Replace phrases (case-insensitive)
            for (let key in teluguMap) {
                const regex = new RegExp(key, 'gi');
                transliteratedText = transliteratedText.replace(regex, teluguMap[key]);
            }
            
            res.json({
                originalText: text,
                transliteratedText,
                fromScript,
                toScript,
                success: true
            });
            
        } catch (error) {
            console.error('Transliteration error:', error);
            res.status(500).json({ error: 'Transliteration failed' });
        }
    });

    app.post('/api/detect-language', (req, res) => {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }
      
      const detectedLanguage = LANGUAGE_DETECTION.detectLanguage(text);
      
      res.json({
        text,
        detectedLanguage,
        confidence: detectedLanguage !== LANGUAGE_DETECTION.default ? 'high' : 'low',
        success: true
      });
    });

    // Import plan access control middleware
    const { checkUsageLimit, incrementUsage } = require('./middleware/planAccessControl');

    // Chat endpoint
    app.post('/ask', validateApiKey, checkUsageLimit('messagesPerMonth', 1), incrementUsage(DatabaseService), async (req, res) => {
      try {
        const { message, sessionId, website, language } = req.body;
        const user = req.user;

        if (!message || !sessionId) {
          return res.status(400).json({ error: 'Message and sessionId are required' });
        }

        // Check if user can send messages (rate limiting by plan)
        if (user.canSendMessage && !user.canSendMessage()) {
          return res.status(429).json({ 
            error: 'Message limit exceeded for your plan',
            plan: user.subscription.plan 
          });
        }

        // Find or create chat session
        let session = await DatabaseService.findChatSession(sessionId);
        if (!session) {
          session = await DatabaseService.createChatSession({
            sessionId,
            userId: user._id,
            website: {
              domain: website || 'unknown',
              page: req.headers.referer || '/',
              title: 'Unknown'
            },
            visitor: {
              ipAddress: req.ip,
              userAgent: req.headers['user-agent']
            }
          });
        }

        // Add user message to session
        await DatabaseService.addMessageToSession(sessionId, 'user', message);

        let aiResponse;
        const startTime = Date.now();

        // Detect language from user message
        let detectedLanguage = language || LANGUAGE_DETECTION.detectLanguage(message);
        console.log('🌐 Language received from client:', language);
        console.log('🔍 Detected language from message:', detectedLanguage);
        
        if (!SUPPORTED_LANGUAGES[detectedLanguage]) {
          console.log('⚠️ Language not supported, falling back to English');
          detectedLanguage = 'en'; // Fallback to English
        }
        
        // Extract domain from referrer or session data for context
        let domain = 'localhost:3000'; // Default for demo
        if (req.headers.referer) {
          try {
            const refererURL = new URL(req.headers.referer);
            domain = refererURL.host;
          } catch (error) {
            console.warn('Could not parse referer for domain:', req.headers.referer);
          }
        }
        
        console.log('🌐 Extracted domain for knowledge context:', domain);
        
        // Get contextual system prompt from knowledge base
        let systemPrompt = knowledgeService.generateContextualPrompt(domain, detectedLanguage);
        
        if (!systemPrompt) {
          // Fallback to default language-specific prompt
          systemPrompt = AI_SYSTEM_PROMPTS[detectedLanguage] || AI_SYSTEM_PROMPTS['en'];
          console.log('📝 Using default system prompt for language:', detectedLanguage);
        } else {
          console.log('🧠 Using knowledge-based contextual prompt for domain:', domain);
        }
        
        console.log('📝 System prompt preview:', systemPrompt.substring(0, 150) + '...');
        
        try {
          // Get OpenAI response
          const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: message
              }
            ],
            max_tokens: 500,
            temperature: 0.7,
          });

          aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response at this time.';
          
          const responseTime = Date.now() - startTime;
          
          // Add AI response to session with metadata
          await DatabaseService.addMessageToSession(sessionId, 'assistant', aiResponse, {
            responseTime,
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            tokens: {
              prompt: completion.usage?.prompt_tokens || 0,
              completion: completion.usage?.completion_tokens || 0,
              total: completion.usage?.total_tokens || 0
            },
            cost: (completion.usage?.total_tokens || 0) * 0.00001 // Rough cost estimation
          });

          // Log message for analytics
          await DatabaseService.logMessage({
            userId: user._id,
            sessionId,
            website: website || 'unknown',
            userMessage: message,
            aiResponse,
            responseTime,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip
          });

          // Update user usage if using MongoDB
          if (DatabaseService.isMongoConnected && user.incrementMessageCount) {
            await user.incrementMessageCount();
          }

        } catch (openaiError) {
          console.error('OpenAI API error:', openaiError);
          console.error('OpenAI Error Details:', {
            message: openaiError.message,
            status: openaiError.status,
            type: openaiError.type
          });
          
          // Fallback response
          aiResponse = "Sorry, I'm having trouble processing your request right now. Please try again in a moment.";
          
          await DatabaseService.addMessageToSession(sessionId, 'assistant', aiResponse, {
            responseTime: Date.now() - startTime,
            error: 'openai_api_error',
            errorDetails: openaiError.message
          });
        }

        res.json({ 
          response: aiResponse,
          sessionId,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Plan details endpoint - returns current plan configuration
    app.get('/api/plan-details', async (req, res) => {
      try {
        const { PlanManager } = require('./config/planFeatures');
        const planId = req.query.plan || 'free';
        
        if (planId === 'all') {
          // Return all plan configurations
          res.json({
            success: true,
            plans: PlanManager.getAllPlans()
          });
        } else {
          // Return specific plan details
          const planDetails = PlanManager.getPlanDetails(planId);
          res.json({
            success: true,
            plan: planDetails,
            planId: planId
          });
        }
      } catch (error) {
        console.error('Plan details fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch plan details' });
      }
    });

    // Pricing plans endpoint
    app.get('/api/payments/plans', async (req, res) => {
      try {
        const currency = req.query.currency || 'INR';
        const { PlanManager } = require('./config/planFeatures');
        
        // Use the centralized plan configuration instead of old pricing file
        const allPlans = PlanManager.getAllPlans();
        const pricingPlans = {};
        
        // Convert to the format expected by the frontend
        for (const [planId, planDetails] of Object.entries(allPlans)) {
          pricingPlans[planId] = {
            name: planDetails.name,
            price: planDetails.price,
            currency: planDetails.currency,
            billingCycle: planDetails.billingCycle,
            limits: planDetails.limits,
            features: Object.keys(planDetails.features).filter(feature => planDetails.features[feature]),
            popular: planId === 'professional' // Mark professional as popular
          };
        }
        
        res.json({
          monthly: pricingPlans,
          currency: currency
        });
      } catch (error) {
        console.error('Pricing fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch pricing plans' });
      }
    });

    // Test page
    app.get('/test', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'test-simple.html'));
    });
    
    // Debug chat page
    app.get('/debug-chat', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'debug-chat.html'));
    });
    
// Widget test page
app.get('/widget-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'widget-test.html'));
});

// Payment demo page
app.get('/payment-demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payment-demo.html'));
});

// Email validation test page
app.get('/email-validation-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'email-validation-test.html'));
});

// Simple test page
    app.get('/test-simple', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'test-simple.html'));
    });
    
    // OTP Test endpoint - generates and displays OTP for testing
    app.get('/test-otp/:email?', async (req, res) => {
      try {
        const email = req.params.email || 'info@mouna-ai.com';
        const OTPService = require('./services/OTPService');
        
        // Generate OTP
        const otp = await OTPService.generateAndStoreOTP(email, 'email');
        
        res.json({
          success: true,
          message: 'OTP generated successfully',
          email: email,
          otp: otp,
          note: 'This is for testing only. In production, OTP would be sent via email.'
        });
      } catch (error) {
        console.error('Test OTP error:', error);
        res.status(500).json({ error: 'Failed to generate test OTP' });
      }
    });
    
    // Test registration page with OTP
    app.get('/test-registration', (req, res) => {
      const filePath = path.join(__dirname, 'public', 'test-registration.html');
      
      // Send file with error handling
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('Error serving test-registration.html:', err);
          // Fallback inline HTML
          res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Test Registration - Email OTP</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
        .note { background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Test Registration with Email OTP</h1>
    <div class="note">You will receive an OTP via email after registration.</div>
    
    <form id="regForm">
        <div class="form-group">
            <label>Name:</label>
            <input type="text" id="name" required>
        </div>
        <div class="form-group">
            <label>Email:</label>
            <input type="email" id="email" required>
        </div>
        <div class="form-group">
            <label>Password:</label>
            <input type="password" id="password" required>
        </div>
        <div class="form-group">
            <label>Phone:</label>
            <input type="tel" id="phone" placeholder="+91XXXXXXXXXX" required>
        </div>
        <button type="submit">Register</button>
    </form>
    
    <div id="response"></div>
    
    <script>
        document.getElementById('regForm').onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                phone: document.getElementById('phone').value
            };
            
            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                document.getElementById('response').innerHTML = 
                    '<div style="margin-top:20px;padding:15px;border-radius:4px;background:' + 
                    (response.ok ? '#d4edda;color:#155724' : '#f8d7da;color:#721c24') + '">' +
                    (response.ok ? 'Registration successful! Check server logs for OTP.' : 'Error: ' + result.error) +
                    '</div>';
            } catch (error) {
                document.getElementById('response').innerHTML = 
                    '<div style="margin-top:20px;padding:15px;border-radius:4px;background:#f8d7da;color:#721c24">Network error: ' + error.message + '</div>';
            }
        };
    </script>
</body>
</html>
        `);
        }
      });
    });

    // Get test API key for widget testing
    app.get('/test-api-key', (req, res) => {
      const testApiKey = process.env.TEST_API_KEY;
      if (testApiKey) {
        res.json({
          success: true,
          apiKey: testApiKey
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Test API key not configured'
        });
      }
    });

    // Initialize sample data endpoint (for testing)
    app.post('/init-sample-data', async (req, res) => {
      try {
        if (DatabaseService.isMongoConnected) {
          // For MongoDB, create sample users
          const sampleUser = await DatabaseService.createUser({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            company: 'Test Company',
            website: 'https://test.com'
          });
          
          res.json({ 
            success: true, 
            message: 'Sample data created',
            user: {
              email: sampleUser.email,
              apiKey: sampleUser.apiKey
            }
          });
        } else {
          // For non-MongoDB setups, create a simple test user
          res.json({ 
            success: true, 
            message: 'MongoDB required for sample data creation',
            note: 'Please configure MongoDB connection for full functionality'
          });
        }
      } catch (error) {
        console.error('Sample data creation error:', error);
        res.status(500).json({ error: 'Failed to create sample data' });
      }
    });

    // Admin routes removed for production
    
    // Customer authentication routes
    const { router: authRoutes } = require('./routes/auth');
    app.use('/api', authRoutes);
    
    // API info route
    app.get('/api', (req, res) => {
      res.json({
        name: 'Mouna AI Chatbot API',
        version: '1.0.0',
        status: 'active',
        endpoints: {
          auth: '/api/signup, /api/login, /api/profile',
          payments: '/api/payments/plans, /api/payments/create-subscription',
          email: '/api/email/*'
        },
        documentation: 'Available endpoints for authenticated API access'
      });
    });
    
    // Customer payment routes
    const paymentRoutes = require('./routes/payments');
    app.use('/api/payments', paymentRoutes);
    
    // Robust email validation routes
    const robustEmailRoutes = require('./routes/robustEmailValidation');
    app.use('/api/email', robustEmailRoutes);
    
    // OAuth authentication routes
    const oauthRoutes = require('./routes/oauth');
    app.use('/auth', oauthRoutes);
    
    // Serve pages
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    
    // Main signup page (email signup form)
    app.get('/signup', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'signup.html'));
    });
    
    // Social login options page
    app.get('/social-signup', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'social-login.html'));
    });
    
    // Alternative email signup route (for backward compatibility)
    app.get('/email-signup', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'signup.html'));
    });
    
    app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    });
    
    app.get('/dashboard', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    });
    
    app.get('/pricing', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'pricing.html'));
    });
    
    app.get('/customize-widget', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'customize-widget.html'));
    });
    
    // Advanced Widget Customization Page
    app.get('/customize-widget-advanced', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'customize-widget-advanced.html'));
    });

    app.get('/configure-prompt', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'configure-prompt.html'));
    });

    app.get('/integration', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'integration.html'));
    });

    // Welcome dashboard for new users after OTP verification
    app.get('/welcome-dashboard', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'welcome-dashboard.html'));
    });

    // OTP verification page
    app.get('/verify-otp', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'verify-otp.html'));
    });

    // Payment result pages
    app.get('/payment-success', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'payment-success.html'));
    });

    app.get('/payment-failed', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'payment-failed.html'));
    });
    
    // Admin functionality removed for production

    // Add debug route for chat testing
    app.get('/debug', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'debug-chat.html'));
    });
    
    // Add debug token route
    app.get('/debug-token', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'debug-token.html'));
    });
    
    // Add widget test page route
    app.get('/widget-test', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'widget-test.html'));
    });
    
    // Add payment demo route
    app.get('/payment-demo', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'payment-demo.html'));
    });

    // Add robust email test page route
    app.get('/robust-email-test', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'robust-email-test.html'));
    });

    // Privacy Policy page
    app.get('/privacy', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
    });

    // Terms of Service page
    app.get('/terms', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'terms.html'));
    });

    // Contact Us page
    app.get('/contact', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'contact.html'));
    });

    // Refund and Cancellation Policy page
    app.get('/refund-policy', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'refund-policy.html'));
    });

    // Error handling middleware
    app.use((error, req, res, next) => {
      console.error('Server error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    });

    // 404 handler - serve custom 404 page
    app.use((req, res) => {
      // Check if the request accepts HTML
      if (req.accepts('html')) {
        res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
      } else {
        // For API requests, return JSON
        res.status(404).json({ error: 'Endpoint not found' });
      }
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🧪 Test page: http://localhost:${PORT}/test`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🤖 OpenAI configured: ${!!process.env.OPENAI_API_KEY}`);
      console.log(`📍 Root info: http://localhost:${PORT}/`);
      console.log('');
      
      if (!mongoConnected) {
        console.log('⚠️  Note: Using mock database. Install and start MongoDB for production use.');
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🔄 Graceful shutdown initiated...');
      await DatabaseService.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('🔄 Graceful shutdown initiated...');
      await DatabaseService.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
