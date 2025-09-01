const mongoose = require('mongoose');

const OTPCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true, lowercase: true, trim: true },
  code: { type: String, required: true },
  purpose: { type: String, enum: ['login', 'signup', 'email'], default: 'login', index: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  lastSent: { type: Date },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

// Guard against model overwrite when hot-reloading
module.exports = mongoose.models.OTPCode || mongoose.model('OTPCode', OTPCodeSchema);

