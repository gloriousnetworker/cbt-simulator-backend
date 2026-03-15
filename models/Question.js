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
    
    if (filters.ids && filters.ids.length > 0) {
      query = query.where('id', 'in', filters.ids);
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
  try {
    if (!id) {
      console.error('Question.findById called with no id');
      return null;
    }
    
    console.log('Question.findById fetching:', id);
    const doc = await db.collection(this.collection).doc(id).get();
    
    if (!doc.exists) {
      console.log('Question.findById: No document found for id:', id);
      return null;
    }
    
    const data = doc.data();
    console.log('Question.findById: Found document for id:', id);
    
    return {
      id: doc.id,
      ...data
    };
  } catch (error) {
    console.error('Question.findById error:', {
      id,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
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

  static async getRandomQuestions(subjectId, count, studentClass, mode, schoolId) {
    let query = db.collection(this.collection)
      .where('subjectId', '==', subjectId);
    
    if (mode) {
      query = query.where('mode', '==', mode);
    }
    
    if (schoolId) {
      query = query.where('schoolId', '==', schoolId);
    }
    
    const snapshot = await query.get();
    let questions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    questions = questions.filter(q => 
      q.class === 'General' || q.class === studentClass
    );
    
    const shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
}

module.exports = Question;