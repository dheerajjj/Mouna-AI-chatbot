const mongoose = require('mongoose');

// Tracks occupancy per tenant/resource/timeslot start to prevent double-booking races.
// Works alongside buffer/overlap checks. Supports capacity > 1 via atomic increments.
const resourceSlotSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  resourceId: { type: String, required: true, index: true },
  start: { type: Date, required: true, index: true },
  count: { type: Number, default: 0 }
}, { timestamps: true });

// Unique key ensures only one slot doc per (tenant, resource, start)
resourceSlotSchema.index({ tenantId: 1, resourceId: 1, start: 1 }, { unique: true, name: 'uniq_resource_slot' });

// Atomically acquire capacity for a given slot start.
// Returns { acquired: boolean, slot?: doc }
resourceSlotSchema.statics.acquire = async function({ tenantId, resourceId, start, capacity = 1 }) {
  const filter = {
    tenantId,
    resourceId,
    start,
    $or: [
      { count: { $lt: capacity } },
      { count: { $exists: false } }
    ]
  };

  const update = {
    $setOnInsert: { tenantId, resourceId, start, count: 0 },
    $inc: { count: 1 }
  };

  const options = { upsert: true, new: true };
  const doc = await this.findOneAndUpdate(filter, update, options).lean();
  if (!doc) return { acquired: false };
  return { acquired: true, slot: doc };
};

// Release one unit of capacity for the slot (used on cancellation/failed create)
resourceSlotSchema.statics.release = async function({ tenantId, resourceId, start }) {
  const doc = await this.findOneAndUpdate(
    { tenantId, resourceId, start, count: { $gt: 0 } },
    { $inc: { count: -1 } },
    { new: true }
  ).lean();
  return !!doc;
};

const ResourceSlot = mongoose.model('ResourceSlot', resourceSlotSchema);
module.exports = ResourceSlot;
