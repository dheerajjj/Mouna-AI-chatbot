const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { requireFeature } = require('../middleware/planAccessControl');
const { ObjectId } = require('mongodb');

/**
 * GET /api/analytics/summary
 * Query params:
 *   - dateRange: '7days' | '30days' | '90days' (default: '30days')
 * Response:
 *   {
 *     success: true,
 *     dateRange: { start, end, label },
 *     metrics: {
 *       avgResponseTimeMs: number,
 *       minResponseTimeMs: number,
 *       maxResponseTimeMs: number,
 *       samples: number
 *     }
 *   }
 */
// Ensure we have a full user object for plan gating
async function attachFullUser(req, res, next) {
  try {
    const DatabaseService = require('../services/DatabaseService');
    const id = req.user && (req.user.userId || req.user._id || req.user.id);
    if (!id) return res.status(401).json({ error: 'Authentication required' });
    const fullUser = await DatabaseService.findUserById(id);
    if (!fullUser) return res.status(401).json({ error: 'User not found' });
    req.currentUser = fullUser; // planAccessControl checks currentUser first
    next();
  } catch (e) {
    console.error('attachFullUser error:', e);
    return res.status(500).json({ error: 'Failed to load user context' });
  }
}

router.get('/summary', authenticateToken, attachFullUser, requireFeature('basicAnalytics'), async (req, res) => {
  try {
    const { getDb } = require('../server-mongo');
    const db = getDb();

    // Resolve userId from authenticated context (prefer full user from attachFullUser)
    let userId = (req.currentUser && (req.currentUser._id || req.currentUser.id))
      || req.user.userId || req.user._id || req.user.id;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId in request context' });
    }

    const now = new Date();
    const range = (req.query.dateRange || '30days').toString();
    let startDate;
    switch (range) {
      case '7days': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '90days': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case '30days':
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Try to convert userId to ObjectId (if applicable), but keep string fallback too
    const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
    const userIdString = typeof userId === 'string' ? userId : (userObjectId?.toString?.() || String(userObjectId));

    // Determine correct message logs collection name (compat for 'messagelogs' and 'message_logs')
    let logsCollectionName = 'messagelogs';
    try {
      const l1 = await db.collection('messagelogs').countDocuments({ $or: [{ userId: userObjectId }, { userId: userIdString }] }).catch(() => 0);
      const l2 = await db.collection('message_logs').countDocuments({ $or: [{ userId: userObjectId }, { userId: userIdString }] }).catch(() => 0);
      logsCollectionName = l1 >= l2 ? 'messagelogs' : 'message_logs';
    } catch (_) {}

    const logsCol = db.collection(logsCollectionName);

    // Build match conditions: by userId and date range on timestamp/createdAt
    const match = {
      $and: [
        { $or: [ { userId: userObjectId }, { userId: userIdString } ] },
        { $or: [ { timestamp: { $gte: startDate, $lte: now } }, { createdAt: { $gte: startDate, $lte: now } } ] },
        { responseTime: { $gte: 0 } }
      ]
    };

    // Aggregate average/min/max response times
    const agg = await logsCol.aggregate([
      { $match: match },
      { $group: {
          _id: null,
          avg: { $avg: '$responseTime' },
          min: { $min: '$responseTime' },
          max: { $max: '$responseTime' },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const stats = agg[0] || { avg: null, min: null, max: null, count: 0 };

    return res.json({
      success: true,
      dateRange: { start: startDate, end: now, label: range },
      metrics: {
        avgResponseTimeMs: stats.avg != null ? Math.round(stats.avg) : null,
        minResponseTimeMs: stats.min != null ? Math.round(stats.min) : null,
        maxResponseTimeMs: stats.max != null ? Math.round(stats.max) : null,
        samples: stats.count || 0
      }
    });
  } catch (error) {
    console.error('Error computing response time analytics:', error);
    return res.status(500).json({ success: false, error: 'Failed to compute analytics' });
  }
});

/**
 * GET /api/analytics/satisfaction
 * Query params: dateRange=7days|30days|90days (default 30days)
 * Returns positiveRate (>=4 stars), avgRating (1..5), ratedSessions count
 */
router.get('/satisfaction', authenticateToken, attachFullUser, requireFeature('basicAnalytics'), async (req, res) => {
  try {
    const { getDb } = require('../server-mongo');
    const db = getDb();

    let userId = (req.currentUser && (req.currentUser._id || req.currentUser.id))
      || req.user.userId || req.user._id || req.user.id;

    const now = new Date();
    const range = (req.query.dateRange || '30days').toString();
    let startDate;
    switch (range) {
      case '7days': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '90days': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case '30days':
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const { ObjectId } = require('mongodb');
    const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
    const userIdString = typeof userId === 'string' ? userId : (userObjectId?.toString?.() || String(userObjectId));

    // Determine correct chat sessions collection
    let sessionsCollectionName = 'chat_sessions';
    try {
      const c1 = await db.collection('chat_sessions').countDocuments({ $or: [{ userId: userObjectId }, { userId: userIdString }] }).catch(() => 0);
      const c2 = await db.collection('chatsessions').countDocuments({ $or: [{ userId: userObjectId }, { userId: userIdString }] }).catch(() => 0);
      sessionsCollectionName = c1 >= c2 ? 'chat_sessions' : 'chatsessions';
    } catch (_) {}
    const sessionsCol = db.collection(sessionsCollectionName);

    // Match sessions owned by user with ratings in date range (use ratedAt when available, else createdAt/updatedAt)
    const match = {
      $and: [
        { $or: [ { userId: userObjectId }, { userId: userIdString } ] },
        { 'rating.score': { $gte: 1 } },
        { $or: [
          { 'rating.ratedAt': { $gte: startDate, $lte: now } },
          { createdAt: { $gte: startDate, $lte: now } },
          { updatedAt: { $gte: startDate, $lte: now } }
        ] }
      ]
    };

    // Aggregate satisfaction stats
    const agg = await sessionsCol.aggregate([
      { $match: match },
      { $group: {
          _id: null,
          avgRating: { $avg: '$rating.score' },
          ratedSessions: { $sum: 1 },
          positiveCount: { $sum: { $cond: [ { $gte: ['$rating.score', 4] }, 1, 0 ] } }
        }
      }
    ]).toArray();

    const stats = agg[0] || { avgRating: null, ratedSessions: 0, positiveCount: 0 };
    const positiveRate = stats.ratedSessions > 0 ? Math.round((stats.positiveCount / stats.ratedSessions) * 100) : null;

    return res.json({
      success: true,
      dateRange: { start: startDate, end: now, label: range },
      metrics: {
        avgRating: stats.avgRating != null ? Math.round(stats.avgRating * 100) / 100 : null,
        ratedSessions: stats.ratedSessions || 0,
        positiveRatePercent: positiveRate
      }
    });
  } catch (error) {
    console.error('Error computing satisfaction analytics:', error);
    return res.status(500).json({ success: false, error: 'Failed to compute satisfaction' });
  }
});

module.exports = router;

