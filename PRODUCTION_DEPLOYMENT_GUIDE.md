# 🚀 Production Deployment Guide - Mouna AI Chatbot Widget

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Code Updates for Production](#code-updates-for-production)
5. [Deployment Platforms](#deployment-platforms)
6. [Post-Deployment Testing](#post-deployment-testing)
7. [Troubleshooting](#troubleshooting)

---

## 📋 Pre-Deployment Checklist

### ✅ Essential Requirements
- [ ] MongoDB database (local or cloud like MongoDB Atlas)
- [ ] Node.js environment (v14+ recommended)
- [ ] Domain name or hosting platform
- [ ] SSL certificate (HTTPS required for OAuth)
- [ ] Email service setup (Gmail/SendGrid/etc.)

### ✅ Optional Services
- [ ] Google OAuth credentials
- [ ] Microsoft OAuth credentials
- [ ] Yahoo OAuth credentials
- [ ] Stripe/Razorpay payment gateway
- [ ] CDN for static assets

---

## 🔧 Environment Configuration

### 1. Create `.env` file in production
```bash
# === CORE CONFIGURATION ===
NODE_ENV=production
PORT=3000

# === DATABASE ===
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-chatbot-widget?retryWrites=true&w=majority

# === SECURITY ===
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
ENCRYPTION_KEY=your-32-character-encryption-key-here

# === DOMAIN CONFIGURATION ===
FRONTEND_URL=https://your-domain.com
API_BASE_URL=https://your-domain.com

# === EMAIL SERVICE ===
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=noreply@your-domain.com

# === OAUTH CREDENTIALS (Optional) ===
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

MICROSOFT_CLIENT_ID=your-microsoft-application-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

YAHOO_CLIENT_ID=your-yahoo-client-id
YAHOO_CLIENT_SECRET=your-yahoo-client-secret

# === PAYMENT GATEWAYS (Optional) ===
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

RAZORPAY_KEY_ID=rzp_live_your-razorpay-key
RAZORPAY_SECRET=your-razorpay-secret

# === RATE LIMITING ===
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# === SESSION ===
SESSION_SECRET=your-session-secret-key-here
```

---

## 🗄️ Database Setup

### Option 1: MongoDB Atlas (Cloud - Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free cluster
3. Create database user
4. Whitelist your IP (or 0.0.0.0/0 for production)
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/ai-chatbot-widget`

### Option 2: Local MongoDB
```bash
# Install MongoDB
# Ubuntu/Debian:
sudo apt update
sudo apt install -y mongodb

# CentOS/RHEL:
sudo yum install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Database Initialization
The app will automatically create collections on first run. Test connection:
```bash
node check-users.js
```

---

## 📝 Code Updates for Production

### 1. Update Widget API Endpoint
**File: `public/widget-fixed.js`** (Line 139)
```javascript
// CHANGE FROM:
apiEndpoint: window.ChatbotWidgetAPI || 'http://localhost:3000',

// CHANGE TO:
apiEndpoint: window.ChatbotWidgetAPI || 'https://your-domain.com',
```

### 2. Update OAuth Redirect URLs
**File: `config/oauth.js`**
```javascript
// CHANGE FROM:
redirectUri: 'http://localhost:3000/oauth/google/callback',

// CHANGE TO:
redirectUri: 'https://your-domain.com/oauth/google/callback',
```

### 3. Update CORS Configuration
**File: `server-mongo.js`** (around line 45)
```javascript
// CHANGE FROM:
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
};

// CHANGE TO:
const corsOptions = {
    origin: [
        'https://your-domain.com',
        'https://www.your-domain.com',
        // Add any additional domains that will use your widget
    ],
    credentials: true
};
```

### 4. Update Integration Examples
**File: `public/integration.html`** (Line 347)
```html
<!-- CHANGE FROM: -->
<script src="http://localhost:3000/widget-fixed.js"
        data-api-key="YOUR_API_KEY"></script>

<!-- CHANGE TO: -->
<script src="https://your-domain.com/widget-fixed.js"
        data-api-key="YOUR_API_KEY"></script>
```

---

## 🌐 Deployment Platforms

### Option 1: Vercel (Recommended for beginners)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
```

**vercel.json:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server-mongo.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server-mongo.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Option 2: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Option 3: Render
1. Connect GitHub repository
2. Set environment variables
3. Use build command: `npm install`
4. Use start command: `node server-mongo.js`

### Option 4: DigitalOcean App Platform
1. Create new app from GitHub
2. Configure environment variables
3. Set build and run commands

### Option 5: AWS/GCP/Azure
Use their respective Node.js deployment guides with the environment variables above.

---

## 🧪 Post-Deployment Testing

### 1. API Health Check
```bash
curl https://your-domain.com/health
# Should return: {"status":"OK","timestamp":"..."}
```

### 2. User Registration Test
1. Visit `https://your-domain.com/signup`
2. Register new user
3. Check email for OTP
4. Complete verification

### 3. Widget Integration Test
Create `test-widget.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Widget Test</title>
</head>
<body>
    <h1>Testing Mouna AI Widget</h1>
    <p>The chatbot should appear in bottom-right corner.</p>
    
    <script src="https://your-domain.com/widget-fixed.js"
            data-api-key="YOUR_ACTUAL_API_KEY_FROM_DASHBOARD"
            data-primary-color="#0d7b8a"
            data-position="bottom-right">
    </script>
</body>
</html>
```

### 4. Dashboard Test
1. Login at `https://your-domain.com/login`
2. Access dashboard at `https://your-domain.com/welcome-dashboard`
3. Copy API key from dashboard
4. Test widget integration

### 5. Payment Test (if enabled)
1. Visit `https://your-domain.com/pricing`
2. Select a plan
3. Complete test payment
4. Verify plan upgrade in dashboard

---

## 🔧 OAuth Setup (Optional)

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-domain.com/oauth/google/callback`
6. Add authorized origins:
   - `https://your-domain.com`

### Microsoft OAuth
1. Go to [Azure App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps)
2. Create new registration
3. Add redirect URI: `https://your-domain.com/oauth/microsoft/callback`
4. Generate client secret
5. Note Application (client) ID

### Yahoo OAuth
1. Go to [Yahoo Developer Network](https://developer.yahoo.com/apps/)
2. Create new app
3. Add redirect URI: `https://your-domain.com/oauth/yahoo/callback`
4. Get Client ID and Secret

---

## 📧 Email Service Setup

### Gmail App Password
1. Enable 2-Factor Authentication on Gmail
2. Go to Google Account Settings
3. Security → 2-Step Verification → App passwords
4. Generate app password for "Mail"
5. Use this password in `EMAIL_PASS`

### SendGrid (Alternative)
```bash
npm install @sendgrid/mail
```

Update email service in your code if needed.

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. Widget Not Loading
**Problem:** Widget doesn't appear on client websites
**Solution:**
- Check CORS configuration
- Verify widget URL is correct
- Check browser console for errors
- Ensure API key is valid

#### 2. Database Connection Failed
**Problem:** MongoDB connection errors
**Solution:**
```javascript
// Add retry logic in server-mongo.js
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};
```

#### 3. OAuth Redirect Issues
**Problem:** OAuth callbacks fail
**Solution:**
- Verify redirect URIs match exactly
- Ensure HTTPS is enabled
- Check OAuth app configuration

#### 4. Email Not Sending
**Problem:** OTP emails not delivered
**Solution:**
- Verify email credentials
- Check spam folder
- Test email service separately
- Ensure app passwords are used (Gmail)

#### 5. Widget API Errors
**Problem:** Chat responses not working
**Solution:**
- Check API key validity
- Verify rate limits
- Test API endpoints directly
- Check server logs

### Debugging Commands
```bash
# Check application logs
npm run logs

# Test database connection
node check-users.js

# Verify environment variables
node -e "console.log(process.env)"

# Test email service
node -e "
const nodemailer = require('nodemailer');
// Add email test code
"
```

---

## 📊 Monitoring & Maintenance

### 1. Log Monitoring
- Set up log aggregation (LogRocket, Sentry)
- Monitor error rates
- Track API usage

### 2. Performance Monitoring
- Monitor response times
- Database query performance
- Widget loading speed

### 3. Security Monitoring
- Rate limit effectiveness
- Failed authentication attempts
- Unusual API usage patterns

### 4. Backup Strategy
- Database backups (daily recommended)
- Code repository backups
- Environment variable backups (securely)

---

## 🚀 Going Live Checklist

### Final Steps Before Launch:
- [ ] All environment variables configured
- [ ] Domain SSL certificate active
- [ ] Database connection tested
- [ ] OAuth providers configured (if using)
- [ ] Email service working
- [ ] Widget integration tested on multiple sites
- [ ] Payment gateway tested (if using)
- [ ] Monitoring and logging setup
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security audit completed

### Post-Launch:
- [ ] Monitor error rates
- [ ] Check widget performance
- [ ] Verify email delivery
- [ ] Monitor database performance
- [ ] Test user registrations
- [ ] Check payment processing (if enabled)
- [ ] Set up alerts for critical issues

---

## 📞 Support & Resources

### Documentation Links:
- [MongoDB Atlas Setup](https://docs.atlas.mongodb.com/getting-started/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Vercel Deployment](https://vercel.com/docs/concepts/deployments/overview)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

### Need Help?
- Check application logs first
- Review this guide step by step
- Test components individually
- Check GitHub issues for common problems

---

**🎉 Congratulations! Your Mouna AI Chatbot Widget is now production-ready!**

Remember to keep your environment variables secure and never commit them to your repository. Your application now features a beautiful dark teal-purple theme, comprehensive authentication, multi-language support, and a robust chatbot widget system.
