const crypto = require('crypto');
const validator = require('validator');

class OTPService {
  constructor() {
    // In-memory OTP storage (fallback)
    this.otpStore = new Map();
    // Lazy-load DB model only when needed to avoid init order issues
    this.dbEnabled = false;
    this.initialize();
  }

  initialize() {
    console.log('✅ OTP Service initialized for email-only verification');

    // Best-effort check if Mongo is available after boot
    try {
      this.DatabaseService = require('./DatabaseService');
      // Defer enabling until DatabaseService connects
      this.dbEnabled = !!this.DatabaseService && (this.DatabaseService.isMongoConnected === true);
      // Periodically re-check (in case DB connects after this service is constructed)
      setInterval(() => {
        try { this.dbEnabled = (this.DatabaseService && this.DatabaseService.isMongoConnected === true); } catch (_) {}
      }, 5000);
    } catch (_) { this.dbEnabled = false; }
    
    // Clean up expired OTPs (memory fallback) every 5 minutes
    setInterval(() => {
      this.cleanupExpiredOTPs();
    }, 5 * 60 * 1000);
  }

  generateOTP() {
    // Generate 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Return candidate forms for an email to avoid provider-specific mismatches (e.g., Gmail dots/aliases)
  getEmailCandidates(identifier) {
    const raw = String(identifier || '').trim();
    const lower = raw.toLowerCase();
    let normalized = lower;
    try {
      const v = validator.normalizeEmail(raw);
      if (v) normalized = String(v).toLowerCase();
    } catch (_) { /* best effort */ }
    const set = new Set([lower, normalized]);
    return Array.from(set);
  }

  generateOTPHash(email, otp) {
    // Create a hash for OTP verification
    return crypto.createHash('sha256').update(`${email}:${otp}:${process.env.OTP_SECRET || 'default-secret'}`).digest('hex');
  }

  async generateAndStoreOTP(identifier, type = 'login') {
    const candidates = this.getEmailCandidates(identifier);
    // Prefer the most normalized/canonical candidate (last in our set ordering)
    const email = candidates[candidates.length - 1];
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + (10 * 60 * 1000)); // 10 minutes

    if (this.dbEnabled) {
      try {
        const OTPCode = require('../models/OTPCode');
        await OTPCode.findOneAndUpdate(
          { email },
          { code: otp, purpose: type || 'login', attempts: 0, maxAttempts: 3, expiresAt, lastSent: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`🔐 [DB] OTP generated for ${email}: ${otp} (expires in 10 minutes)`);
        return otp;
      } catch (e) {
        console.warn('⚠️ OTP DB store failed, falling back to memory:', e.message);
      }
    }

    // Fallback to memory store
    this.otpStore.set(email, { otp, type, expiresAt: expiresAt.getTime(), attempts: 0, maxAttempts: 3, lastSent: Date.now() });
    console.log(`🔐 [MEM] OTP generated for ${email}: ${otp} (expires in 10 minutes)`);
    return otp;
  }

  async verifyOTP(identifier, providedOTP) {
    const candidates = this.getEmailCandidates(identifier);

    if (this.dbEnabled) {
      try {
        const OTPCode = require('../models/OTPCode');
        for (const email of candidates) {
          const doc = await OTPCode.findOne({ email });
          if (!doc) continue;
          if (new Date() > doc.expiresAt) {
            await OTPCode.deleteOne({ _id: doc._id });
            return { success: false, error: 'OTP has expired', code: 'OTP_EXPIRED' };
          }
          if (doc.attempts >= doc.maxAttempts) {
            await OTPCode.deleteOne({ _id: doc._id });
            return { success: false, error: 'Maximum verification attempts exceeded', code: 'MAX_ATTEMPTS_EXCEEDED' };
          }
          if (String(doc.code) === String(providedOTP)) {
            await OTPCode.deleteOne({ _id: doc._id });
            return { success: true, message: 'OTP verified successfully' };
          }
          // increment attempts on failure (for the matched record)
          await OTPCode.updateOne({ _id: doc._id }, { $inc: { attempts: 1 } });
          return { success: false, error: 'Invalid OTP', code: 'INVALID_OTP', attemptsRemaining: (doc.maxAttempts - (doc.attempts + 1)) };
        }
        // If we reach here, no DB record matched any candidate; fall through to memory fallback
      } catch (e) {
        console.warn('⚠️ OTP DB verify failed, falling back to memory:', e.message);
      }
    }

    // Memory fallback - try all candidates
    for (const email of candidates) {
      const otpData = this.otpStore.get(email);
      if (!otpData) continue;
      if (Date.now() > otpData.expiresAt) {
        this.otpStore.delete(email);
        return { success: false, error: 'OTP has expired', code: 'OTP_EXPIRED' };
      }
      if (otpData.attempts >= otpData.maxAttempts) {
        this.otpStore.delete(email);
        return { success: false, error: 'Maximum verification attempts exceeded', code: 'MAX_ATTEMPTS_EXCEEDED' };
      }
      if (String(otpData.otp) === String(providedOTP)) {
        this.otpStore.delete(email);
        return { success: true, message: 'OTP verified successfully' };
      }
      otpData.attempts++;
      this.otpStore.set(email, otpData);
      return { success: false, error: 'Invalid OTP', code: 'INVALID_OTP', attemptsRemaining: otpData.maxAttempts - otpData.attempts };
    }

    return { success: false, error: 'OTP not found or expired', code: 'OTP_NOT_FOUND' };
  }

  async resendOTP(identifier, type = 'login') {
    const candidates = this.getEmailCandidates(identifier);
    const email = candidates[candidates.length - 1];

    if (this.dbEnabled) {
      try {
        const OTPCode = require('../models/OTPCode');
        const doc = await OTPCode.findOne({ email });
        // Allow resend after 20 seconds to improve UX if previous email is delayed in inbox
        if (doc && doc.lastSent && (Date.now() - new Date(doc.lastSent).getTime()) < 20000) {
          return { success: false, error: 'Please wait before requesting another OTP', code: 'TOO_FREQUENT' };
        }
        const otp = await this.generateAndStoreOTP(email, type);
        await OTPCode.updateOne({ email }, { $set: { lastSent: new Date() } }).catch(()=>{});
        return { success: true, otp, message: 'OTP resent successfully' };
      } catch (e) {
        console.warn('⚠️ OTP DB resend failed, falling back to memory:', e.message);
      }
    }

    // Memory fallback
    const otpData = this.otpStore.get(email);
    // Allow resend after 20 seconds
    if (otpData && otpData.lastSent && (Date.now() - otpData.lastSent) < 20000) {
      return { success: false, error: 'Please wait before requesting another OTP', code: 'TOO_FREQUENT' };
    }
    const otp = await this.generateAndStoreOTP(email, type);
    const updatedData = this.otpStore.get(email) || {};
    updatedData.lastSent = Date.now();
    this.otpStore.set(email, updatedData);
    return { success: true, otp, message: 'OTP resent successfully' };
  }

  cleanupExpiredOTPs() {
    // Memory fallback cleanup only. DB-cleanup is automatic via TTL index.
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
