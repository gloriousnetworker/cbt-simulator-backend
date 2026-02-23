const { db } = require('../config/firebase');
const admin = require('firebase-admin');

class Student {
  static collection = 'students';

  static async create(studentData) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const studentRef = db.collection(this.collection).doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const student = {
      id: studentRef.id,
      ...studentData,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await studentRef.set(student);
    return student;
  }

  static async findAll(filters = {}) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    let query = db.collection(this.collection);
    
    if (filters.schoolId) {
      query = query.where('schoolId', '==', filters.schoolId);
    }
    
    if (filters.class) {
      query = query.where('class', '==', filters.class);
    }
    
    if (filters.loginId) {
      query = query.where('loginId', '==', filters.loginId);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
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

  static async update(id, updateData) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const studentRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await studentRef.update({
      ...updateData,
      updatedAt: timestamp
    });
    
    const updated = await studentRef.get();
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
    return { message: 'Student deleted successfully' };
  }

  static async getStudentCount(schoolId) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const snapshot = await db.collection(this.collection)
      .where('schoolId', '==', schoolId)
      .get();
    
    return snapshot.size;
  }
}

module.exports = Student;