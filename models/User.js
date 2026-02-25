const { db } = require('../config/firebase');
const admin = require('firebase-admin');

class User {
  static collection = 'users';

  static async create(userData) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const userRef = db.collection(this.collection).doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const user = {
      id: userRef.id,
      ...userData,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorVerified: false,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await userRef.set(user);
    return user;
  }

  static async findByEmail(email) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const snapshot = await db.collection(this.collection)
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  }

  static async findById(id) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    
    return {
      id: doc.id,
      ...doc.data()
    };
  }

  static async findAll(filters = {}) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    let query = db.collection(this.collection);
    
    if (filters.role) {
      query = query.where('role', '==', filters.role);
    }
    
    if (filters.schoolId) {
      query = query.where('schoolId', '==', filters.schoolId);
    }
    
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  static async update(id, updateData) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const userRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await userRef.update({
      ...updateData,
      updatedAt: timestamp
    });
    
    const updated = await userRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  static async enable2FA(id, secret) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const userRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await userRef.update({
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorVerified: false,
      updatedAt: timestamp
    });
    
    const updated = await userRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  static async verify2FA(id) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const userRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await userRef.update({
      twoFactorVerified: true,
      updatedAt: timestamp
    });
    
    const updated = await userRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  static async disable2FA(id) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const userRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await userRef.update({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorVerified: false,
      updatedAt: timestamp
    });
    
    const updated = await userRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  static async toggleStatus(id, status) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const userRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await userRef.update({
      status: status,
      updatedAt: timestamp
    });
    
    const updated = await userRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  static async delete(id) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    await db.collection(this.collection).doc(id).delete();
    return { message: 'User deleted successfully' };
  }
}

module.exports = User;