const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const TenantSettings = require('../models/TenantSettings');
const { PlanManager } = require('../config/planFeatures');
const ResourceSlot = require('../models/ResourceSlot');

// Utility: get day key from a date in a specific timezone (monday..sunday)
function getWeekdayKey(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone });
  const day = fmt.format(date).toLowerCase();
  // Ensure keys match our schema keys
  return day;
}

function parseHM(hm) {
  const [h, m] = (hm || '00:00').split(':').map(n => parseInt(n, 10));
  return { h: h || 0, m: m || 0 };
}

// Approximate conversion of a local time in timeZone to a UTC Date instance
function zonedDateTimeToUtc(y, mo, d, h, mi, timeZone) {
  // Build a UTC time from the components first
  const utcMs = Date.UTC(y, mo - 1, d, h, mi, 0);
  const candidate = new Date(utcMs);
  // Compute timezone offset at that instant
  const local = new Date(candidate.toLocaleString('en-US', { timeZone }));
  const utc = new Date(candidate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMin = (local.getTime() - utc.getTime()) / 60000;
  return new Date(utcMs - offsetMin * 60000);
}

async function loadNormalizedSettings(tenantId) {
  // Load tenant and owner
  const tenant = await TenantSettings.findByTenantId(tenantId).populate('userId');
  if (!tenant) return { error: 'Tenant not found' };

  // Plan/feature gating by owner's subscription
  const ownerPlan = tenant.userId?.subscription?.plan || 'free';
  const planAllowsBookings = (() => {
    try { return PlanManager.hasFeature(ownerPlan, 'bookings'); } catch { return false; }
  })();
  if (!planAllowsBookings) {
    return { error: `Bookings feature requires a higher plan (current: ${ownerPlan}). Please upgrade.`, code: 'FEATURE_RESTRICTED' };
  }

  // Tenant-level feature toggle
  const features = tenant.enabledFeatures || {};
  const bookingEnabled = features.bookings || tenant.bookingConfig?.enabled || !!tenant.bookingSettings;
  if (!bookingEnabled) return { error: 'Bookings feature is disabled for this tenant' };

  const settings = tenant.getNormalizedBookingSettings();
  return { tenant, settings, ownerPlan };
}

// GET /api/bookings/:tenantId/availability?date=YYYY-MM-DD&resourceId=...
router.get('/:tenantId/availability', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { date, resourceId: qResourceId } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date (YYYY-MM-DD) is required' });
    }

    const result = await loadNormalizedSettings(tenantId);
    if (result.error) return res.status(404).json({ error: result.error });
    const { settings } = result;

    const tz = settings.timezone || 'UTC';
    const [Y, M, D] = date.split('-').map(n => parseInt(n, 10));

    const weekdayKey = getWeekdayKey(new Date(zonedDateTimeToUtc(Y, M, D, 12, 0, tz)), tz);
    const dayCfg = settings.workingHours?.[weekdayKey];
    if (!dayCfg || dayCfg.enabled === false) {
      return res.json({ success: true, tenantId, resourceId: qResourceId || settings.resources?.[0]?.id || 'default', date, timezone: tz, slots: [] });
    }

    const resourceId = qResourceId || settings.resources?.[0]?.id || 'default';
    const resource = (settings.resources || []).find(r => r.id === resourceId) || { id: resourceId, capacity: 1 };

    const { h: sh, m: sm } = parseHM(dayCfg.start);
    const { h: eh, m: em } = parseHM(dayCfg.end);

    // Compute UTC window for the working day
    const dayStartUtc = zonedDateTimeToUtc(Y, M, D, sh, sm, tz);
    const dayEndUtc = zonedDateTimeToUtc(Y, M, D, eh, em, tz);

    // Fetch existing bookings overlapping this day for the resource
    const existing = await Booking.find({
      tenantId,
      resourceId,
      status: { $ne: 'cancelled' },
      start: { $lt: dayEndUtc },
      end: { $gt: dayStartUtc }
    }).lean();

    // Prepare constraints
    const now = new Date();
    const slotMinStart = new Date(now.getTime() + (settings.minAdvanceNotice || 0) * 60000);
    const slotMaxStart = new Date(now.getTime() + (settings.maxAdvanceDays || 30) * 24 * 60 * 60000);
    const durMs = (settings.slotDuration || 30) * 60000;
    const bufMs = (settings.bufferMinutes || 0) * 60000;
    const capacity = resource.capacity || 1;

    const slots = [];
    for (let t = dayStartUtc.getTime(); t + durMs <= dayEndUtc.getTime(); t += durMs) {
      const s = new Date(t);
      const e = new Date(t + durMs);

      // Respect advance notice and max advance window
      if (s < slotMinStart) continue;
      if (s > slotMaxStart) continue;

      // Count overlapping bookings considering buffer windows
      const checkStart = new Date(s.getTime() - bufMs);
      const checkEnd = new Date(e.getTime() + bufMs);
      const overlapping = existing.filter(b => b.start < checkEnd && b.end > checkStart).length;
      const available = overlapping < capacity;
      slots.push({ start: s.toISOString(), end: e.toISOString(), available, overlapping, capacity });
    }

    return res.json({ success: true, tenantId, resourceId, date, timezone: tz, slotDuration: settings.slotDuration, bufferMinutes: settings.bufferMinutes, slots });
  } catch (e) {
    console.error('Availability error:', e);
    return res.status(500).json({ error: 'Failed to compute availability' });
  }
});

