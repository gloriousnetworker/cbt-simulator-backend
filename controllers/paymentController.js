// controllers/paymentController.js
const PaystackService = require('../services/paystackService');
const SubscriptionService = require('../services/subscriptionService');
const crypto = require('crypto');

const initializePayment = async (req, res) => {
  try {
    const { plan, paymentMethod = 'card' } = req.body;

    console.log('Initializing payment for user:', {
      userId: req.user.id,
      email: req.user.email,
      plan,
      paymentMethod
    });

    if (!req.user.email) {
      return res.status(400).json({ 
        message: 'User email not found. Please ensure you are properly authenticated.' 
      });
    }

    const result = await SubscriptionService.initializePayment(
      req.user.id,
      plan,
      req.user.email,
      paymentMethod
    );

    res.json({
      message: 'Payment initialized successfully',
      payment: result
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    console.log('Verifying payment for reference:', reference);

    const result = await SubscriptionService.verifyAndActivatePayment(reference);

    res.json(result);
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const payments = await SubscriptionService.getPaymentHistory(req.user.id);
    res.json({ payments });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getPaymentMethods = async (req, res) => {
  try {
    const methods = PaystackService.getPaymentMethods();
    const banks = await PaystackService.listBanks();
    
    res.json({
      methods,
      banks: banks.data
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: error.message });
  }
};

const handleWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    console.log('Webhook received:', req.body.event);

    await SubscriptionService.handleWebhook(req.body);
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
};

// Debug endpoint to check user authentication
const debugAuth = async (req, res) => {
  try {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        schoolId: req.user.schoolId
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  getPaymentHistory,
  getPaymentMethods,
  handleWebhook,
  debugAuth
};