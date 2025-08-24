const mongoose = require('mongoose');

// Unified Booking schema (tenant-scoped)
// Canonical term: booking. "Reservation" is treated as a subtype via source or metadata if desired.
const bookingUserSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true },
  email: { type: String, trim: true, required: true },
  phone: { type: String, trim: true }
}, { _id: false });

const bookingPaymentSchema = new mongoose.Schema({
  id: { type: String, trim: true },
  status: { type: String, enum: ['initiated', 'authorized', 'captured', 'failed', 'refunded', 'none'], default: 'none' },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' }
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  resourceId: { type: String, required: true, index: true },
  start: { type: Date, required: true, index: true },
  end: { type: Date, required: true },
  user: { type: bookingUserSchema, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending', index: true },
  source: { type: String, enum: ['chat', 'portal', 'api'], default: 'chat' },
  payment: { type: bookingPaymentSchema, default: () => ({ status: 'none', amount: 0, currency: 'INR' }) },
  metadata: { type: Object, default: {} }
}, { timestamps: true });

// Capacity-aware overlap check. We purposely avoid a unique index to support capacity > 1.
bookingSchema.statics.countOverlapping = async function({ tenantId, resourceId, start, end }) {
  return this.countDocuments({
    tenantId,
    resourceId,
    status: { $ne: 'cancelled' },
    start: { $lt: end },
    end: { $gt: start }
  });
};

// Helper: safe create that respects capacity and optional buffers around slots
bookingSchema.statics.createIfAvailable = async function(payload, { capacity = 1, bufferMinutes = 0 } = {}) {
  // Compute buffered window to avoid adjacent-slot conflicts
  const start = new Date(payload.start);
  const end = new Date(payload.end);
  const bufferMs = Math.max(0, Number(bufferMinutes) || 0) * 60 * 1000;
  const checkStart = new Date(start.getTime() - bufferMs);
  const checkEnd = new Date(end.getTime() + bufferMs);

  const overlapping = await this.countOverlapping({
    tenantId: payload.tenantId,
    resourceId: payload.resourceId,
    start: checkStart,
    end: checkEnd
  });

  if (overlapping >= capacity) {
    return { success: false, conflict: true, error: 'Slot capacity reached' };
  }

  const doc = await this.create(payload);
  return { success: true, booking: doc };
};

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
