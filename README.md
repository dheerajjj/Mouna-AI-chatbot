# 🤖 AI Chatbot Widget

A production-ready, embeddable AI chatbot widget powered by OpenAI GPT models. Features user management, subscription billing, multi-currency support, and comprehensive analytics.

## ✨ Features

### Core Features
- 🤖 **OpenAI Integration**: Powered by GPT-4o Mini for intelligent responses
- 🔧 **Easy Integration**: Simple script tag embedding
- 🎨 **Customizable**: Colors, position, messages, and branding
- 📱 **Responsive**: Works on desktop and mobile devices
- 🔒 **Secure**: API key authentication and rate limiting

### Business Features
- 💳 **Stripe Payments**: Multi-currency subscription billing
- 👥 **User Management**: Registration, authentication, and profiles
- 📊 **Analytics**: Message tracking, user engagement, and revenue insights
- 🌍 **Multi-Currency**: Support for INR, USD, EUR, GBP, CAD, AUD
- 📈 **Usage Limits**: Tiered plans with message quotas

### Technical Features
- 🚀 **MongoDB Integration**: Scalable data storage
- 🔄 **Session Management**: Conversation context and history
- ⚡ **Rate Limiting**: Protection against abuse
- 📝 **Comprehensive Logging**: Chat logs and analytics
- 🛡️ **Security**: CORS, CSP, and input validation

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ai-chatbot-widget.git
cd ai-chatbot-widget
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Security
JWT_SECRET=your_secure_jwt_secret_here
ADMIN_PASSWORD=your_secure_password_here
```

### 4. Start the Server
```bash
npm start
# or
node server-mongo.js
```

### 5. Embed the Widget
Add this script tag to your website:
```html
<script 
  src="https://your-domain.com/widget-fixed.js"
  data-api-key="your_api_key_here"
  data-api-url="https://your-domain.com"
  data-title="AI Assistant"
  data-welcome-message="Hello! How can I help you today?">
</script>
```

## 📋 Prerequisites

- Node.js 16+ 
- MongoDB Atlas account or local MongoDB
- OpenAI API key
- Stripe account (for payments)

## 🔧 Configuration

### Widget Customization
```html
<script 
  src="https://your-domain.com/widget-fixed.js"
  data-api-key="cb_your_api_key"
  data-api-url="https://your-api-domain.com"
  data-primary-color="#667eea"
  data-position="bottom-right"
  data-title="AI Assistant"
  data-subtitle="Online • Usually replies instantly"
  data-welcome-message="👋 Hi! How can I help you today?"
  data-placeholder="Type your message...">
</script>
```

### Available Positions
- `bottom-right` (default)
- `bottom-left`
- `top-right`
- `top-left`

### Subscription Plans

| Plan | Price (INR/month) | Messages/Month | Features |
|------|------------------|----------------|----------|
| Free | ₹0 | 100 | Basic chat |
| Starter | ₹299 | 1,000 | Priority support |
| Professional | ₹999 | 10,000 | Analytics dashboard |
| Enterprise | ₹2,999 | Unlimited | Custom branding |

## 🏗️ Project Structure

```
ai-chatbot-widget/
├── config/
│   ├── database.js          # MongoDB configuration
│   └── pricing.js           # Subscription plans
├── models/
│   ├── User.js              # User schema
│   └── ChatSession.js       # Chat session schema
├── routes/
│   ├── auth.js              # Authentication routes
│   └── payments.js          # Stripe payment routes
├── services/
│   └── DatabaseService.js   # Database abstraction layer
├── utils/
│   └── currency.js          # Multi-currency utilities
├── public/
│   └── widget-fixed.js      # Main widget script
├── server-mongo.js          # Main server file
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Core Endpoints
- `GET /` - API information
- `GET /health` - Health check
- `POST /ask` - Chat with AI (requires API key)
- `GET /config` - Widget configuration

### User Management
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/profile` - User profile

### Payments
- `GET /api/payments/plans` - Available plans
- `POST /api/payments/create-subscription` - Create subscription
- `POST /api/payments/cancel-subscription` - Cancel subscription

### Admin
- `GET /admin/stats` - System statistics
- `GET /monetization` - Monetization dashboard

## 🛠️ Development

### Local Development
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Testing
```bash
# Run tests
npm test

# Test the widget
open http://localhost:3000/test
```

### Creating Test Users
```bash
# Create a test user with API key
node create-test-user.js

# Get existing user API key
node get-test-user.js
```

## 🚀 Production Deployment

### Automated Hosting Options

#### Option 1: Heroku (Recommended - Free Tier Available)
```bash
# Install Heroku CLI and login
heroku login

# Create new app
heroku create your-chatbot-widget

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set OPENAI_API_KEY=your_openai_api_key
heroku config:set MONGODB_URI=your_mongodb_atlas_url
heroku config:set JWT_SECRET=your_secure_jwt_secret

# Deploy
git push heroku main
```

#### Option 2: Railway
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

#### Option 3: Render
1. Connect your GitHub repository to Render
2. Create new Web Service
3. Set environment variables in dashboard
4. Deploy automatically from GitHub

### Database Setup (MongoDB Atlas)
1. Create free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create new cluster (free tier: 512MB)
3. Get connection string
4. Add to MONGODB_URI environment variable

### Production Checklist
- [ ] Set up MongoDB Atlas
- [ ] Get OpenAI API key
- [ ] Choose hosting platform
- [ ] Set environment variables
- [ ] Deploy application
- [ ] Test widget integration
- [ ] Configure custom domain (optional)

### Cost Estimate
- **Free Tier**: $0/month (Heroku + MongoDB Atlas free tiers)
- **Production**: ~$17/month (Heroku Hobby + MongoDB Atlas M10)

### Monitoring
- Health endpoint: `/health`
- Built-in analytics dashboard
- Platform-specific monitoring tools

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🚀 Legacy Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
JWT_SECRET=your_production_jwt_secret
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Deployment Platforms
- **Railway**: `railway deploy`
- **Heroku**: `git push heroku main`
- **Vercel**: `vercel deploy`
- **DigitalOcean**: Use App Platform

## 📊 Analytics & Monitoring

### Available Metrics
- Total users and registrations
- Message count and trends
- Revenue and subscription analytics
- Popular conversation topics
- User engagement patterns

### Admin Dashboard
Access the admin dashboard at: `https://your-domain.com/monetization`

Default credentials:
- Username: `admin`
- Password: (set in environment variables)

## 🔒 Security Features

- **API Key Authentication**: Secure widget access
- **Rate Limiting**: Prevent abuse and spam
- **CORS Protection**: Cross-origin request security
- **Input Validation**: Sanitize user inputs
- **Environment Variables**: Secure credential storage
- **JWT Tokens**: Secure user sessions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Widget not loading?**
- Check API key validity
- Verify CORS settings
- Check browser console for errors

**Chat not responding?**
- Verify OpenAI API key
- Check API key usage limits
- Review server logs

**Payment issues?**
- Verify Stripe keys
- Check webhook configuration
- Review Stripe dashboard

### Getting Help
- 📧 Email: support@your-domain.com
- 💬 Discord: [Your Discord Server]
- 📖 Documentation: [Your Docs URL]

## 🎯 Roadmap

- [ ] Multi-language support
- [ ] Voice chat integration
- [ ] Advanced analytics
- [ ] White-label solutions
- [ ] API webhooks
- [ ] Advanced customization options

---

Made with ❤️ by Dheeraj