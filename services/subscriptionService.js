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
    
    const days = this.subscriptionPlans[plan]?.days;
    if (!days) return null;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate;
  }

  static async checkSubscriptionStatus(adminId) {
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
        daysLeft: null
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

  static async activateSubscription(adminId, plan, activatedBy = 'self') {
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
      updatedAt: new Date()
    });
    
    return subscriptionData;
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
        const expiry = admin.subscription.expiryDate.toDate ? 
          admin.subscription.expiryDate.toDate() : 
          new Date(admin.subscription.expiryDate);
        if (expiry < now) {
          updates.push(
            db.collection('users').doc(doc.id).update({
              'subscription.active': false,
              'subscription.autoDeactivated': true,
              'subscription.deactivatedAt': now
            })
          );
        }
      }
    });
    
    await Promise.all(updates);
    return { deactivated: updates.length };
  }

  static async getSubscriptionStats() {
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
  }
}

module.exports = SubscriptionService;