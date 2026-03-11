// models/Practice.js
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

class Practice {
  static collection = 'practices';

  static async create(practiceData) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const practiceRef = db.collection(this.collection).doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const practice = {
      id: practiceRef.id,
      ...practiceData,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await practiceRef.set(practice);
    return practice;
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

  static async findByStudent(studentId, limit = 50) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const snapshot = await db.collection(this.collection)
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  static async findByStudentAndSubject(studentId, subjectId, limit = 20) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const snapshot = await db.collection(this.collection)
      .where('studentId', '==', studentId)
      .where('subjectId', '==', subjectId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  static async getStats(studentId) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const snapshot = await db.collection(this.collection)
      .where('studentId', '==', studentId)
      .get();
    
    const practices = snapshot.docs.map(doc => doc.data());
    
    const stats = {
      totalPractices: practices.length,
      totalQuestions: 0,
      totalCorrect: 0,
      averagePercentage: 0,
      bySubject: {},
      bestScore: 0,
      worstScore: 100
    };

    if (practices.length === 0) return stats;

    let totalPercentage = 0;
    
    practices.forEach(practice => {
      stats.totalQuestions += practice.totalQuestions || 0;
      stats.totalCorrect += practice.correct || 0;
      totalPercentage += practice.percentage || 0;
      
      if (practice.percentage > stats.bestScore) {
        stats.bestScore = practice.percentage;
      }
      if (practice.percentage < stats.worstScore) {
        stats.worstScore = practice.percentage;
      }
      
      if (!stats.bySubject[practice.subjectName]) {
        stats.bySubject[practice.subjectName] = {
          attempts: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          bestScore: 0
        };
      }
      
      stats.bySubject[practice.subjectName].attempts++;
      stats.bySubject[practice.subjectName].totalCorrect += practice.correct || 0;
      stats.bySubject[practice.subjectName].totalQuestions += practice.totalQuestions || 0;
      if (practice.percentage > stats.bySubject[practice.subjectName].bestScore) {
        stats.bySubject[practice.subjectName].bestScore = practice.percentage;
      }
    });

    stats.averagePercentage = Math.round(totalPercentage / practices.length);
    
    // Calculate average for each subject
    Object.keys(stats.bySubject).forEach(subject => {
      const subj = stats.bySubject[subject];
      subj.averagePercentage = Math.round((subj.totalCorrect / subj.totalQuestions) * 100) || 0;
    });

    return stats;
  }

  static async delete(id) {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    await db.collection(this.collection).doc(id).delete();
    return { message: 'Practice record deleted successfully' };
  }
}

module.exports = Practice;