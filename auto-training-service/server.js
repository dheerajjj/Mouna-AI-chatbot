const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for proper IP handling
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Rate limiting - more restrictive for crawling operations
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Lower limit for crawling operations
  message: 'Too many crawling requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Key validation middleware
function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  // Validate against main chatbot service API key or internal service key
  const validKeys = [
    process.env.INTERNAL_SERVICE_KEY,
    process.env.MAIN_APP_API_KEY
  ].filter(Boolean);

  if (!validKeys.includes(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auto-training-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    capabilities: [
      'website-crawling',
      'business-analysis', 
      'knowledge-extraction',
      'auto-training'
    ]
  });
});

// Service info endpoint
app.get('/info', (req, res) => {
  res.json({
    name: 'Mouna AI Auto-Training Service',
    version: '1.0.0',
    description: 'Microservice for website crawling and AI-powered chatbot auto-training',
    endpoints: {
      health: '/health',
      crawl: 'POST /api/crawl',
      analyze: 'POST /api/analyze-business',
      bootstrap: 'POST /api/bootstrap',
      refresh: 'POST /api/refresh'
    },
    documentation: 'API endpoints for automated chatbot training from website content'
  });
});

// Auto-training routes
const autoTrainingRoutes = require('./routes/autoTraining');
app.use('/api', validateApiKey, autoTrainingRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Auto-training service error:', error);
  res.status(500).json({ 
    error: 'Internal service error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Service temporarily unavailable'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    service: 'auto-training-service',
    availableEndpoints: ['/health', '/info', '/api/crawl', '/api/analyze-business', '/api/bootstrap', '/api/refresh']
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 Auto-Training Service running on port ${PORT}`);
  console.log(`🌐 Service accessible at: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Service info: http://localhost:${PORT}/info`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log available capabilities
  console.log('🚀 Service capabilities:');
  console.log('   - Website crawling with Puppeteer');
  console.log('   - Business type detection');
  console.log('   - Knowledge base generation'); 
  console.log('   - Auto-training orchestration');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Auto-Training Service graceful shutdown initiated...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 Auto-Training Service graceful shutdown initiated...');
  process.exit(0);
});
