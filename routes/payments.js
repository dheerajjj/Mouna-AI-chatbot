const express = require('express');
const crypto = require('crypto');
const { User, Subscription } = require('../models/User');
const { PRICING_PLANS } = require('../config/pricing');
const { authenticateToken } = require('./auth');
const DatabaseService = require('../services/DatabaseService');
const router = express.Router();

// Initialize Razorpay
const Razorpay = require('razorpay');
let razorpay = null;

// Only initialize Razorpay if credentials are provided
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized successfully');
} else {
  console.log('⚠️ Razorpay credentials not found - payment features disabled');
}

// Get pricing plans (INR only)
router.get('/plans', async (req, res) => {
  try {
    const currency = 'INR';
    // PRICING_PLANS is a flat structure, not nested by currency
    res.json({
      monthly: PRICING_PLANS,
      currency: currency
    });
  } catch (error) {
    console.error('Pricing fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
});


// Create subscription with Razorpay
router.post('/create-subscription', authenticateToken, async (req, res) => {
  try {
    // Check if Razorpay is available
    if (!razorpay) {
      return res.status(503).json({ 
        error: 'Payment service unavailable', 
        message: 'Razorpay credentials not configured' 
      });
    }

    const { planId } = req.body;

    const user = await DatabaseService.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get plan details
    const plan = PRICING_PLANS[planId];

    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: plan.price * 100, // Amount in paise
      currency: 'INR',
      receipt: `order_rcptid_${Math.random().toString(36).substr(2, 9)}`,
      notes: {
        plan: planId,
        user: user._id.toString()
      }
    });

    res.json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID, // Include the key for frontend
        plan: planId,
      },
    });

  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({
      error: 'Failed to create subscription',
      details: error.message
    });
  }
});

