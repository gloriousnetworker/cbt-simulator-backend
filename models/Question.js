// models/Question.js
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

class Question {
  static collection = 'questions';

  static async create(questionData) {
    const questionRef = db.collection(this.collection).doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const question = {
      id: questionRef.id,
      ...questionData,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await questionRef.set(question);
    return question;
  }

  static async findAll(filters = {}) {
    let query = db.collection(this.collection);
    
    if (filters.subjectId) {
      query = query.where('subjectId', '==', filters.subjectId);
    }
    
    if (filters.schoolId) {
      query = query.where('schoolId', '==', filters.schoolId);
    }
    
    if (filters.class) {
      if (filters.class === 'General') {
        query = query.where('class', '==', 'General');
      } else {
        query = query.where('class', '==', filters.class);
      }
    }
    
    if (filters.examType) {
      query = query.where('examType', '==', filters.examType);
    }
    
    if (filters.difficulty) {
      query = query.where('difficulty', '==', filters.difficulty);
    }
    
    if (filters.mode) {
      query = query.where('mode', '==', filters.mode);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  static async findBySubject(subjectId) {
    const snapshot = await db.collection(this.collection)
      .where('subjectId', '==', subjectId)
      .orderBy('createdAt', 'desc')
      .get();
    
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
    const questionRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await questionRef.update({
      ...updateData,
      updatedAt: timestamp
    });
    
    const updated = await questionRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  static async delete(id) {
    await db.collection(this.collection).doc(id).delete();
    return { message: 'Question deleted successfully' };
  }

  static async countBySubject(subjectId) {
    const snapshot = await db.collection(this.collection)
      .where('subjectId', '==', subjectId)
      .get();
    
    return snapshot.size;
  }

  static async getRandomQuestions(subjectId, count, studentClass, mode) {
    let query = db.collection(this.collection)
      .where('subjectId', '==', subjectId);
    
    if (mode) {
      query = query.where('mode', '==', mode);
    }
    
    const snapshot = await query.get();
    let questions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter questions that are either General class or match the student's class
    questions = questions.filter(q => 
      q.class === 'General' || q.class === studentClass
    );
    
    const shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
}

module.exports = Question;