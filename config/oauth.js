const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// OAuth Configuration
const OAUTH_CONFIG = {
    google: {
        clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
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
                    name: profile.displayName
                });

                // Check if user exists
                const existingUser = await DatabaseService.findUserByEmail(profile.emails[0].value);
                if (existingUser) {
                    console.log('✅ Existing user found, logging in');
                    existingUser.isNew = false; // Mark as existing user
                    return done(null, existingUser);
                }

                // Create new user from Google profile
                const newUser = await DatabaseService.createUser({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    provider: 'google',
                    providerId: profile.id,
                    avatar: profile.photos?.[0]?.value,
                    emailVerified: true, // Google emails are pre-verified
                    verificationStatus: {
                        email: true,
                        emailVerifiedAt: new Date()
                    }
                });

                console.log('🎉 New Google user created:', newUser.email);
                newUser.isNew = true; // Mark as new user
                return done(null, newUser);

            } catch (error) {
                console.error('❌ Google OAuth error:', error);
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
