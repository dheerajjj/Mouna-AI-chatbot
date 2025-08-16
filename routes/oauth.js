const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Generate JWT token for authenticated user
const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user._id,
            email: user.email,
            name: user.name,
            provider: user.provider || 'email'
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
            issuer: 'ai-chatbot-widget',
            audience: 'chatbot-users'
        }
    );
};

// Google OAuth Routes
router.get('/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

router.get('/google/callback', async (req, res, next) => {
    try {
        passport.authenticate('google', (err, user, info) => {
            if (err) {
                console.error('❌ Google OAuth passport error:', err);
                console.error('Error stack:', err.stack);
                return res.redirect('/auth/failure?error=passport_error');
            }
            
            if (!user) {
                console.error('❌ Google OAuth no user returned:', info);
                return res.redirect('/auth/failure?error=no_user');
            }
            
            try {
                // Generate JWT token
                const token = generateToken(user);
                
                // Successful authentication
                console.log('✅ Google OAuth successful for:', user.email, 'isNew:', user.isNew);
                
                // Check if this is a new user (first-time signup)
                if (user.isNew) {
                    console.log('🆕 Redirecting new user to quick-setup');
                    // New user from Get Started page → go to Quick Setup with token
                    res.redirect(`/quick-setup?token=${encodeURIComponent(token)}&provider=google&new=true`);
                } else {
                    console.log('👤 Redirecting existing user to dashboard');
                    // Existing user → go to dashboard with token
                    res.redirect(`/dashboard?token=${encodeURIComponent(token)}&provider=google`);
                }
            } catch (tokenError) {
                console.error('❌ Google OAuth token generation error:', tokenError);
                console.error('Token error stack:', tokenError.stack);
                res.redirect('/auth/failure?error=token_generation_failed');
            }
        })(req, res, next);
    } catch (routeError) {
        console.error('❌ Google OAuth route error:', routeError);
        console.error('Route error stack:', routeError.stack);
        res.redirect('/auth/failure?error=route_error');
    }
});


// OAuth success page
router.get('/success', (req, res) => {
    const { provider, token, name } = req.query;
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>OAuth Success</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                max-width: 400px;
            }
            .success-icon {
                width: 60px;
                height: 60px;
                background: #10b981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                color: white;
                font-size: 24px;
            }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; margin-bottom: 30px; }
            .btn {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                text-decoration: none;
                display: inline-block;
                font-weight: 600;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">✓</div>
            <h1>Welcome, ${name || 'User'}!</h1>
            <p>You've successfully signed in with ${provider}.</p>
            <a href="/dashboard" class="btn">Continue to Dashboard</a>
        </div>
        <script>
            // Store token in localStorage for demo purposes
            // In production, use httpOnly cookies for security
            if ('${token}') {
                localStorage.setItem('authToken', '${token}');
            }
        </script>
    </body>
    </html>
    `);
});

// OAuth failure page
router.get('/failure', (req, res) => {
    const { error } = req.query;
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>OAuth Failed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                max-width: 400px;
            }
            .error-icon {
                width: 60px;
                height: 60px;
                background: #ef4444;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                color: white;
                font-size: 24px;
            }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; margin-bottom: 30px; }
            .btn {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                text-decoration: none;
                display: inline-block;
                font-weight: 600;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error-icon">×</div>
            <h1>Authentication Failed</h1>
            <p>Sorry, we couldn't sign you in. ${error ? `Error: ${error}` : 'Please try again.'}</p>
            <a href="/get-started" class="btn">Back to Get Started</a>
        </div>
    </body>
    </html>
    `);
});

module.exports = router;
