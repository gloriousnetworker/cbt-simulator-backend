const { db } = require('../config/firebase');
const admin = require('firebase-admin');

class Question {
  static collection = 'questions';

  static async create(questionData) {
    try {
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
    } catch (error) {
      console.error('Question.create error:', error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
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
    } catch (error) {
      console.error('Question.findAll error:', error);
      throw error;
    }
  }

  static async findBySubject(subjectId) {
    try {
      const snapshot = await db.collection(this.collection)
        .where('subjectId', '==', subjectId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Question.findBySubject error:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      if (!id) {
        console.error('Question.findById called with no id');
        return null;
      }
      
      console.log('Question.findById fetching:', id);
      const docRef = db.collection(this.collection).doc(id);
      const doc = await docRef.get();
      
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
    try {
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
    } catch (error) {
      console.error('Question.update error:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.collection(this.collection).doc(id).delete();
      return { message: 'Question deleted successfully' };
    } catch (error) {
      console.error('Question.delete error:', error);
      throw error;
    }
  }

  static async countBySubject(subjectId) {
    try {
      const snapshot = await db.collection(this.collection)
        .where('subjectId', '==', subjectId)
        .get();
      
      return snapshot.size;
    } catch (error) {
      console.error('Question.countBySubject error:', error);
      throw error;
    }
  }

  static async getRandomQuestions(subjectId, count, studentClass, mode, schoolId) {
    try {
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
    } catch (error) {
      console.error('Question.getRandomQuestions error:', error);
      throw error;
    }
  }
}

module.exports = Question;