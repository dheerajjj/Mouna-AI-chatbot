#!/usr/bin/env node
/*
  Helper: Query a user's subscription plan by email and print concise info.
  Usage:
    node scripts/get-user-plan.js <email>
*/

const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  try {
    const email = process.argv[2];
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      console.error('Usage: node scripts/get-user-plan.js <email>');
      process.exit(2);
    }

    const DatabaseService = require('../services/DatabaseService');

    // Initialize DB (uses MONGODB_URI from environment)
    await DatabaseService.initialize();

    const user = await DatabaseService.findUserByEmail(email.toLowerCase());
    if (!user) {
      console.log(JSON.stringify({
        success: false,
        error: 'USER_NOT_FOUND',
        email
      }, null, 2));
      try { await DatabaseService.disconnect(); } catch {}
      process.exit(1);
    }

    // Build safe, concise payload
    const sub = user.subscription || {};
    const payload = {
      success: true,
      user: {
        id: user._id?.toString?.() || null,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      subscription: {
        plan: sub.plan || 'free',
        status: sub.status || 'active',
        planName: sub.planName || null,
        currentPeriodStart: sub.currentPeriodStart || null,
        currentPeriodEnd: sub.currentPeriodEnd || null,
        nextBilling: sub.nextBilling || null,
        amount: sub.amount || null,
        currency: sub.currency || null
      },
      usage: {
        messagesThisMonth: user.usage?.messagesThisMonth ?? null,
        totalMessages: user.usage?.totalMessages ?? null
      }
    };

    console.log(JSON.stringify(payload, null, 2));

    try { await DatabaseService.disconnect(); } catch {}
    process.exit(0);
  } catch (err) {
    console.error('Query failed:', err?.message || err);
    process.exit(1);
  }
})();

