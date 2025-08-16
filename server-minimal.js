const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Mouna AI Chatbot - Minimal Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Start server with proper binding for Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
  console.log(`🌐 Server accessible at: ${process.env.RAILWAY_PUBLIC_DOMAIN || `http://localhost:${PORT}`}`);
  console.log(`🏥 Health check: /health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Graceful shutdown initiated...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 Graceful shutdown initiated...');
  process.exit(0);
});
