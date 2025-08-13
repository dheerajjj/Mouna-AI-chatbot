const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    // Use Gmail SMTP (you can change this to any email provider)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your app password
      }
    });

    // Fallback to console logging if email credentials are not provided
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('⚠️ Email credentials not found. Email notifications will be logged to console.');
      this.transporter = {
        sendMail: (options) => {
          console.log('📧 EMAIL WOULD BE SENT:');
          console.log('📧 To:', options.to);
          console.log('📧 Subject:', options.subject);
          console.log('📧 Content:', options.text);
          console.log('📧 ========================');
          return Promise.resolve({ messageId: 'mock-id' });
        }
      };
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@mounaai.com',
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
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent to:', userEmail);
      return result;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      throw error;
    }
  }

  async sendOTPEmail(userEmail, userName, otp) {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@mounaai.com',
      to: userEmail,
      subject: 'Your OTP for Mouna AI Registration',
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
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ OTP email sent to:', userEmail);
      return result;
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
