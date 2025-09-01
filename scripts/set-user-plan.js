#!/usr/bin/env node
/*
  Helper: Set a user's subscription plan by email.
  Usage:
    node scripts/set-user-plan.js <email> <planId>
  planId must be one of: free | starter | professional | enterprise
*/

const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

(async () => {
  try {
    const email = (process.argv[2] || '').toLowerCase();
    const planId = (process.argv[3] || '').toLowerCase();

    const validPlans = ['free','starter','professional','enterprise'];
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !validPlans.includes(planId)) {
      console.error('Usage: node scripts/set-user-plan.js <email> <planId>');
      console.error('Valid plans:', validPlans.join(', '));
      process.exit(2);
    }

    const DatabaseService = require('../services/DatabaseService');
    const { PlanManager } = require('../config/planFeatures');

    await DatabaseService.initialize();

    const user = await DatabaseService.findUserByEmail(email);
    if (!user) {
      console.log(JSON.stringify({ success: false, error: 'USER_NOT_FOUND', email }, null, 2));
      try { await DatabaseService.disconnect(); } catch {}
      process.exit(1);
    }

    const planDetails = PlanManager.getPlanDetails(planId);
    const now = new Date();

    // Compute next billing if not present
    let currentStart = user.subscription?.currentPeriodStart || now;
    let nextBilling = user.subscription?.currentPeriodEnd || null;
    if (!nextBilling) {
      nextBilling = new Date(now);
      nextBilling.setMonth(now.getMonth() + 1);
      if (nextBilling.getDate() !== now.getDate()) nextBilling.setDate(0);
    }

    const update = {
      'subscription.plan': planId,
      'subscription.planName': planDetails.name,
      'subscription.status': 'active',
      'subscription.currency': planDetails.currency,
      'subscription.amount': planDetails.price,
      'subscription.currentPeriodStart': currentStart,
      'subscription.currentPeriodEnd': nextBilling,
      'subscription.nextBilling': nextBilling.toISOString().split('T')[0],
      'subscription.updatedAt': now
    };

    await DatabaseService.updateUser(user._id, update);
    const updated = await DatabaseService.findUserByEmail(email);

    const out = {
      success: true,
      email: updated.email,
      subscription: {
        plan: updated.subscription?.plan,
        planName: updated.subscription?.planName,
        status: updated.subscription?.status,
        amount: updated.subscription?.amount,
        currency: updated.subscription?.currency,
        currentPeriodStart: updated.subscription?.currentPeriodStart,
        currentPeriodEnd: updated.subscription?.currentPeriodEnd,
        nextBilling: updated.subscription?.nextBilling
      }
    };

    console.log(JSON.stringify(out, null, 2));

    try { await DatabaseService.disconnect(); } catch {}
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err?.message || err);
    process.exit(1);
  }
})();

