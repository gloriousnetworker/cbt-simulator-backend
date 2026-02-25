// models/Ticket.js
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
      messages: [], // Initialize empty messages array
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
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
    }));
  }

  static async findById(id) {
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
    };
  }

  static async addMessage(id, messageData) {
    const ticketRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const message = {
      ...messageData,
      timestamp: new Date().toISOString() // Use ISO string instead of serverTimestamp
    };
    
    await ticketRef.update({
      messages: admin.firestore.FieldValue.arrayUnion(message),
      updatedAt: timestamp,
      status: 'in_progress'
    });
    
    const updated = await ticketRef.get();
    return {
      id: updated.id,
      ...updated.data(),
      createdAt: updated.data().createdAt?.toDate?.() || updated.data().createdAt,
      updatedAt: updated.data().updatedAt?.toDate?.() || updated.data().updatedAt
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
      ...updated.data(),
      createdAt: updated.data().createdAt?.toDate?.() || updated.data().createdAt,
      updatedAt: updated.data().updatedAt?.toDate?.() || updated.data().updatedAt
    };
  }

  static async delete(id) {
    await db.collection(this.collection).doc(id).delete();
    return { message: 'Ticket deleted successfully' };
  }
}

module.exports = Ticket;