// Verify Razorpay payment and update user subscription
router.post('/verify-payment', authenticateToken, async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId } = req.body;
    
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !planId) {
      return res.status(400).json({ error: 'Missing required payment verification data' });
    }
    
    // Verify payment signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed - Invalid signature' });
    }
    
    // Get user
    const user = await DatabaseService.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get plan details from centralized configuration
    const { PlanManager } = require('../config/planFeatures');
    const planDetails = PlanManager.getPlanDetails(planId);
    
    if (!planDetails || planDetails === PlanManager.getPlanDetails('free')) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    // Calculate billing dates
    const now = new Date();
    const billingCycleDays = planDetails.billingCycle === 'monthly' ? 30 : planDetails.billingCycle === 'yearly' ? 365 : 30;
    const nextBilling = new Date(now.getTime() + billingCycleDays * 24 * 60 * 60 * 1000);
    
    // Comprehensive subscription update with all plan features
    const subscriptionUpdate = {
      'subscription.plan': planId,
      'subscription.planName': planDetails.name,
      'subscription.status': 'active',
      'subscription.currentPeriodStart': now,
      'subscription.currentPeriodEnd': nextBilling,
      'subscription.nextBilling': nextBilling.toISOString().split('T')[0],
      'subscription.billingCycle': planDetails.billingCycle,
      'subscription.currency': planDetails.currency,
      'subscription.amount': planDetails.price,
      'subscription.razorpayPaymentId': razorpay_payment_id,
      'subscription.razorpayOrderId': razorpay_order_id,
      'subscription.lastPayment': {
        amount: planDetails.price,
        currency: planDetails.currency,
        date: now,
        paymentId: razorpay_payment_id,
        planId: planId,
        planName: planDetails.name
      },
      'subscription.updatedAt': now
    };
    
    // Reset usage counters for new billing cycle if upgrading from free
    const currentPlan = user.subscription?.plan || 'free';
    if (currentPlan === 'free') {
      subscriptionUpdate['usage.messagesThisMonth'] = 0;
      subscriptionUpdate['usage.apiCallsPerMonth'] = 0;
      subscriptionUpdate['usage.customResponses'] = 0;
      subscriptionUpdate['usage.knowledgeBaseEntries'] = 0;
      subscriptionUpdate['usage.widgetCustomizations'] = 0;
      subscriptionUpdate['usage.maxFileUploads'] = 0;
      subscriptionUpdate['usage.lastReset'] = now;
    }
    
    // Apply the update
    await DatabaseService.updateUser(user._id, subscriptionUpdate);
    
    // Log the successful payment with comprehensive details
    console.log(`✅ Payment verified and user upgraded:`, {
      userId: user._id,
      email: user.email,
      previousPlan: currentPlan,
      newPlan: planId,
      planName: planDetails.name,
      amount: planDetails.price,
      currency: planDetails.currency,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      nextBilling: nextBilling.toISOString(),
      features: Object.keys(planDetails.features).filter(f => planDetails.features[f]),
      limits: planDetails.limits
    });
    
    // Get updated user data for response
    const updatedUser = await DatabaseService.findUserById(user._id);
    
    res.json({
      success: true,
      message: 'Payment verified successfully',
      subscription: {
        plan: planId,
        planName: planDetails.name,
        status: 'active',
        nextBilling: nextBilling.toISOString().split('T')[0],
        currentPeriodStart: now.toISOString().split('T')[0],
        currentPeriodEnd: nextBilling.toISOString().split('T')[0],
        amount: planDetails.price,
        currency: planDetails.currency
      },
      planDetails: {
        limits: planDetails.limits,
        features: planDetails.features,
        ui: planDetails.ui
      },
      usage: updatedUser.usage,
      redirectTo: '/payment-success',
      upgradeDetails: {
        from: currentPlan,
        to: planId,
        newLimits: planDetails.limits,
        newFeatures: Object.keys(planDetails.features).filter(f => planDetails.features[f])
      }
    });
    
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      error: 'Payment verification failed',
      details: error.message
    });
  }
});

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    // Update user record
    user.subscription.cancelAtPeriodEnd = true;
    await user.save();

    // Update subscription record
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      { cancelAtPeriodEnd: true }
    );

    res.json({
      message: 'Subscription will be cancelled at the end of current billing period',
      cancelAt: new Date(subscription.current_period_end * 1000),
    });

  } catch (error) {
    console.error('Subscription cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Reactivate subscription
router.post('/reactivate-subscription', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    // Reactivate subscription
    const subscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
      }
    );

    // Update user record
    user.subscription.cancelAtPeriodEnd = false;
    await user.save();

    // Update subscription record
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      { cancelAtPeriodEnd: false }
    );

    res.json({
      message: 'Subscription reactivated successfully',
      subscription: {
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });

  } catch (error) {
    console.error('Subscription reactivation error:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// Get subscription details
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let subscriptionDetails = null;

    if (user.subscription.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(
        user.subscription.stripeSubscriptionId
      );

      subscriptionDetails = {
        id: subscription.id,
        status: subscription.status,
        plan: user.subscription.plan,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        amount: subscription.items.data[0].price.unit_amount / 100,
        currency: 'INR',
      };
    }

    res.json({
      subscription: subscriptionDetails,
      usage: user.usage,
      limits: require('../config/pricing').USAGE_LIMITS[user.subscription.plan],
    });

  } catch (error) {
    console.error('Subscription fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
});

// Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        const userId = subscription.metadata.userId;

        if (userId) {
          const user = await User.findById(userId);
          if (user) {
            user.subscription.status = subscription.status;
            user.subscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
            user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
            user.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;

            if (subscription.status === 'canceled') {
              user.subscription.plan = 'free';
            }

            await user.save();
          }
        }
        break;

      case 'invoice.payment_failed':
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        const userWithFailedPayment = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        if (userWithFailedPayment) {
          userWithFailedPayment.subscription.status = 'past_due';
          await userWithFailedPayment.save();
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

// Simplified subscription create endpoint for pricing page
router.post('/subscription/create', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For demo purposes, directly update the plan
    if (plan === 'free') {
      // Downgrade to free
      await DatabaseService.updateUser(user._id, {
        'subscription.plan': 'free',
        'subscription.status': 'active'
      });
      
      return res.json({
        success: true,
        message: 'Plan changed to Free successfully'
      });
    } else {
      // For paid plans, in a real implementation you'd redirect to payment
      // For now, let's simulate a successful upgrade
      await DatabaseService.updateUser(user._id, {
        'subscription.plan': plan,
        'subscription.status': 'active'
      });
      
      return res.json({
        success: true,
        message: `Plan upgraded to ${plan} successfully`,
        // In real implementation, this would be the payment URL
        paymentUrl: null
      });
    }
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Cancel subscription endpoint
router.post('/subscription/cancel', authenticateToken, async (req, res) => {
  try {
    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Downgrade to free plan
    await DatabaseService.updateUser(user._id, {
      'subscription.plan': 'free',
      'subscription.status': 'active'
    });
    
    res.json({
      success: true,
      message: 'Plan changed to Free successfully'
    });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

module.exports = router;
