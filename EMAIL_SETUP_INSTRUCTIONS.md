# Email Setup Instructions for OTP

## Overview
Your app now has a complete OTP-based signup and login flow with real email sending capabilities. Here's how to set it up:

## 1. Titan SMTP Setup (Recommended for support@mouna-ai.com)

If your mailbox is hosted on Titan (e.g., support@mouna-ai.com), configure SMTP with these environment variables in Railway:

```bash
# Required
EMAIL_PROVIDER=titan
EMAIL_USER=support@mouna-ai.com
EMAIL_PASS={{TITAN_APP_PASSWORD}}

# Optional overrides (defaults shown)
SMTP_HOST=smtp.titan.email
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_FROM=support@mouna-ai.com
```

Notes:
- Generate an app password in your Titan control panel, then set it as EMAIL_PASS.
- Keep EMAIL_PASS secret in Railway Variables. Do not commit it.
- The app automatically falls back to console logging if credentials are missing.

## 2. Gmail SMTP Setup

### Step 1: Enable 2-Factor Authentication on Gmail
1. Go to your Google Account settings
2. Security → 2-Step Verification
3. Turn on 2-Step Verification

### Step 2: Generate App Password
1. Go to Google Account settings
2. Security → 2-Step Verification → App passwords
3. Select app: Mail
4. Select device: Other (Custom name) → Enter "Mouna AI Chatbot"
5. Copy the 16-character app password

### Step 3: Set Environment Variables
Add these to your `.env` file or Railway environment:

```bash
EMAIL_USER=your-gmail-address@gmail.com
EMAIL_PASS=your-16-character-app-password
```

## 3. Alternative Email Services

### SendGrid (Production Recommended)
```bash
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### Mailgun
```bash
EMAIL_SERVICE=mailgun
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain
EMAIL_FROM=noreply@yourdomain.com
```

## 4. Railway Deployment

1. Go to your Railway dashboard
2. Select your project
3. Go to Variables tab
4. Add the email environment variables:
   - `EMAIL_USER` = your Gmail address
   - `EMAIL_PASS` = your Gmail app password

## 5. Testing the Setup

### Test Email Sending
Run this in your server console or create a test route:

```javascript
// Test email sending
const EmailService = require('./services/EmailService');

async function testEmail() {
    try {
        await EmailService.sendSignupOTPEmail('test@example.com', '123456');
        console.log('✅ Email test successful!');
    } catch (error) {
        console.error('❌ Email test failed:', error);
    }
}

testEmail();
```

### Test OTP Flow
1. Go to `/get-started`
2. Enter your email address
3. Check your inbox for the OTP email
4. Verify the OTP works
5. Complete account creation

## 6. Features Implemented

### Signup Flow
- ✅ Email validation with SMTP verification
- ✅ OTP generation and email sending
- ✅ Account creation only after email verification
- ✅ Beautiful welcome emails

### Google OAuth
- ✅ Proper `isNew` flag detection
- ✅ New users → Quick Setup page
- ✅ Existing users → Dashboard

### Email Templates
- ✅ Signup OTP email with modern design
- ✅ Login OTP email with security warnings
- ✅ Welcome email with feature highlights
- ✅ Consistent branding with gradient themes

### Security Features
- ✅ OTP expiration (10 minutes)
- ✅ Rate limiting on failed attempts
- ✅ Email existence verification
- ✅ Disposable email blocking

## 7. Current Status

Without email credentials, the system will:
- ✅ Generate OTPs correctly
- ✅ Store them in the database
- ⚠️ Log emails to console instead of sending them

With email credentials, the system will:
- ✅ Send real emails to users
- ✅ Complete the full signup flow
- ✅ Provide professional user experience

## 8. Monitoring & Debugging

### Server Logs
Watch for these log messages:
- `🔐 OTP generated and sent for pre-registration verification`
- `✅ Signup OTP email sent to:`
- `❌ Failed to send signup OTP email:`

### Email Service Status
The EmailService automatically falls back to console logging if credentials are missing. Check server startup logs for:
- `✅ Email transporter configured successfully`
- `⚠️ Email credentials not found. Email notifications will be logged to console.`

## 9. Next Steps

1. **Set up email credentials** (critical for production)
2. **Test the complete flow** with real emails
3. **Monitor email deliverability** and reputation
4. **Consider upgrading to SendGrid** for production scale
5. **Set up email analytics** to track open rates

## Troubleshooting

### Common Issues
1. **Gmail Authentication Error**: Make sure 2FA is enabled and you're using an app password
2. **Emails in Spam**: Configure SPF, DKIM records for your domain
3. **Rate Limiting**: Gmail has sending limits - consider SendGrid for high volume
4. **Firewall Issues**: Ensure port 587/465 is open for SMTP

### Support
If you encounter issues:
1. Check server logs for error messages
2. Verify environment variables are set correctly
3. Test with a simple email first
4. Consider using a dedicated email service for production
