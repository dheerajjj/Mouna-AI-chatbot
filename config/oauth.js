const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// OAuth Configuration
const APP_ORIGIN = (process.env.APP_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');
const OAUTH_CONFIG = {
    google: {
        clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
        // Prefer explicit GOOGLE_CALLBACK_URL; otherwise derive from APP_ORIGIN
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `${APP_ORIGIN}/auth/google/callback`
    }
};

// Initialize Passport strategies only if credentials are provided
function initializeOAuth(DatabaseService) {
    // Passport session setup
    passport.serializeUser((user, done) => {
        done(null, user.id || user._id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await DatabaseService.findUserById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });

    // Google Strategy
    if (OAUTH_CONFIG.google.clientID && OAUTH_CONFIG.google.clientID !== 'your-google-client-id') {
        passport.use('google', new GoogleStrategy({
            clientID: OAUTH_CONFIG.google.clientID,
            clientSecret: OAUTH_CONFIG.google.clientSecret,
            callbackURL: OAUTH_CONFIG.google.callbackURL,
            scope: ['profile', 'email']
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                console.log('🔐 Google OAuth callback received:', {
                    id: profile.id,
                    email: profile.emails?.[0]?.value,
                    name: profile.displayName,
                    photos: profile.photos?.[0]?.value
                });

                const userEmail = profile.emails?.[0]?.value;
                if (!userEmail) {
                    console.error('❌ No email found in Google profile');
                    return done(new Error('No email found in Google profile'), null);
                }

                // Check if user exists
                const existingUser = await DatabaseService.findUserByEmail(userEmail);
                if (existingUser) {
                    console.log('✅ Existing user found, logging in:', userEmail);
                    // Update last login
                    existingUser.lastLoginAt = new Date();
                    await DatabaseService.updateUser(existingUser._id, { lastLoginAt: new Date() });
                    existingUser.isNew = false; // Mark as existing user
                    return done(null, existingUser);
                }

                // Create new user from Google profile
                console.log('🆕 Creating new Google user:', userEmail);
                const newUser = await DatabaseService.createUser({
                    name: profile.displayName,
                    email: userEmail,
                    password: 'google-oauth-' + Math.random().toString(36), // Random password for Google users
                    provider: 'google',
                    providerId: profile.id,
                    avatar: profile.photos?.[0]?.value,
                    emailVerified: true, // Google emails are pre-verified
                    verificationStatus: {
                        email: true,
                        emailVerifiedAt: new Date()
                    },
                    company: '', // Will be filled in quick setup
                    website: '', // Will be filled in quick setup
                    phone: '' // Will be filled in quick setup
                });

                console.log('🎉 New Google user created successfully:', newUser.email);
                newUser.isNew = true; // Mark as new user
                return done(null, newUser);

            } catch (error) {
                console.error('❌ Google OAuth strategy error:', error);
                console.error('Error details:', error.message);
                return done(error, null);
            }
        }));
        console.log('✅ Google OAuth strategy configured successfully');
    } else {
        console.log('⚠️ Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
        console.log('   Set these environment variables to enable Google OAuth:');
        console.log('   GOOGLE_CLIENT_ID=your_google_client_id');
        console.log('   GOOGLE_CLIENT_SECRET=your_google_client_secret');
    }


    return passport;
}

module.exports = {
    OAUTH_CONFIG,
    initializeOAuth
};