// GET /api/bookings/:tenantId?resourceId=...&status=...&from=ISO&to=ISO
router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    // Plan and tenant-level gating
    const context = await loadNormalizedSettings(tenantId);
    if (context.error) return res.status(403).json({ error: context.error, code: context.code || 'BOOKINGS_DISABLED' });

    const { resourceId, status, from, to } = req.query;
    const q = { tenantId };
    if (resourceId) q.resourceId = resourceId;
    if (status) q.status = status;
    if (from || to) {
      q.start = {};
      if (to) q.start.$lt = new Date(to);
      if (from) {
        // Ensure we include bookings that start after 'from' OR overlap into range; add end condition if provided
        delete q.start;
        q.$and = [
          { start: { $lt: to ? new Date(to) : new Date('3000-01-01') } },
          { end: { $gt: new Date(from) } }
        ];
      }
    }
    const items = await Booking.find(q).sort({ start: 1 }).lean();
    res.json({ success: true, count: items.length, bookings: items });
  } catch (e) {
    console.error('List bookings error:', e);
    res.status(500).json({ error: 'Failed to list bookings' });
  }
});

// POST /api/bookings  { tenantId, resourceId, start, end?, user: {name,email,phone}, source?, metadata? }
router.post('/', async (req, res) => {
  try {
    const { tenantId, resourceId, start, end, user, source = 'chat', metadata = {}, payment } = req.body;
    if (!tenantId || !resourceId || !start || !user || !user.name || !user.email) {
      return res.status(400).json({ error: 'tenantId, resourceId, start, user.name and user.email are required' });
    }

    const result = await loadNormalizedSettings(tenantId);
    if (result.error) return res.status(400).json({ error: result.error });
    const { tenant, settings } = result;

    const tz = settings.timezone || 'UTC';
    const startDt = new Date(start);
    let endDt = end ? new Date(end) : new Date(startDt.getTime() + (settings.slotDuration || 30) * 60000);
    if (!(startDt instanceof Date) || isNaN(startDt)) {
      return res.status(400).json({ error: 'Invalid start datetime' });
    }
    if (!(endDt instanceof Date) || isNaN(endDt)) {
      return res.status(400).json({ error: 'Invalid end datetime' });
    }
    if (endDt <= startDt) {
      return res.status(400).json({ error: 'end must be after start' });
    }

    const resource = (settings.resources || []).find(r => r.id === resourceId) || { id: resourceId, capacity: 1 };

    // Check advance windows
    const now = new Date();
    const minStart = new Date(now.getTime() + (settings.minAdvanceNotice || 0) * 60000);
    const maxStart = new Date(now.getTime() + (settings.maxAdvanceDays || 30) * 24 * 60 * 60000);
    if (startDt < minStart) {
      return res.status(400).json({ error: 'Booking start violates minAdvanceNotice' });
    }
    if (startDt > maxStart) {
      return res.status(400).json({ error: 'Booking exceeds maxAdvanceDays window' });
    }

    // Check within working hours for that day in tenant timezone
    const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(startDt);
    const m = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(startDt);
    const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(startDt);
    const weekdayKey = getWeekdayKey(startDt, tz);
    const dayCfg = settings.workingHours?.[weekdayKey];
    if (!dayCfg || dayCfg.enabled === false) {
      return res.status(400).json({ error: 'Selected day is outside working hours' });
    }
    const { h: wsh, m: wsm } = parseHM(dayCfg.start);
    const { h: weh, m: wem } = parseHM(dayCfg.end);
    const dayStartUtc = zonedDateTimeToUtc(parseInt(y, 10), parseInt(m, 10), parseInt(d, 10), wsh, wsm, tz);
    const dayEndUtc = zonedDateTimeToUtc(parseInt(y, 10), parseInt(m, 10), parseInt(d, 10), weh, wem, tz);
    if (startDt < dayStartUtc || endDt > dayEndUtc) {
      return res.status(400).json({ error: 'Booking time is outside working hours' });
    }

    // Determine initial status based on requireApproval (legacy bookingConfig)
    const requireApproval = tenant.bookingConfig?.requireApproval === true;
    const initialStatus = requireApproval ? 'pending' : 'confirmed';

    // Atomically acquire the slot start to prevent race conditions
    const cap = resource.capacity || 1;
    const acquire = await ResourceSlot.acquire({ tenantId, resourceId, start: startDt, capacity: cap });
    if (!acquire.acquired) {
      return res.status(409).json({ error: 'Slot capacity reached or already taken' });
    }

    // Attempt capacity-aware creation with buffer consideration (extra safety for overlaps)
    const payload = { tenantId, resourceId, start: startDt, end: endDt, user, status: initialStatus, source, payment, metadata };
    let create;
    try {
      create = await Booking.createIfAvailable(payload, { capacity: cap, bufferMinutes: settings.bufferMinutes || 0 });
      if (!create.success) {
        // Roll back slot acquisition
        await ResourceSlot.release({ tenantId, resourceId, start: startDt });
        return res.status(409).json({ error: create.error || 'Slot not available' });
      }
    } catch (err) {
      // Roll back slot acquisition on unexpected error
      await ResourceSlot.release({ tenantId, resourceId, start: startDt });
      throw err;
    }

    return res.status(201).json({ success: true, booking: create.booking });
  } catch (e) {
    console.error('Create booking error:', e);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// POST /api/bookings/:tenantId/:id/cancel  { reason? }
router.post('/:tenantId/:id/cancel', async (req, res) => {
  try {
    const { tenantId, id } = req.params;
    // Plan and tenant-level gating
    const context = await loadNormalizedSettings(tenantId);
    if (context.error) return res.status(403).json({ error: context.error, code: context.code || 'BOOKINGS_DISABLED' });

    const { reason } = req.body || {};
    const b = await Booking.findOne({ _id: id, tenantId });
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    if (b.status === 'cancelled') return res.json({ success: true, booking: b });
    b.status = 'cancelled';
    b.metadata = { ...(b.metadata || {}), cancelReason: reason || 'unspecified', cancelledAt: new Date().toISOString() };
    await b.save();

    // Release slot capacity for this booking's start
    try { await ResourceSlot.release({ tenantId, resourceId: b.resourceId, start: b.start }); } catch (_) {}

    res.json({ success: true, booking: b });
  } catch (e) {
    console.error('Cancel booking error:', e);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
