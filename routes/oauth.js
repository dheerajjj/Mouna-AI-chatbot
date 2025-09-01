const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();
// Add OTP + Email services for post-OAuth verification step
const OTPService = require('../services/OTPService');
const EmailService = require('../services/EmailService');

// Helpers to validate and pass returnTo/next across the OAuth flow
function getAllowedOrigins() {
  const list = [];
  try {
    if (process.env.APP_ORIGIN && process.env.APP_ORIGIN.startsWith('http')) list.push(process.env.APP_ORIGIN.replace(/\/$/, ''));
  } catch (_) {}
  try {
    if (process.env.DEFAULT_APP_ORIGIN && process.env.DEFAULT_APP_ORIGIN.startsWith('http')) list.push(process.env.DEFAULT_APP_ORIGIN.replace(/\/$/, ''));
  } catch (_) {}
  try {
    if (process.env.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS.split(',').forEach(o => {
        const t = o.trim();
        if (t && /^https?:\/\//i.test(t)) list.push(t.replace(/\/$/, ''));
      });
    }
  } catch (_) {}
  // Common dev origins
  list.push('http://localhost:3000');
  list.push('http://127.0.0.1:3000');
  return Array.from(new Set(list));
}

function parseReturnParams(req) {
  const state = { };
  try {
    const allowed = getAllowedOrigins();
    const rawReturnTo = (req.query.returnTo || req.query.return_to || '').toString();
    const rawNext = (req.query.next || '').toString();
    if (rawReturnTo) {
      try {
        const u = new URL(rawReturnTo);
        const origin = `${u.protocol}//${u.host}`;
        if (allowed.includes(origin)) state.returnOrigin = origin;
      } catch (_) {}
    }
    if (rawNext && /^\//.test(rawNext)) {
      // Simple path validation to prevent open redirects
      state.nextPath = rawNext;
    }
  } catch (_) {}
  return state;
}

function encodeState(obj) {
  try {
    return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
  } catch (_) { return ''; }
}

function decodeState(s) {
  try {
    const json = Buffer.from(s, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch (_) { return {}; }
}

// Quick status endpoint to indicate whether Google OAuth is configured
// Add explicit CORS headers to avoid any proxy/policy variations blocking it
router.options('/status', (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  } catch (_) {}
  return res.sendStatus(204);
});
router.get('/status', (req, res) => {
  const enabled = !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id' && !!process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET !== 'your-google-client-secret';
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } catch (_) {}
  res.json({ googleEnabled: enabled });
});

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
router.get('/google', (req, res, next) => {
    try {
        // Build callback URL dynamically based on incoming host/protocol and the actual mount path (/auth or /api/auth)
        const rawProto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').toString();
        const proto = rawProto.split(',')[0].trim();
        const rawHost = (req.headers['x-forwarded-host'] || req.headers['host'] || '').toString();
        const host = rawHost.split(',')[0].trim();
        // Detect the mount path the router is under. Express sets baseUrl to the mount path.
        const mountPath = (req.baseUrl || '/auth').toString().replace(/\/$/, '');

        let callbackURL;
        if (host) {
            const baseUrl = `${proto}://${host}`.replace(/\/$/, '');
            callbackURL = `${baseUrl}${mountPath}/google/callback`;
        } else if (process.env.GOOGLE_CALLBACK_URL && process.env.GOOGLE_CALLBACK_URL.startsWith('http')) {
            callbackURL = process.env.GOOGLE_CALLBACK_URL;
        } else {
            // Absolute last resort (should not happen in production)
            callbackURL = 'http://localhost:3000/auth/google/callback';
        }

        // Carry returnTo/next across via OAuth state
        const stateObj = parseReturnParams(req);
        const state = encodeState(stateObj);

        return passport.authenticate('google', {
            scope: ['profile', 'email'],
            prompt: 'select_account',
            callbackURL,
            state: state || undefined
        })(req, res, next);
    } catch (initError) {
        console.error('❌ Error preparing Google OAuth request:', initError);
        return res.redirect(`${req.baseUrl || '/auth'}/failure?error=init_failed`);
    }
});

router.get('/google/callback', async (req, res, next) => {
    try {
        // Ensure the same callback URL shape is used during the callback handling
        const rawProto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').toString();
        const proto = rawProto.split(',')[0].trim();
        const rawHost = (req.headers['x-forwarded-host'] || req.headers['host'] || '').toString();
        const host = rawHost.split(',')[0].trim();
        const mountPath = (req.baseUrl || '/auth').toString().replace(/\/$/, '');

        let callbackURL;
        if (host) {
            const baseUrl = `${proto}://${host}`.replace(/\/$/, '');
            callbackURL = `${baseUrl}${mountPath}/google/callback`;
        } else if (process.env.GOOGLE_CALLBACK_URL && process.env.GOOGLE_CALLBACK_URL.startsWith('http')) {
            callbackURL = process.env.GOOGLE_CALLBACK_URL;
        } else {
            callbackURL = 'http://localhost:3000/auth/google/callback';
        }

        passport.authenticate('google', { callbackURL }, (err, user, info) => {
            if (err) {
                console.error('❌ Google OAuth passport error:', err);
                console.error('Error stack:', err.stack);
                return res.redirect(`${mountPath}/failure?error=passport_error`);
            }
            
            if (!user) {
                console.error('❌ Google OAuth no user returned:', info);
                return res.redirect(`${mountPath}/failure?error=no_user`);
            }
            
            try {
                // Successful authentication — REQUIRE OTP before issuing session
                console.log('✅ Google OAuth successful for:', user.email, 'isNew:', user.isNew);
                
                // Decode any returnTo/next state passed during auth initiation
                let returnOrigin = null;
                let nextPath = null;
                try {
                    if (req.query && req.query.state) {
                        const st = decodeState(req.query.state.toString());
                        if (st && typeof st === 'object') {
                            if (st.returnOrigin && /^https?:\/\//i.test(st.returnOrigin)) returnOrigin = st.returnOrigin.replace(/\/$/, '');
                            if (st.nextPath && /^\//.test(st.nextPath)) nextPath = st.nextPath;
                        }
                    }
                } catch (_) {}

                // Prefer front-end origin if configured, so users always land on the main site
                let frontOrigin = (process.env.APP_ORIGIN && process.env.APP_ORIGIN.startsWith('http'))
                    ? process.env.APP_ORIGIN.replace(/\/$/, '')
                    : null;
                // Robust fallback: if the current host is a Railway domain and APP_ORIGIN is not set,
                // send users to the public site (can be overridden via DEFAULT_APP_ORIGIN)
                try {
                    const hostForCallback = (req.headers['x-forwarded-host'] || req.headers['host'] || '').toString();
                    const defaultFront = (process.env.DEFAULT_APP_ORIGIN && process.env.DEFAULT_APP_ORIGIN.startsWith('http'))
                        ? process.env.DEFAULT_APP_ORIGIN.replace(/\/$/, '')
                        : 'https://www.mouna-ai.com';
                    if (!frontOrigin && /railway\.app$/i.test(hostForCallback)) {
                        frontOrigin = defaultFront;
                    }
                } catch (_) {}

                // Build destination (post-OTP) path
                let postLoginPath;
                if (user.isNew) {
                    console.log('🆕 New Google user created — will route to quick-setup after OTP');
                    postLoginPath = '/quick-setup';
                } else {
                    postLoginPath = '/dashboard';
                }
                // If a safe nextPath was provided, prefer it after OTP
                const redirectAfterOtp = (nextPath && /^\//.test(nextPath)) ? nextPath : postLoginPath;

                // Send Login OTP to user.email
                (async () => {
                    try {
                        const otp = await OTPService.generateAndStoreOTP(user.email, 'login');
                        await EmailService.sendLoginOTPEmail(user.email, user.name || 'there', otp);
                        console.log('🔐 Login OTP sent for Google OAuth user:', user.email);
                    } catch (otpErr) {
                        console.error('❌ Failed to send login OTP after Google OAuth:', otpErr);
                    }
                })();

                // Redirect to OTP verification page with flow=login
                const finalOrigin = returnOrigin || frontOrigin;
                const verifyPath = `/verify-otp?email=${encodeURIComponent(user.email)}&flow=login&provider=google&redirect=${encodeURIComponent(redirectAfterOtp)}`;
                if (finalOrigin) {
                    res.redirect(`${finalOrigin}${verifyPath}`);
                } else {
                    res.redirect(verifyPath);
                }
            } catch (tokenError) {
                console.error('❌ Google OAuth token generation error:', tokenError);
                console.error('Token error stack:', tokenError.stack);
                res.redirect(`${mountPath}/failure?error=token_generation_failed`);
            }
        })(req, res, next);
    } catch (routeError) {
        console.error('❌ Google OAuth route error:', routeError);
        console.error('Route error stack:', routeError.stack);
        res.redirect(`${req.baseUrl || '/auth'}/failure?error=route_error`);
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
