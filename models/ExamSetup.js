// models/ExamSetup.js
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

class ExamSetup {
  static collection = 'examSetups';

  static async create(examData) {
    const examRef = db.collection(this.collection).doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const exam = {
      id: examRef.id,
      ...examData,
      status: 'draft',
      assignedStudents: [],
      results: {},
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await examRef.set(exam);
    return exam;
  }

  static async findAll(filters = {}) {
    let query = db.collection(this.collection);
    
    if (filters.schoolId) {
      query = query.where('schoolId', '==', filters.schoolId);
    }
    
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    
    if (filters.class) {
      query = query.where('class', '==', filters.class);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
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

  static async delete(id) {
    await db.collection(this.collection).doc(id).delete();
    return { message: 'Exam setup deleted successfully' };
  }

  static async assignStudents(id, studentIds) {
    const examRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await examRef.update({
      assignedStudents: studentIds,
      updatedAt: timestamp
    });
    
    const updated = await examRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  static async addResult(id, studentId, result) {
    const examRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await examRef.update({
      [`results.${studentId}`]: result,
      updatedAt: timestamp
    });
    
    const updated = await examRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  static async getResults(id) {
    const exam = await this.findById(id);
    if (!exam) return null;
    
    const results = [];
    for (const [studentId, result] of Object.entries(exam.results || {})) {
      const studentDoc = await db.collection('students').doc(studentId).get();
      const student = studentDoc.exists ? studentDoc.data() : null;
      
      results.push({
        studentId,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        studentClass: student ? student.class : 'N/A',
        ...result
      });
    }
    
    return results.sort((a, b) => b.score - a.score);
  }

  static async getQuestionsForExam(examId) {
    const exam = await this.findById(examId);
    if (!exam) return null;
    
    const Question = require('./Question');
    const allQuestions = [];
    
    for (const subjectConfig of exam.subjects) {
      for (const questionId of subjectConfig.questions) {
        const question = await Question.findById(questionId);
        if (question) {
          allQuestions.push(question);
        }
      }
    }
    
    return allQuestions;
  }

  static async getActiveExamsForStudent(studentId, schoolId, studentClass) {
    const now = new Date();
    const Question = require('./Question');
    
    const snapshot = await db.collection(this.collection)
      .where('schoolId', '==', schoolId)
      .where('status', '==', 'active')
      .where('class', '==', studentClass)
      .get();
    
    const activeExams = [];
    
    for (const doc of snapshot.docs) {
      const exam = { id: doc.id, ...doc.data() };
      
      const startDateTime = exam.startDateTime?.toDate ? exam.startDateTime.toDate() : new Date(exam.startDateTime);
      const endDateTime = exam.endDateTime?.toDate ? exam.endDateTime.toDate() : new Date(exam.endDateTime);
      
      if (now >= startDateTime && now <= endDateTime) {
        if (exam.assignedStudents.includes(studentId) || exam.assignedStudents.length === 0) {
          const studentExamRef = db.collection('exams')
            .where('studentId', '==', studentId)
            .where('examSetupId', '==', exam.id)
            .limit(1);
          
          const studentExamSnapshot = await studentExamRef.get();
          
          if (studentExamSnapshot.empty) {
            // Get questions for this exam
            const questions = [];
            for (const subjectConfig of exam.subjects) {
              for (const questionId of subjectConfig.questions) {
                const question = await Question.findById(questionId);
                if (question) {
                  // Remove correctAnswer from question for client
                  const { correctAnswer, ...questionWithoutAnswer } = question;
                  questions.push({
                    ...questionWithoutAnswer,
                    subjectName: subjectConfig.subjectName
                  });
                }
              }
            }
            
            // Shuffle questions if enabled
            if (exam.shuffleQuestions) {
              questions.sort(() => 0.5 - Math.random());
            }
            
            activeExams.push({
              id: exam.id,
              title: exam.title,
              description: exam.description,
              class: exam.class,
              subjects: exam.subjects,
              duration: exam.duration,
              totalMarks: exam.totalMarks,
              passMark: exam.passMark,
              instructions: exam.instructions,
              questions: questions,
              questionCount: questions.length,
              startDateTime: exam.startDateTime,
              endDateTime: exam.endDateTime,
              shuffleQuestions: exam.shuffleQuestions,
              showResults: exam.showResults,
              allowRetake: exam.allowRetake
            });
          }
        }
      }
    }
    
    return activeExams;
  }
}

module.exports = ExamSetup;