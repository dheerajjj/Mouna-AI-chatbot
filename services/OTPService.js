const crypto = require('crypto');

class OTPService {
  constructor() {
    // In-memory OTP storage (in production, use Redis or database)
    this.otpStore = new Map();
    this.initialize();
  }

  initialize() {
    console.log('✅ OTP Service initialized for email-only verification');
    
    // Clean up expired OTPs every 5 minutes
    setInterval(() => {
      this.cleanupExpiredOTPs();
    }, 5 * 60 * 1000);
  }

  generateOTP() {
    // Generate 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateOTPHash(email, otp) {
    // Create a hash for OTP verification
    return crypto.createHash('sha256').update(`${email}:${otp}:${process.env.OTP_SECRET || 'default-secret'}`).digest('hex');
  }

  async generateAndStoreOTP(identifier, type = 'phone') {
    const otp = this.generateOTP();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes
    
    // Store OTP with expiration
    this.otpStore.set(identifier, {
      otp,
      type,
      expiresAt,
      attempts: 0,
      maxAttempts: 3
    });

    console.log(`🔐 OTP generated for ${identifier}: ${otp} (expires in 10 minutes)`);
    return otp;
  }

  async verifyOTP(identifier, providedOTP) {
    const otpData = this.otpStore.get(identifier);
    
    if (!otpData) {
      return {
        success: false,
        error: 'OTP not found or expired',
        code: 'OTP_NOT_FOUND'
      };
    }

    // Check if OTP is expired
    if (Date.now() > otpData.expiresAt) {
      this.otpStore.delete(identifier);
      return {
        success: false,
        error: 'OTP has expired',
        code: 'OTP_EXPIRED'
      };
    }

    // Check attempts
    if (otpData.attempts >= otpData.maxAttempts) {
      this.otpStore.delete(identifier);
      return {
        success: false,
        error: 'Maximum verification attempts exceeded',
        code: 'MAX_ATTEMPTS_EXCEEDED'
      };
    }

    // Verify OTP
    if (otpData.otp === providedOTP) {
      this.otpStore.delete(identifier); // Remove OTP after successful verification
      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } else {
      // Increment attempts
      otpData.attempts++;
      this.otpStore.set(identifier, otpData);
      
      return {
        success: false,
        error: 'Invalid OTP',
        code: 'INVALID_OTP',
        attemptsRemaining: otpData.maxAttempts - otpData.attempts
      };
    }
  }

  async resendOTP(identifier, type = 'phone') {
    // Check if we can resend (not too frequent)
    const otpData = this.otpStore.get(identifier);
    
    if (otpData && otpData.lastSent && (Date.now() - otpData.lastSent) < 60000) {
      return {
        success: false,
        error: 'Please wait before requesting another OTP',
        code: 'TOO_FREQUENT'
      };
    }

    // Generate new OTP
    const otp = await this.generateAndStoreOTP(identifier, type);
    
    // Update last sent time
    const updatedData = this.otpStore.get(identifier);
    updatedData.lastSent = Date.now();
    this.otpStore.set(identifier, updatedData);

    return {
      success: true,
      otp,
      message: 'OTP resent successfully'
    };
  }

  cleanupExpiredOTPs() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [identifier, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(identifier);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired OTPs`);
    }
  }

  getOTPStatus(identifier) {
    const otpData = this.otpStore.get(identifier);
    
    if (!otpData) {
      return {
        exists: false,
        message: 'No OTP found'
      };
    }

    const timeRemaining = Math.max(0, otpData.expiresAt - Date.now());
    
    return {
      exists: true,
      type: otpData.type,
      expiresIn: Math.ceil(timeRemaining / 1000), // seconds
      attempts: otpData.attempts,
      maxAttempts: otpData.maxAttempts,
      attemptsRemaining: otpData.maxAttempts - otpData.attempts
    };
  }
}

module.exports = new OTPService();
