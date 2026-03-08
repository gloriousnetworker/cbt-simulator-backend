// controllers/paymentController.js
const PaystackService = require('../services/paystackService');
const SubscriptionService = require('../services/subscriptionService');
const Payment = require('../models/Payment');
const crypto = require('crypto');

const initializePayment = async (req, res) => {
  try {
    const { plan, paymentMethod = 'card' } = req.body;
    
    // Create payment record
    const payment = await SubscriptionService.initializePayment(
      req.user.id,
      plan,
      paymentMethod
    );

    // Initialize Paystack transaction
    const paystackResponse = await PaystackService.initializeTransaction(
      req.user.email,
      payment.amount,
      {
        paymentId: payment.id,
        userId: req.user.id,
        plan,
        callback_url: `${process.env.FRONTEND_URL}/dashboard/subscription/verify`
      }
    );

    // Update payment with Paystack reference
    await Payment.update(payment.id, {
      reference: paystackResponse.data.reference,
      paystackData: paystackResponse.data
    });

    res.json({
      message: 'Payment initialized successfully',
      payment: {
        id: payment.id,
        amount: payment.amount,
        plan: payment.plan,
        reference: paystackResponse.data.reference,
        authorizationUrl: paystackResponse.data.authorization_url,
        accessCode: paystackResponse.data.access_code
      }
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    // Verify with Paystack
    const verification = await PaystackService.verifyTransaction(reference);

    if (verification.data.status === 'success') {
      // Activate subscription
      const result = await SubscriptionService.verifyAndActivatePayment(reference);
      
      return res.json({
        message: 'Payment verified successfully',
        ...result
      });
    } else {
      // Update payment as failed
      const payment = await Payment.findByReference(reference);
      if (payment) {
        await Payment.update(payment.id, { status: 'failed' });
      }

      return res.status(400).json({
        message: 'Payment verification failed',
        status: verification.data.status
      });
    }
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
    // Verify webhook signature (implement based on Paystack docs)
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    await SubscriptionService.handleWebhook(req.body);
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  getPaymentHistory,
  getPaymentMethods,
  handleWebhook
};