// services/paystackService.js
const axios = require('axios');

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseUrl = 'https://api.paystack.co';
  }

  // Initialize transaction
  async initializeTransaction(email, amount, metadata = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email,
          amount: amount * 100, // Paystack amounts are in kobo (multiply by 100)
          metadata,
          callback_url: `${process.env.FRONTEND_URL}/dashboard/subscription/verify`,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Paystack initialization error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize payment');
    }
  }

  // Verify transaction
  async verifyTransaction(reference) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Paystack verification error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to verify payment');
    }
  }

  // List banks (for future use)
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

  // Create transfer recipient (for future use)
  async createTransferRecipient(name, accountNumber, bankCode) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transferrecipient`,
        {
          type: 'nuban',
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Create recipient error:', error.response?.data || error.message);
      throw new Error('Failed to create transfer recipient');
    }
  }

  // Initiate transfer (for future use - refunds)
  async initiateTransfer(amount, recipientCode, reason) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transfer`,
        {
          source: 'balance',
          amount: amount * 100,
          recipient: recipientCode,
          reason,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Transfer error:', error.response?.data || error.message);
      throw new Error('Failed to initiate transfer');
    }
  }

  // Get payment methods (for UI)
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