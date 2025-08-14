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
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3000", "https://localhost:3000", "https://mouna-ai-chatbot-production.up.railway.app"]
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

// Serve static files with proper MIME types
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
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

// Session middleware for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

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
        email: 'test@example.com',
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

    // Chat endpoint
    app.post('/ask', validateApiKey, async (req, res) => {
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

    // Pricing plans endpoint
    app.get('/api/payments/plans', async (req, res) => {
      try {
        const currency = req.query.currency || 'INR';
        const { PRICING_PLANS } = require('./config/pricing');
        
        res.json({
          monthly: PRICING_PLANS,
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
        const email = req.params.email || 'test@example.com';
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
