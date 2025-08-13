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

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/signup?error=google_auth_failed' }),
    async (req, res) => {
        try {
            // Generate JWT token
            const token = generateToken(req.user);
            
            // Successful authentication
            console.log('✅ Google OAuth successful for:', req.user.email);
            
            // Redirect with token - in a real app, you might want to set this as an httpOnly cookie
            res.redirect(`/welcome-dashboard?token=${token}&provider=google&name=${encodeURIComponent(req.user.name)}`);
        } catch (error) {
            console.error('❌ Google OAuth callback error:', error);
            res.redirect('/signup?error=auth_callback_failed');
        }
    }
);


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
            <a href="/signup" class="btn">Back to Sign Up</a>
        </div>
    </body>
    </html>
    `);
});

module.exports = router;
