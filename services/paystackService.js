// services/paystackService.js
const axios = require('axios');

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseUrl = 'https://api.paystack.co';
  }

  async initializeTransaction(email, amount, metadata = {}) {
    try {
      console.log('Initializing Paystack transaction for:', { email, amount });

      if (!email) {
        throw new Error('Email is required for Paystack transaction');
      }

      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email,
          amount: amount * 100, // Paystack uses kobo (multiply by 100)
          metadata,
          callback_url: metadata.callback_url || `${process.env.FRONTEND_URL}/dashboard/subscription/verify`,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Paystack initialize response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Paystack initialization error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize payment');
    }
  }

  async verifyTransaction(reference) {
    try {
      console.log('Verifying Paystack transaction:', reference);

      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      console.log('Paystack verify response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Paystack verification error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to verify payment');
    }
  }

  async listBanks() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/bank`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('List banks error:', error.response?.data || error.message);
      throw new Error('Failed to fetch banks');
    }
  }

  getPaymentMethods() {
    return [
      {
        id: 'card',
        name: 'Card Payment',
        icon: '💳',
        description: 'Pay with Visa, Mastercard, Verve'
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        icon: '🏦',
        description: 'Pay via bank transfer'
      },
      {
        id: 'ussd',
        name: 'USSD',
        icon: '📱',
        description: 'Pay using USSD code'
      },
      {
        id: 'qr',
        name: 'QR Code',
        icon: '📷',
        description: 'Scan QR code to pay'
      }
    ];
  }
}

module.exports = new PaystackService();