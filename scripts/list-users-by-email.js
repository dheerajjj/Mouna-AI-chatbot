#!/usr/bin/env node
/*
  Helper: List all user records that match an email (case-insensitive),
  showing their _id and subscription plan to detect duplicates.
  Usage:
    node scripts/list-users-by-email.js <email>
*/

const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  try {
    const email = (process.argv[2] || '').toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      console.error('Usage: node scripts/list-users-by-email.js <email>');
      process.exit(2);
    }

    const DatabaseService = require('../services/DatabaseService');
    await DatabaseService.initialize();

    // Case-insensitive exact match
    const rx = new RegExp('^' + email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
    const users = await DatabaseService.models.User.find({ email: rx }).lean();

    const out = users.map(u => ({
      id: u._id?.toString?.(),
      email: u.email,
      provider: u.provider,
      plan: u.subscription?.plan,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt
    }));

    console.log(JSON.stringify({ count: out.length, users: out }, null, 2));

    try { await DatabaseService.disconnect(); } catch {}
    process.exit(0);
  } catch (err) {
    console.error('List failed:', err?.message || err);
    process.exit(1);
  }
})();

