const { db } = require('../config/firebase');
const admin = require('firebase-admin');

class Ticket {
  static collection = 'tickets';

  static async create(ticketData) {
    const ticketRef = db.collection(this.collection).doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const ticket = {
      id: ticketRef.id,
      ...ticketData,
      status: 'open',
      messages: [],
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await ticketRef.set(ticket);
    return ticket;
  }

  static async findAll(filters = {}) {
    let query = db.collection(this.collection);
    
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    
    if (filters.schoolId) {
      query = query.where('schoolId', '==', filters.schoolId);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  static async findById(id) {
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    
    return {
      id: doc.id,
      ...doc.data()
    };
  }

  static async addMessage(id, message) {
    const ticketRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await ticketRef.update({
      messages: admin.firestore.FieldValue.arrayUnion({
        ...message,
        timestamp
      }),
      updatedAt: timestamp
    });
    
    const updated = await ticketRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  static async updateStatus(id, status) {
    const ticketRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await ticketRef.update({
      status,
      updatedAt: timestamp
    });
    
    const updated = await ticketRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }
}

module.exports = Ticket;