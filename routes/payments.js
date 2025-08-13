const express = require('express');
const { User, Subscription } = require('../mockDB');
const { PRICING_PLANS, ANNUAL_PRICING } = require('../config/pricing');
const { authenticateToken } = require('./auth');
const DatabaseService = require('../services/DatabaseService');
const router = express.Router();

// Initialize Razorpay (optional)
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
    const pricing = PRICING_PLANS[currency];
    res.json({
      monthly: pricing,
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

    const user = await User.findById(req.user.userId);
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
