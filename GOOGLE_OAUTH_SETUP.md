# 🔐 Google OAuth 2.0 Setup Guide for AI Chatbot Platform

This guide will walk you through setting up Google OAuth 2.0 authentication for your AI chatbot platform.

## 📋 Prerequisites
- Google account
- Your AI chatbot server running on `http://localhost:3000`

## 🚀 Phase 1: Google Cloud Console Setup

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with your Google account

### Step 2: Create or Select a Project
1. Click the project dropdown at the top of the page (next to "Google Cloud")
2. **Create New Project:**
   - Click "NEW PROJECT"
   - Project name: `AI-Chatbot-Platform` (or your choice)
   - Leave organization as default
   - Click "CREATE"
   - Wait 1-2 minutes for project creation

### Step 3: Enable Required APIs
1. Make sure your new project is selected (check the dropdown)
2. In the left sidebar: **"APIs & Services" > "Library"**
3. Search for and enable these APIs:
   - **"Google+ API"** - Click "ENABLE"
   - **"People API"** - Click "ENABLE" (recommended)

### Step 4: Configure OAuth Consent Screen
1. Go to **"APIs & Services" > "OAuth consent screen"**
2. Choose **"External"** (allows any Google user to sign in)
3. Click **"CREATE"**
4. Fill out the required fields:
   ```
   App name: AI Chatbot Platform
   User support email: [your-gmail@gmail.com]
   App logo: [optional - skip for now]
   App domain: http://localhost:3000
   Authorized domains: localhost
   Developer contact: [your-gmail@gmail.com]
   ```
5. Click **"SAVE AND CONTINUE"**

6. **Scopes Screen:**
   - Click "ADD OR REMOVE SCOPES"
   - Select these scopes:
     - ✅ `../auth/userinfo.email`
     - ✅ `../auth/userinfo.profile`
   - Click "UPDATE"
   - Click "SAVE AND CONTINUE"

7. **Test Users Screen:**
   - Add your Gmail address for testing
   - Add any other test accounts you want to use
   - Click "SAVE AND CONTINUE"

8. **Summary Screen:**
   - Review your settings
   - Click "BACK TO DASHBOARD"

### Step 5: Create OAuth 2.0 Credentials
1. Go to **"APIs & Services" > "Credentials"**
2. Click **"+ CREATE CREDENTIALS" > "OAuth client ID"**
3. Application type: **"Web application"**
4. Fill out the form:
   ```
   Name: AI Chatbot OAuth Client
   
   Authorized JavaScript origins:
   - http://localhost:3000
   - http://127.0.0.1:3000
   
   Authorized redirect URIs:
   - http://localhost:3000/auth/google/callback
   ```
5. Click **"CREATE"**

### Step 6: Save Your Credentials
You'll see a popup with your credentials:
```
Client ID: [long string ending in .apps.googleusercontent.com]
Client Secret: [random string]
```

**🚨 IMPORTANT: Copy these immediately and keep them secure!**

## 🔧 Phase 2: Integration with Your App

### Step 7: Update Your .env File
1. Open your `.env` file in your AI chatbot project
2. Replace the placeholder values with your actual credentials:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=1234567890-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz123456
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### Step 8: Test Your Setup
1. **Start your server:**
   ```bash
   npm start
   ```

2. **Check the logs - you should see:**
   ```
   ✅ Google OAuth strategy configured successfully
   ```
   (Instead of the warning about missing credentials)

3. **Test the OAuth flow:**
   - Open browser: `http://localhost:3000/signup`
   - Click the "Continue with Gmail" button
   - You should be redirected to Google's login page
   - After logging in, you should be redirected back to your success page

## 🧪 Testing Scenarios

### Successful Login Flow:
1. `http://localhost:3000/signup` → Social login page
2. Click "Gmail" → Redirects to Google OAuth
3. Login with Google → Redirects to Google consent screen
4. Grant permissions → Redirects to `http://localhost:3000/auth-success.html`
5. Success page shows user info and redirects to dashboard

### Common Issues & Solutions:

#### Issue: "Error 400: redirect_uri_mismatch"
**Solution:** 
- Double-check your redirect URI in Google Cloud Console
- Must be exactly: `http://localhost:3000/auth/google/callback`
- No trailing slashes, correct port number

#### Issue: "This app isn't verified"
**Solution:** 
- This is normal for development
- Click "Advanced" → "Go to AI Chatbot Platform (unsafe)"
- For production, you'll need to verify your app

#### Issue: "Access blocked"
**Solution:**
- Make sure you added your email to the "Test users" section
- Ensure the OAuth consent screen is properly configured

## 🚀 Production Deployment

### For Production Use:
1. **Domain Setup:**
   - Update `GOOGLE_CALLBACK_URL` to your production domain
   - Add your production domain to authorized origins
   - Update authorized redirect URIs

2. **App Verification:**
   - Submit your app for Google verification
   - Add privacy policy and terms of service URLs
   - Complete the verification process

3. **Security:**
   - Use environment variables (never commit credentials to git)
   - Implement proper HTTPS
   - Set secure session cookies

## 📝 Next Steps After Setup

Once Google OAuth is working:

1. **Test with multiple accounts**
2. **Set up other OAuth providers** (Microsoft, Yahoo, Apple)
3. **Customize the user experience**
4. **Add user profile management**
5. **Implement role-based access control**

## 🆘 Need Help?

If you encounter issues:

1. **Check server logs** for detailed error messages
2. **Verify all URLs** match exactly in Google Cloud Console
3. **Ensure your project is selected** in Google Cloud Console
4. **Double-check environment variables** are loaded correctly

## 📞 Support

Your OAuth system is now ready to handle Google authentication securely and professionally! 🎉

---

**Security Note:** Never share your Client Secret publicly. Keep your `.env` file secure and add it to `.gitignore`.
