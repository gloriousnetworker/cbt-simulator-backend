const { db } = require('../config/firebase');
const admin = require('firebase-admin');

class Exam {
  static collection = 'exams';

  static async create(examData) {
    const examRef = db.collection(this.collection).doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const exam = {
      id: examRef.id,
      ...examData,
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await examRef.set(exam);
    return exam;
  }

  static async findByStudent(studentId) {
    const snapshot = await db.collection(this.collection)
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  static async findBySchool(schoolId) {
    const snapshot = await db.collection(this.collection)
      .where('schoolId', '==', schoolId)
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
    const examRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await examRef.update({
      ...updateData,
      updatedAt: timestamp
    });
    
    const updated = await examRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  static async getResults(studentId) {
    const exams = await this.findByStudent(studentId);
    
    const results = {
      totalExams: exams.length,
      averageScore: 0,
      subjects: {}
    };
    
    if (exams.length > 0) {
      const totalScore = exams.reduce((sum, exam) => sum + (exam.score || 0), 0);
      results.averageScore = totalScore / exams.length;
      
      exams.forEach(exam => {
        if (!results.subjects[exam.subject]) {
          results.subjects[exam.subject] = {
            attempts: 0,
            totalScore: 0
          };
        }
        results.subjects[exam.subject].attempts++;
        results.subjects[exam.subject].totalScore += exam.score || 0;
      });
    }
    
    return results;
  }
}

module.exports = Exam;