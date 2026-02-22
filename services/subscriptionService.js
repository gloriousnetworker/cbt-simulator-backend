const { db } = require('../config/firebase');

class SubscriptionService {
  static subscriptionPlans = {
    monthly: { price: 15000, days: 30, name: 'Monthly' },
    termly: { price: 42000, days: 120, name: 'Termly' },
    yearly: { price: 120000, days: 365, name: 'Yearly' },
    unlimited: { price: 500000, days: null, name: 'Unlimited' }
  };

  static calculateExpiryDate(plan) {
    if (plan === 'unlimited') return null;
    
    const days = this.subscriptionPlans[plan].days;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate;
  }

  static async checkSubscriptionStatus(adminId) {
    const adminDoc = await db.collection('users').doc(adminId).get();
    
    if (!adminDoc.exists) return { active: false, reason: 'Admin not found' };
    
    const admin = adminDoc.data();
    
    if (admin.role !== 'admin') return { active: false, reason: 'Not an admin' };
    
    if (admin.subscription?.plan === 'unlimited') {
      return { 
        active: true, 
        plan: 'unlimited',
        goldenBadge: true 
      };
    }
    
    if (!admin.subscription?.expiryDate) {
      return { active: false, reason: 'No subscription' };
    }
    
    const now = new Date();
    const expiry = admin.subscription.expiryDate.toDate();
    
    if (expiry < now) {
      return { active: false, reason: 'Expired' };
    }
    
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    return {
      active: true,
      plan: admin.subscription.plan,
      expiryDate: expiry,
      daysLeft
    };
  }

  static async deactivateExpiredAdmins() {
    const now = new Date();
    const snapshot = await db.collection('users')
      .where('role', '==', 'admin')
      .where('subscription.plan', '!=', 'unlimited')
      .get();
    
    const updates = [];
    
    snapshot.docs.forEach(doc => {
      const admin = doc.data();
      if (admin.subscription?.expiryDate) {
        const expiry = admin.subscription.expiryDate.toDate();
        if (expiry < now) {
          updates.push(
            db.collection('users').doc(doc.id).update({
              status: 'expired',
              'subscription.active': false
            })
          );
        }
      }
    });
    
    await Promise.all(updates);
    return { deactivated: updates.length };
  }
}

module.exports = SubscriptionService;