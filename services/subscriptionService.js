// services/subscriptionService.js
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

class SubscriptionService {
  static subscriptionPlans = {
    monthly: { price: 15000, days: 30, name: 'Monthly' },
    termly: { price: 42000, days: 120, name: 'Termly' },
    yearly: { price: 120000, days: 365, name: 'Yearly' },
    unlimited: { price: 500000, days: null, name: 'Unlimited' }
  };

  static calculateExpiryDate(plan) {
    if (plan === 'unlimited') return null;
    
    const days = this.subscriptionPlans[plan]?.days;
    if (!days) return null;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate;
  }

  static async checkSubscriptionStatus(adminId) {
    try {
      const adminDoc = await db.collection('users').doc(adminId).get();
      
      if (!adminDoc.exists) return { active: false, reason: 'Admin not found' };
      
      const admin = adminDoc.data();
      
      if (admin.role !== 'admin') return { active: false, reason: 'Not an admin' };
      
      if (!admin.subscription || !admin.subscription.active) {
        return { active: false, reason: 'No active subscription' };
      }
      
      if (admin.subscription.plan === 'unlimited') {
        return { 
          active: true, 
          plan: 'unlimited',
          daysLeft: null,
          paymentReference: admin.subscription.paymentReference
        };
      }
      
      if (!admin.subscription.expiryDate) {
        return { active: false, reason: 'Invalid subscription' };
      }
      
      const now = new Date();
      const expiry = admin.subscription.expiryDate.toDate ? 
        admin.subscription.expiryDate.toDate() : 
        new Date(admin.subscription.expiryDate);
      
      if (expiry < now) {
        // Auto-deactivate expired subscription
        await db.collection('users').doc(adminId).update({
          'subscription.active': false,
          'subscription.autoDeactivated': true,
          'subscription.deactivatedAt': now,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return { active: false, reason: 'Expired' };
      }
      
      const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      
      return {
        active: true,
        plan: admin.subscription.plan,
        expiryDate: expiry,
        daysLeft,
        paymentReference: admin.subscription.paymentReference
      };
    } catch (error) {
      console.error('Check subscription status error:', error);
      throw error;
    }
  }

  static async initializePayment(adminId, plan, email, paymentMethod = 'card') {
    try {
      console.log('Initializing payment with:', { adminId, plan, email, paymentMethod });

      if (!email) {
        throw new Error('Email address is required');
      }

      const adminDoc = await db.collection('users').doc(adminId).get();
      
      if (!adminDoc.exists) {
        throw new Error('Admin not found');
      }

      const admin = adminDoc.data();
      const userEmail = email || admin.email;

      if (!userEmail) {
        throw new Error('No email address available for this user');
      }

      const planDetails = this.subscriptionPlans[plan];
      if (!planDetails) {
        throw new Error('Invalid plan');
      }

      // Create payment record
      const paymentData = {
        userId: adminId,
        email: userEmail,
        plan,
        amount: planDetails.price,
        paymentMethod,
        status: 'pending',
        metadata: {
          planName: planDetails.name,
          adminName: admin.name || 'Admin'
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Save to payments collection
      const paymentRef = await db.collection('payments').add(paymentData);
      const paymentId = paymentRef.id;

      console.log('Payment record created:', paymentId);

      // Initialize Paystack transaction
      const paystackResponse = await PaystackService.initializeTransaction(
        userEmail,
        planDetails.price,
        {
          paymentId,
          userId: adminId,
          plan,
          callback_url: `${process.env.FRONTEND_URL}/dashboard/subscription/verify`
        }
      );

      console.log('Paystack response:', paystackResponse);

      // Update payment with Paystack reference
      await paymentRef.update({
        reference: paystackResponse.data.reference,
        paystackData: paystackResponse.data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        paymentId,
        reference: paystackResponse.data.reference,
        authorizationUrl: paystackResponse.data.authorization_url,
        accessCode: paystackResponse.data.access_code
      };
    } catch (error) {
      console.error('Initialize payment error:', error);
      throw error;
    }
  }

  static async verifyAndActivatePayment(reference) {
    try {
      console.log('Verifying and activating payment for reference:', reference);

      // Find payment by reference
      const paymentSnapshot = await db.collection('payments')
        .where('reference', '==', reference)
        .limit(1)
        .get();

      if (paymentSnapshot.empty) {
        throw new Error('Payment not found');
      }

      const paymentDoc = paymentSnapshot.docs[0];
      const payment = paymentDoc.data();

      if (payment.status === 'completed') {
        return { 
          message: 'Payment already processed', 
          payment: { id: paymentDoc.id, ...payment } 
        };
      }

      // Verify with Paystack
      const verification = await PaystackService.verifyTransaction(reference);

      console.log('Paystack verification:', verification);

      if (verification.data.status !== 'success') {
        await paymentDoc.ref.update({
          status: 'failed',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        throw new Error('Payment verification failed');
      }

      // Calculate expiry date
      const expiryDate = this.calculateExpiryDate(payment.plan);

      const subscriptionData = {
        plan: payment.plan,
        startDate: new Date(),
        expiryDate,
        amount: payment.amount,
        active: true,
        paymentStatus: 'completed',
        paymentReference: reference,
        activatedBy: 'self',
        activatedAt: new Date()
      };

      // Update user with subscription
      await db.collection('users').doc(payment.userId).update({
        subscription: subscriptionData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('User subscription updated for user:', payment.userId);

      // Update payment status
      await paymentDoc.ref.update({
        status: 'completed',
        subscriptionData,
        verificationData: verification.data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        message: 'Payment verified and subscription activated successfully',
        subscription: subscriptionData,
        payment: { id: paymentDoc.id, ...payment, status: 'completed' }
      };
    } catch (error) {
      console.error('Verify and activate payment error:', error);
      throw error;
    }
  }

  static async getPaymentHistory(adminId) {
    try {
      const snapshot = await db.collection('payments')
        .where('userId', '==', adminId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        };
      });
    } catch (error) {
      console.error('Get payment history error:', error);
      throw error;
    }
  }

  static async handleWebhook(payload) {
    try {
      const event = payload.event;
      const data = payload.data;

      console.log('Processing webhook event:', event);

      switch (event) {
        case 'charge.success':
          await this.verifyAndActivatePayment(data.reference);
          break;
        
        case 'transfer.success':
          console.log('Transfer successful:', data);
          break;
        
        case 'transfer.failed':
          console.log('Transfer failed:', data);
          break;
        
        default:
          console.log('Unhandled webhook event:', event);
      }
    } catch (error) {
      console.error('Handle webhook error:', error);
      throw error;
    }
  }

  static async activateSubscription(adminId, plan, activatedBy = 'self') {
    try {
      const adminDoc = await db.collection('users').doc(adminId).get();
      
      if (!adminDoc.exists) {
        throw new Error('Admin not found');
      }
      
      const expiryDate = this.calculateExpiryDate(plan);
      const amount = this.subscriptionPlans[plan].price;
      
      const subscriptionData = {
        plan,
        startDate: new Date(),
        expiryDate,
        amount,
        active: true,
        paymentStatus: 'completed',
        activatedBy,
        activatedAt: new Date()
      };
      
      await db.collection('users').doc(adminId).update({
        subscription: subscriptionData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return subscriptionData;
    } catch (error) {
      console.error('Activate subscription error:', error);
      throw error;
    }
  }

  static async deactivateExpiredAdmins() {
    try {
      const now = new Date();
      const snapshot = await db.collection('users')
        .where('role', '==', 'admin')
        .where('subscription.plan', '!=', 'unlimited')
        .get();
      
      const updates = [];
      
      snapshot.docs.forEach(doc => {
        const admin = doc.data();
        if (admin.subscription?.expiryDate) {
          const expiry = admin.subscription.expiryDate.toDate ? 
            admin.subscription.expiryDate.toDate() : 
            new Date(admin.subscription.expiryDate);
          if (expiry < now) {
            updates.push(
              db.collection('users').doc(doc.id).update({
                'subscription.active': false,
                'subscription.autoDeactivated': true,
                'subscription.deactivatedAt': now,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              })
            );
          }
        }
      });
      
      await Promise.all(updates);
      return { deactivated: updates.length };
    } catch (error) {
      console.error('Deactivate expired admins error:', error);
      throw error;
    }
  }

  static async getSubscriptionStats() {
    try {
      const snapshot = await db.collection('users')
        .where('role', '==', 'admin')
        .get();
      
      const stats = {
        totalAdmins: snapshot.size,
        activeSubscriptions: 0,
        expiredSubscriptions: 0,
        noSubscription: 0,
        totalRevenue: 0,
        byPlan: {
          monthly: 0,
          termly: 0,
          yearly: 0,
          unlimited: 0
        }
      };
      
      snapshot.docs.forEach(doc => {
        const admin = doc.data();
        
        if (!admin.subscription) {
          stats.noSubscription++;
          return;
        }
        
        if (admin.subscription.amount) {
          stats.totalRevenue += admin.subscription.amount;
        }
        
        if (admin.subscription.plan) {
          stats.byPlan[admin.subscription.plan] = (stats.byPlan[admin.subscription.plan] || 0) + 1;
        }
        
        if (admin.subscription.active) {
          stats.activeSubscriptions++;
        } else {
          stats.expiredSubscriptions++;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Get subscription stats error:', error);
      throw error;
    }
  }
}

module.exports = SubscriptionService;