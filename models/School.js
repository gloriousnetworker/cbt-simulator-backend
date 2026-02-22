const { db } = require('../config/firebase');
const admin = require('firebase-admin');

class School {
  static collection = 'schools';

  static async create(schoolData) {
    const schoolRef = db.collection(this.collection).doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const school = {
      id: schoolRef.id,
      ...schoolData,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await schoolRef.set(school);
    return school;
  }

  static async findAll() {
    const snapshot = await db.collection(this.collection).get();
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

  static async update(id, updateData) {
    const schoolRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await schoolRef.update({
      ...updateData,
      updatedAt: timestamp
    });
    
    const updated = await schoolRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  static async getStats() {
    const schools = await this.findAll();
    const totalSchools = schools.length;
    const activeSchools = schools.filter(s => s.status === 'active').length;
    
    return { totalSchools, activeSchools };
  }
}

module.exports = School;