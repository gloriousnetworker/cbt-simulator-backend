// models/Payment.js
const { db } = require('../config/firebase');

class Payment {
  static collection = 'payments';

  static async create(paymentData) {
    try {
      const paymentRef = db.collection(this.collection).doc();
      const timestamp = new Date();
      
      const payment = {
        id: paymentRef.id,
        ...paymentData,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      await paymentRef.set(payment);
      return payment;
    } catch (error) {
      console.error('Create payment error:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const doc = await db.collection(this.collection).doc(id).get();
      if (!doc.exists) return null;
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Find payment by ID error:', error);
      throw error;
    }
  }

  static async findByReference(reference) {
    try {
      const snapshot = await db.collection(this.collection)
        .where('reference', '==', reference)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Find payment by reference error:', error);
      throw error;
    }
  }

  static async findByUser(userId) {
    try {
      const snapshot = await db.collection(this.collection)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Find payments by user error:', error);
      throw error;
    }
  }

  static async update(id, data) {
    try {
      const paymentRef = db.collection(this.collection).doc(id);
      const timestamp = new Date();
      
      const updateData = {
        ...data,
        updatedAt: timestamp
      };
      
      await paymentRef.update(updateData);
      
      const updated = await paymentRef.get();
      return {
        id: updated.id,
        ...updated.data()
      };
    } catch (error) {
      console.error('Update payment error:', error);
      throw error;
    }
  }

  static async updateByReference(reference, data) {
    try {
      const payment = await this.findByReference(reference);
      if (!payment) return null;
      
      return this.update(payment.id, data);
    } catch (error) {
      console.error('Update payment by reference error:', error);
      throw error;
    }
  }
}

module.exports = Payment;