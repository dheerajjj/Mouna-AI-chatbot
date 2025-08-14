#!/usr/bin/env node

/**
 * Email Setup Script for Mouna AI Chatbot
 * This script helps configure Gmail credentials for sending OTP emails
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEmail() {
  console.log('\n🔧 Mouna AI Email Configuration Setup');
  console.log('=====================================');
  
  console.log('\nTo send real OTP emails, you need to configure Gmail credentials.');
  console.log('\n📧 Gmail Setup Instructions:');
  console.log('1. Go to https://myaccount.google.com/security');
  console.log('2. Enable 2-Step Verification if not already enabled');
  console.log('3. Go to https://myaccount.google.com/apppasswords');
  console.log('4. Generate an App Password for "Mail"');
  console.log('5. Use the 16-character password (format: abcd efgh ijkl mnop)');
  
  const email = await question('\n📧 Enter your Gmail address: ');
  const appPassword = await question('🔑 Enter your Gmail App Password (16 chars): ');
  
  // Validate inputs
  if (!email.includes('@gmail.com')) {
    console.log('\n❌ Please use a Gmail address (must end with @gmail.com)');
    process.exit(1);
  }
  
  if (!appPassword || appPassword.replace(/\s/g, '').length !== 16) {
    console.log('\n❌ App Password must be 16 characters (spaces will be removed)');
    process.exit(1);
  }
  
  const cleanAppPassword = appPassword.replace(/\s/g, '');
  
  try {
    // Read current .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update email credentials
    const emailUserRegex = /EMAIL_USER=.*/;
    const emailPassRegex = /EMAIL_PASS=.*/;
    const emailFromRegex = /EMAIL_FROM=.*/;
    
    if (emailUserRegex.test(envContent)) {
      envContent = envContent.replace(emailUserRegex, `EMAIL_USER=${email}`);
    } else {
      envContent += `\nEMAIL_USER=${email}`;
    }
    
    if (emailPassRegex.test(envContent)) {
      envContent = envContent.replace(emailPassRegex, `EMAIL_PASS=${cleanAppPassword}`);
    } else {
      envContent += `\nEMAIL_PASS=${cleanAppPassword}`;
    }
    
    if (emailFromRegex.test(envContent)) {
      envContent = envContent.replace(emailFromRegex, `EMAIL_FROM=${email}`);
    } else {
      envContent += `\nEMAIL_FROM=${email}`;
    }
    
    // Write updated .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Email credentials saved to .env file!');
    console.log('\n🚀 Next steps:');
    console.log('1. Commit and push your changes to GitHub');
    console.log('2. Deploy to Railway: railway up');
    console.log('3. Test the OTP login flow');
    
    console.log('\n⚠️  Security Note:');
    console.log('- Never share your App Password');
    console.log('- The App Password is only for this application');
    console.log('- You can revoke it anytime from Google Account settings');
    
  } catch (error) {
    console.error('\n❌ Failed to save email configuration:', error.message);
    process.exit(1);
  }
  
  rl.close();
}

// Test email configuration
async function testEmail() {
  const testChoice = await question('\n🧪 Test email configuration? (y/n): ');
  
  if (testChoice.toLowerCase() === 'y') {
    console.log('\n🧪 Testing email configuration...');
    
    try {
      const EmailService = require('./services/EmailService');
      const testEmail = process.env.EMAIL_USER || 'test@example.com';
      const testOTP = Math.random().toString().slice(2, 8);
      
      await EmailService.sendLoginOTPEmail(testEmail, 'Test User', testOTP);
      console.log('✅ Test email sent successfully!');
      console.log(`📧 Check ${testEmail} for the test OTP email`);
      
    } catch (error) {
      console.log('❌ Test email failed:', error.message);
      console.log('💡 Check your Gmail credentials and try again');
    }
  }
}

if (require.main === module) {
  setupEmail()
    .then(() => testEmail())
    .catch(error => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupEmail };
