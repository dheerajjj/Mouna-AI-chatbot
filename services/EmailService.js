const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  getSenderAddress() {
    const name = process.env.EMAIL_FROM_NAME || 'Mouna AI';
    const userAddr = process.env.SMTP_USER || process.env.EMAIL_USER;
    const fallback = process.env.EMAIL_FROM || 'support@mouna-ai.com';
    return userAddr ? `${name} <${userAddr}>` : `${name} <${fallback}>`;
  }

  initialize() {
    // Prefer explicit SMTP settings if provided (Railway/Titan friendly)
    const provider = (process.env.EMAIL_PROVIDER || process.env.EMAIL_SERVICE || '').toLowerCase();
    const hasSmtpVars = !!(process.env.SMTP_HOST || process.env.SMTP_PORT || process.env.SMTP_SECURE);

    try {
      if (hasSmtpVars || provider === 'smtp' || provider === 'titan' || (process.env.EMAIL_USER && /@mouna-ai\.com$/i.test(process.env.EMAIL_USER))) {
        const host = process.env.SMTP_HOST || (provider === 'titan' || (process.env.EMAIL_USER && /@mouna-ai\.com$/i.test(process.env.EMAIL_USER)) ? 'smtp.titan.email' : 'smtp.gmail.com');
        const port = parseInt(process.env.SMTP_PORT || (host === 'smtp.titan.email' ? '587' : '587'), 10);
        const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true' || port === 465; // true for 465, false for 587
        const user = process.env.SMTP_USER || process.env.EMAIL_USER;
        const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

        if (user && pass) {
          this.transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            pool: true,
            maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS || '3', 10),
            maxMessages: parseInt(process.env.SMTP_MAX_MESSAGES || '100', 10),
            requireTLS: (process.env.SMTP_REQUIRE_TLS || 'true').toLowerCase() === 'true',
            tls: { ciphers: process.env.SMTP_CIPHERS || 'TLSv1.2' },
            auth: { user, pass }
          });
          console.log(`✅ Email transporter configured (SMTP: ${host}:${port}, secure=${secure}, pool=true)`);
        }
      }

      // Fallback to Gmail service if not configured above and creds exist
      if (!this.transporter && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          pool: true,
          maxConnections: 2,
          maxMessages: 100,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
        console.log('✅ Email transporter configured (Gmail service, pooled)');
      }
    } catch (initErr) {
      console.warn('⚠️ Failed to initialize SMTP transporter:', initErr.message);
      this.transporter = null;
    }

    // Fallback to console logging if email credentials are not provided
    if (!this.transporter) {
      console.log('⚠️ Email credentials not found or invalid. Email notifications will be logged to console.');
      this.transporter = {
        sendMail: (options) => {
          console.log('📧 EMAIL WOULD BE SENT:');
          console.log('📧 From:', options.from);
          console.log('📧 To:', options.to);
          console.log('📧 Subject:', options.subject);
          if (options.text) console.log('📧 Text:', options.text);
          if (options.html) console.log('📧 HTML length:', options.html.length);
          console.log('📧 ========================');
          return Promise.resolve({ messageId: 'mock-id' });
        },
        verify: async () => true
      };
    }

    // Proactively verify transporter when available
    try {
      if (this.transporter && typeof this.transporter.verify === 'function') {
        this.transporter.verify().then(() => {
          console.log('✅ Email transporter verified connection and credentials');
        }).catch(err => {
          console.error('❌ Email transporter verification failed:', err.message);
        });
      }
    } catch (_) {}
  }

  async sendWelcomeEmail(userEmail, userName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'support@mouna-ai.com',
      to: userEmail,
      subject: 'Welcome to Mouna AI Chatbot Platform! 🤖',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .features { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 Welcome to Mouna AI!</h1>
              <p>Your intelligent chatbot companion</p>
            </div>
            <div class="content">
              <h2>Hello ${userName}! 👋</h2>
              <p>Thank you for joining Mouna AI Chatbot Platform. We're excited to help you create amazing conversational experiences for your website visitors!</p>
              
              <div class="features">
                <h3>🚀 What's Next?</h3>
                <ul>
                  <li><strong>Choose your plan:</strong> Start with our free tier or upgrade anytime</li>
                  <li><strong>Customize your chatbot:</strong> Personalize colors, messages, and behavior</li>
                  <li><strong>Configure responses:</strong> Set up intelligent chat prompts</li>
                  <li><strong>Embed on your site:</strong> Add the widget with a simple code snippet</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="https://five-coat-production.up.railway.app/dashboard" class="cta-button">
                  Go to Dashboard →
                </a>
              </div>

              <div class="features">
                <h3>✨ Key Features</h3>
                <ul>
                  <li>🌍 24/7 Availability</li>
                  <li>🗣️ Multi-language Support</li>
                  <li>🧠 Smart Context Understanding</li>
                  <li>📱 Seamless Human Handoff</li>
                  <li>📊 Analytics & Insights</li>
                </ul>
              </div>

              <p>Need help getting started? Our support team is here to assist you every step of the way.</p>
              
              <p>Best regards,<br>The Mouna AI Team</p>
            </div>
            <div class="footer">
              <p>© 2025 Mouna AI Chatbot Platform. All rights reserved.</p>
              <p>This email was sent to ${userEmail}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Mouna AI Chatbot Platform!
        
        Hello ${userName}!
        
        Thank you for joining Mouna AI. We're excited to help you create amazing conversational experiences.
        
        What's Next?
        - Choose your plan: Start with our free tier or upgrade anytime
        - Customize your chatbot: Personalize colors, messages, and behavior  
        - Configure responses: Set up intelligent chat prompts
        - Embed on your site: Add the widget with a simple code snippet
        
        Get started: https://five-coat-production.up.railway.app/dashboard
        
        Best regards,
        The Mouna AI Team
      `
    };

    try {
      const result = await this.sendInternal(mailOptions);
      console.log('✅ Welcome email sent to:', userEmail);
      return result;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      throw error;
    }
  }

  async sendOTPEmail(userEmail, userName, otp) {
    const mailOptions = {
      from: this.getSenderAddress(),
      replyTo: process.env.REPLY_TO || 'support@mouna-ai.com',
      to: userEmail,
      subject: 'Your OTP for Mouna AI Registration',
      priority: 'high',
      headers: {
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'Priority': 'urgent',
        'Precedence': 'urgent'
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { background: white; border: 2px solid #667eea; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .otp-number { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Email Verification</h1>
              <p>Mouna AI Chatbot Platform</p>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>Please use the following OTP to complete your registration:</p>
              
              <div class="otp-code">
                <div class="otp-number">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #666;">This code expires in 10 minutes</p>
              </div>

              <p><strong>Important:</strong> Never share this code with anyone. Our team will never ask for your OTP.</p>
              
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 Mouna AI Chatbot Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Email Verification - Mouna AI
        
        Hello ${userName}!
        
        Your OTP code: ${otp}
        
        This code expires in 10 minutes.
        
        Never share this code with anyone.
        
        © 2025 Mouna AI Chatbot Platform
      `
    };

    try {
      const result = await this.sendInternal(mailOptions);
      console.log('✅ OTP email sent to:', userEmail);
      return result;
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      throw error;
    }
  }

  async sendSignupOTPEmail(userEmail, otp) {
    const userName = userEmail.split('@')[0]; // Use email prefix as name
    const mailOptions = {
      from: this.getSenderAddress(),
      replyTo: process.env.REPLY_TO || 'support@mouna-ai.com',
      to: userEmail,
      subject: '🚀 Welcome to Mouna AI - Email Verification',
      priority: 'high',
      headers: {
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'Priority': 'urgent',
        'Precedence': 'urgent'
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0d7b8a, #4a0e6b); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { background: white; border: 2px solid #0d7b8a; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .otp-number { font-size: 32px; font-weight: bold; color: #0d7b8a; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Welcome to Mouna AI!</h1>
              <p>Complete Your Registration</p>
            </div>
            <div class="content">
              <h2>Hello there! 👋</h2>
              <p>Thank you for joining Mouna AI Chatbot Platform. Please use the following verification code to complete your registration:</p>
              
              <div class="otp-code">
                <div class="otp-number">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #666;">This code expires in 10 minutes</p>
              </div>

              <p><strong>Important:</strong> Never share this code with anyone. Our team will never ask for your OTP.</p>
              
              <p>Once verified, you'll be able to create your personalized AI chatbot and start engaging with your website visitors!</p>
              
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 Mouna AI Chatbot Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Mouna AI - Email Verification
        
        Hello there!
        
        Your verification code: ${otp}
        
        This code expires in 10 minutes.
        
        Never share this code with anyone.
        
        © 2025 Mouna AI Chatbot Platform
      `
    };

    try {
      const result = await this.sendInternal(mailOptions);
      console.log('✅ Signup OTP email sent to:', userEmail);
      return result;
    } catch (error) {
      console.error('❌ Failed to send signup OTP email:', error);
      throw error;
    }
  }

  async sendLoginOTPEmail(userEmail, userName, otp) {
    const mailOptions = {
      from: this.getSenderAddress(),
      replyTo: process.env.REPLY_TO || 'support@mouna-ai.com',
      to: userEmail,
      subject: '🔐 Login Verification Code - Mouna AI',
      priority: 'high',
      headers: {
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'Priority': 'urgent',
        'Precedence': 'urgent'
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { background: white; border: 2px solid #e74c3c; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .otp-number { font-size: 32px; font-weight: bold; color: #e74c3c; letter-spacing: 8px; }
            .security-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Login Verification</h1>
              <p>Two-Factor Authentication</p>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>Someone is trying to log into your Mouna AI account. Please use the following verification code to complete your login:</p>
              
              <div class="otp-code">
                <div class="otp-number">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #666;">This code expires in 10 minutes</p>
              </div>

              <div class="security-notice">
                <p><strong>⚠️ Security Notice:</strong></p>
                <ul>
                  <li>Never share this code with anyone</li>
                  <li>Our team will never ask for your verification code</li>
                  <li>If you didn't try to log in, please secure your account immediately</li>
                </ul>
              </div>
              
              <p>If you didn't attempt to log in, please ignore this email and consider changing your password.</p>
            </div>
            <div class="footer">
              <p>© 2025 Mouna AI Chatbot Platform. All rights reserved.</p>
              <p>This login attempt was from IP: [IP will be logged]</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Login Verification - Mouna AI
        
        Hello ${userName}!
        
        Someone is trying to log into your account.
        
        Your verification code: ${otp}
        
        This code expires in 10 minutes.
        
        Security Notice:
        - Never share this code with anyone
        - Our team will never ask for your verification code
        - If you didn't try to log in, please secure your account
        
        © 2025 Mouna AI Chatbot Platform
      `
    };

    try {
      const result = await this.sendInternal(mailOptions);
      console.log('✅ Login OTP email sent to:', userEmail);
      return result;
    } catch (error) {
      console.error('❌ Failed to send login OTP email:', error);
      throw error;
    }
  }

  async verifyTransport() {
    if (!this.transporter || typeof this.transporter.verify !== 'function') {
      console.warn('⚠️ Email transporter verify not available (using console fallback).');
      return false;
    }
    try {
      await this.transporter.verify();
      console.log('✅ Email transporter verified connection and credentials');
      return true;
    } catch (err) {
      console.error('❌ Email transporter verification failed:', err.message);
      return false;
    }
  }
  // Generic email sender for reusable emails (used by various features)
  async sendEmail({ to, subject, text, html, from }) {
    const mailOptions = {
      from: from || process.env.EMAIL_FROM || process.env.EMAIL_USER || 'support@mouna-ai.com',
      to,
      subject,
      text,
      html
    };
    try {
      const result = await this.sendInternal(mailOptions);
      console.log('✅ Email sent to:', to, 'subject:', subject);
      return result;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw error;
    }
  }

  // Internal send function with SendGrid HTTP API fallback (avoids blocked SMTP)
  async sendInternal(mailOptions) {
    const useSendgrid = !!process.env.SENDGRID_API_KEY;
    if (useSendgrid) {
      try {
        // Build SendGrid payload
        const payload = {
          personalizations: [
            {
              to: [{ email: mailOptions.to }],
              subject: mailOptions.subject,
              headers: {
                'X-Priority': '1 (Highest)',
                'X-MSMail-Priority': 'High',
                'Importance': 'High'
              }
            }
          ],
          from: { email: (mailOptions.from?.address || mailOptions.from || (process.env.EMAIL_USER || 'support@mouna-ai.com')) },
          reply_to: mailOptions.replyTo ? { email: mailOptions.replyTo } : undefined,
          categories: ['otp','transactional'],
          mail_settings: {
            sandbox_mode: { enable: false }
          },
          tracking_settings: {
            click_tracking: { enable: false, enable_text: false },
            open_tracking: { enable: false }
          },
          content: []
        };
        // SendGrid requires text/plain first, then text/html
        if (mailOptions.text) payload.content.push({ type: 'text/plain', value: mailOptions.text });
        if (mailOptions.html) payload.content.push({ type: 'text/html', value: mailOptions.html });
        if (!payload.content.length && mailOptions.subject) {
          payload.content.push({ type: 'text/plain', value: mailOptions.subject });
        }

        // Add an 8s timeout to avoid long hangs in production
        const controller = new AbortController();
        const timeoutMs = parseInt(process.env.EMAIL_TIMEOUT_MS || '8000', 10);
        const t = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(t);
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`SendGrid API error ${res.status}: ${text}`);
          }
          return { messageId: res.headers.get('x-message-id') || 'sendgrid-http' };
        } catch (e) {
          clearTimeout(t);
          throw e;
        }
      } catch (apiErr) {
        console.error('❌ SendGrid HTTP API failed:', apiErr.message);
        // Fall through to SMTP as a secondary attempt
      }
    }

    // Default to transporter with timeout/fallback
    const sendTimeout = parseInt(process.env.EMAIL_TIMEOUT_MS || '8000', 10);
    try {
      const result = await Promise.race([
        this.transporter.sendMail(mailOptions),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP send timeout')), sendTimeout))
      ]);
      return result;
    } catch (smtpErr) {
      console.warn('⚠️ SMTP send failed/timeout, logging email to console instead:', smtpErr.message);
      // Last-resort console log so we never block requests
      try {
        console.log('📧 FALLBACK EMAIL LOG:', {
          to: mailOptions.to,
          subject: mailOptions.subject,
          text: mailOptions.text ? mailOptions.text.slice(0, 200) : undefined,
          htmlLength: mailOptions.html ? mailOptions.html.length : 0
        });
      } catch (_) {}
      return { messageId: 'console-fallback' };
    }
  }
}

module.exports = new EmailService();
