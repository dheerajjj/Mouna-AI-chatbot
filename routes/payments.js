const express = require('express');
const crypto = require('crypto');
const { User, PaymentTransaction } = require('../models/User');
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
    const { ADDONS } = require('../config/pricing');
    // PRICING_PLANS is a flat structure, not nested by currency
    res.json({
      monthly: PRICING_PLANS,
      addons: ADDONS,
      currency: currency
    });
  } catch (error) {
    console.error('Pricing fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
});


// List available add-on packs
router.get('/addons', async (req, res) => {
  try {
    const { ADDONS } = require('../config/pricing');
    res.json({ success: true, addons: ADDONS });
  } catch (e) {
    console.error('Addons fetch error:', e);
    res.status(500).json({ error: 'Failed to fetch addons' });
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

// Create add-on order
router.post('/create-addon-order', authenticateToken, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ error: 'Payment service unavailable', message: 'Razorpay credentials not configured' });
    }
    const { addonId } = req.body;
    const { ADDONS } = require('../config/pricing');
    const addon = ADDONS[addonId];
    if (!addon) return res.status(400).json({ error: 'Invalid add-on selected' });

    const user = await DatabaseService.findUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const order = await razorpay.orders.create({
      amount: addon.price * 100,
      currency: 'INR',
      receipt: `addon_${addonId}_${Math.random().toString(36).slice(2,9)}`,
      notes: { type: 'addon', addon: addonId, user: user._id.toString() }
    });

    res.json({ success: true, order: { id: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID, addonId } });
  } catch (e) {
    console.error('Addon order error:', e);
    res.status(500).json({ error: 'Failed to create add-on order' });
  }
});

// Verify add-on payment and credit messages
router.post('/verify-addon', authenticateToken, async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, addonId } = req.body;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !addonId) {
      return res.status(400).json({ error: 'Missing required payment verification data' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed - Invalid signature' });
    }

    const { ADDONS } = require('../config/pricing');
    const addon = ADDONS[addonId];
    if (!addon) return res.status(400).json({ error: 'Invalid add-on selected' });

    const user = await DatabaseService.findUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Credit message credits atomically
    await DatabaseService.incrementUserUsage(user._id, 'messageCredits', addon.messages);

    // Optional: record transaction
    try {
      await DatabaseService.updateUser(user._id, {
        'subscription.lastPayment': {
          amount: addon.price,
          currency: 'INR',
          date: new Date(),
          paymentId: razorpay_payment_id,
          planId: addonId,
          planName: addon.name
        }
      });
    } catch {}

    res.json({ success: true, credited: addon.messages });
  } catch (e) {
    console.error('Addon verify error:', e);
    res.status(500).json({ error: 'Failed to verify add-on payment' });
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
    
    // Calculate billing dates - use proper month/year arithmetic instead of simple days
    const now = new Date();
    let nextBilling;
    
    if (planDetails.billingCycle === 'yearly') {
      nextBilling = new Date(now);
      nextBilling.setFullYear(now.getFullYear() + 1);
    } else {
      // Default to monthly
      nextBilling = new Date(now);
      nextBilling.setMonth(now.getMonth() + 1);
      // Handle month overflow (e.g., Jan 31 + 1 month = Feb 28/29)
      if (nextBilling.getDate() !== now.getDate()) {
        nextBilling.setDate(0); // Set to last day of previous month
      }
    }
    
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

// Get billing history
router.get('/billing-history', authenticateToken, async (req, res) => {
  try {
    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // In a real implementation, you would fetch from a payments table
    // For now, we'll construct from subscription data
    const billingHistory = [];
    
    if (user.subscription && user.subscription.lastPayment) {
      billingHistory.push({
        id: user.subscription.razorpayPaymentId || 'payment_001',
        date: user.subscription.lastPayment.date || user.subscription.currentPeriodStart,
        amount: user.subscription.lastPayment.amount || user.subscription.amount,
        currency: user.subscription.lastPayment.currency || user.subscription.currency || 'INR',
        plan: user.subscription.lastPayment.planName || user.subscription.planName || user.subscription.plan,
        status: 'paid',
        paymentMethod: 'Razorpay',
        orderId: user.subscription.razorpayOrderId
      });
    }
    
    res.json({
      success: true,
      history: billingHistory,
      count: billingHistory.length
    });
    
  } catch (error) {
    console.error('Billing history error:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

// Generate and download invoice
router.get('/invoice/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const user = await DatabaseService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify the payment belongs to this user
    if (user.subscription?.razorpayPaymentId !== paymentId && paymentId !== 'latest') {
      return res.status(403).json({ error: 'Access denied to this invoice' });
    }

    // Get payment details
    const payment = user.subscription?.lastPayment || {};
    const invoiceData = {
      invoiceNumber: `INV-${paymentId.slice(-8)}`,
      date: payment.date || user.subscription?.currentPeriodStart || new Date(),
      dueDate: user.subscription?.currentPeriodEnd || new Date(),
      customer: {
        name: user.name,
        email: user.email,
        id: user._id
      },
      items: [{
        description: `${payment.planName || user.subscription?.planName || 'Subscription'} - Monthly`,
        quantity: 1,
        rate: payment.amount || user.subscription?.amount || 0,
        amount: payment.amount || user.subscription?.amount || 0
      }],
      subtotal: payment.amount || user.subscription?.amount || 0,
      total: payment.amount || user.subscription?.amount || 0,
      currency: payment.currency || user.subscription?.currency || 'INR',
      paymentMethod: 'Razorpay',
      paymentId: paymentId,
      orderId: user.subscription?.razorpayOrderId
    };

    // Format invoice as HTML for now (could be PDF in production)
    const invoiceHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Invoice ${invoiceData.invoiceNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .company { color: #666; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .customer-details, .invoice-info { flex: 1; }
            .invoice-info { text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f8f9fa; }
            .footer { border-top: 2px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>INVOICE</h1>
            <div class="company">
                <strong>Mouna AI</strong><br>
                AI-Powered Chatbot Solutions<br>
                contact@mouna-ai.com
            </div>
        </div>
        
        <div class="invoice-details">
            <div class="customer-details">
                <h3>Bill To:</h3>
                <strong>${invoiceData.customer.name}</strong><br>
                ${invoiceData.customer.email}<br>
                Customer ID: ${invoiceData.customer.id.toString().slice(-8)}
            </div>
            <div class="invoice-info">
                <h3>Invoice Details:</h3>
                <strong>Invoice #:</strong> ${invoiceData.invoiceNumber}<br>
                <strong>Date:</strong> ${new Date(invoiceData.date).toLocaleDateString('en-IN')}<br>
                <strong>Due Date:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString('en-IN')}<br>
                <strong>Payment ID:</strong> ${invoiceData.paymentId}
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${invoiceData.items.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.rate}</td>
                    <td>₹${item.amount}</td>
                </tr>
                `).join('')}
                <tr class="total-row">
                    <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
                    <td><strong>₹${invoiceData.total}</strong></td>
                </tr>
            </tbody>
        </table>
        
        <div class="footer">
            <p><strong>Payment Method:</strong> ${invoiceData.paymentMethod}</p>
            <p><strong>Transaction Status:</strong> PAID</p>
            <p><strong>Order ID:</strong> ${invoiceData.orderId || 'N/A'}</p>
            <hr>
            <p>Thank you for your business! This is a computer-generated invoice.</p>
            <p>For support, contact us at support@mouna-ai.com</p>
        </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoiceData.invoiceNumber}.html"`);
    res.send(invoiceHtml);
    
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

module.exports = router;
