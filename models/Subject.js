const { db } = require('../config/firebase');
const admin = require('firebase-admin');

class Subject {
  static collection = 'subjects';

  static async create(subjectData) {
    const subjectRef = db.collection(this.collection).doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const subject = {
      id: subjectRef.id,
      ...subjectData,
      questionCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await subjectRef.set(subject);
    return subject;
  }

  static async findAll(filters = {}) {
    let query = db.collection(this.collection);
    
    if (filters.schoolId) {
      query = query.where('schoolId', '==', filters.schoolId);
    } else {
      query = query.where('isGlobal', '==', true);
    }
    
    if (filters.class) {
      query = query.where('class', '==', filters.class);
    }
    
    if (filters.examType) {
      query = query.where('examType', '==', filters.examType);
    }
    
    if (filters.name) {
      query = query.where('name', '==', filters.name);
    }
    
    const snapshot = await query.get();
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
    const subjectRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await subjectRef.update({
      ...updateData,
      updatedAt: timestamp
    });
    
    const updated = await subjectRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  static async delete(id) {
    await db.collection(this.collection).doc(id).delete();
    return { message: 'Subject deleted successfully' };
  }

  static async initializeDefaultSubjects() {
    const defaultSubjects = [
      { name: 'Mathematics', code: 'MATH', description: 'Mathematics', isGlobal: true, examType: 'WAEC', duration: 120, questionCount: 50 },
      { name: 'English Language', code: 'ENG', description: 'English Language', isGlobal: true, examType: 'WAEC', duration: 120, questionCount: 50 }
    ];
    
    for (const subject of defaultSubjects) {
      const existing = await this.findAll({ name: subject.name });
      if (existing.length === 0) {
        await this.create(subject);
      }
    }
  }
}

module.exports = Subject;