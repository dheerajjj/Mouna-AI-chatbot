# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is **Mouna AI**, a production-ready, embeddable AI chatbot widget powered by OpenAI GPT models. It's a Node.js Express application with MongoDB integration, featuring user management, subscription billing, multi-currency support, and comprehensive analytics.

**Tech Stack:**
- Backend: Node.js + Express.js
- Database: MongoDB (with mock DB fallback for development)
- AI: OpenAI GPT-4o Mini
- Payments: Razorpay (INR only)
- Authentication: JWT + Passport.js (Google, Apple OAuth)
- Frontend: Vanilla JavaScript widget

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Check system status (MongoDB, Node.js version)
npm run status
```

### Database Management
```bash
# Start MongoDB service (Windows)
npm run mongo:start

# Stop MongoDB service (Windows)
npm run mongo:stop

# Check MongoDB status
npm run mongo:status
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Deployment
```bash
# Deploy to Heroku
npm run deploy:heroku

# Deploy to Railway
npm run deploy:railway

# Deploy to Render (GitHub integration)
npm run deploy:render
```

### Setup and Utilities
```bash
# Run initial setup
npm run setup

# Create test users and API keys
node create-test-user.js

# Get existing test user API key
node get-test-user.js

# Check existing users in database
node check-users.js

# Clear all users (development only)
node clear-users.js
```

## Architecture Overview

### Core Components

**DatabaseService** (`services/DatabaseService.js`):
- Abstraction layer supporting both MongoDB and mock database
- Automatically falls back to mock DB if MongoDB is unavailable
- Handles users, chat sessions, subscriptions, message logs, and analytics
- Critical pattern: Always use DatabaseService methods, never direct model access

**Server Architecture** (`server-mongo.js`):
- Express app with comprehensive security (Helmet, CORS, rate limiting)
- API key authentication for widget access
- Session management with Passport.js OAuth
- Multi-currency support with automatic CORS for widget embedding

**Widget System** (`public/widget-fixed.js`):
- Embeddable JavaScript widget with customization options
- Position support: `bottom-right`, `bottom-left`, `top-right`, `top-left`
- Configurable colors, messages, and branding

### Data Models

**User Schema** (`models/User.js`):
- Handles authentication, API keys, subscription plans, usage tracking
- Auto-generates API keys with `cb_` prefix
- Methods: `generateApiKey()`, `canSendMessage()`, subscription management

**ChatSession Schema** (`models/ChatSession.js`):
- Tracks conversation sessions with detailed metadata
- Auto-expires inactive sessions after 24 hours
- Methods: `addMessage()`, `endSession()`, `addRating()`
- Analytics aggregation for user engagement metrics

**Subscription System** (`config/pricing.js`):
- Four-tier pricing: Free (100 msgs), Starter (₹499, 1K msgs), Professional (₹1499, 10K msgs), Enterprise (₹4999, 50K msgs)
- Multi-tenant support for agencies
- Usage limits with overage billing

### Key Configuration

**Environment Variables Required:**
- `OPENAI_API_KEY` - OpenAI API access
- `MONGODB_URI` - MongoDB connection string
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` - Payment processing
- `JWT_SECRET` - Session security
- `TEST_API_KEY` - Development testing

**Currency Support** (`utils/currency.js`):
- INR-only pricing using Razorpay payment gateway
- Automatic conversion to Razorpay's paise format

## Development Patterns

### Database Pattern
Always use DatabaseService methods instead of direct Mongoose operations:
```javascript
// Correct
const user = await DatabaseService.findUserByApiKey(apiKey);
await DatabaseService.incrementUserUsage(userId, 'messagesThisMonth');

// Avoid direct model access
const user = await User.findOne({ apiKey }); // Don't do this
```

### API Key Validation
All widget endpoints use `validateApiKey` middleware:
- Regular users: Database lookup with usage limit checks
- Test API key: Mock user with unlimited access for development

### Error Handling
The application gracefully degrades:
- MongoDB unavailable → Falls back to mock database
- OpenAI API issues → Returns error message to user
- Payment failures → User downgraded but service continues

### Widget Integration
Standard embedding pattern:
```html
<script 
  src="https://your-domain.com/widget-fixed.js"
  data-api-key="cb_your_api_key"
  data-api-url="https://your-domain.com"
  data-primary-color="#667eea"
  data-position="bottom-right">
</script>
```

## Testing Approach

- Jest framework with Supertest for API testing
- Mock database automatically used when MongoDB unavailable
- Test API key (`TEST_API_KEY`) for development widget testing
- Health endpoint: `/health` for deployment monitoring

## Deployment Architecture

**Production Requirements:**
- MongoDB Atlas (required in production)
- OpenAI API key with sufficient quota
- Razorpay account for payment processing
- SSL certificate for widget CORS compliance

**Platform Support:**
- Heroku (recommended, free tier available)
- Railway (automatic deployments)
- Render (GitHub integration)
- Any Node.js hosting with MongoDB access

**Security Features:**
- API key authentication (`cb_` prefixed keys)
- Rate limiting (100 requests per 15 minutes per IP)
- CORS configured for widget embedding on any HTTPS domain
- CSP headers for XSS protection
- Input validation and sanitization

## Multi-Tenant Features

The system supports agency/freelancer use cases:
- Professional plan: Up to 2 client tenants
- Enterprise plan: Unlimited client tenants
- White-label options with custom branding
- Dedicated billing and analytics per tenant
