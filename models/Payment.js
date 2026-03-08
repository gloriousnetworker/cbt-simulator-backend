// models/Payment.js
const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

class Payment {
  static collection = 'payments';

  static async create(paymentData) {
    const id = uuidv4();
    const payment = {
      id,
      ...paymentData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await db.collection(this.collection).doc(id).set(payment);
    return payment;
  }

  static async findById(id) {
    const doc = await db.collection(this.collection).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  static async findByReference(reference) {
    const snapshot = await db
      .collection(this.collection)
      .where('reference', '==', reference)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  static async findByUser(userId) {
    const snapshot = await db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async update(id, data) {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    await db.collection(this.collection).doc(id).update(updateData);
    return this.findById(id);
  }

  static async updateByReference(reference, data) {
    const payment = await this.findByReference(reference);
    if (!payment) return null;
    return this.update(payment.id, data);
  }
}

module.exports = Payment;