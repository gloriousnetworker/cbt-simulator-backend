const { db } = require('../config/firebase');

class Student {
  static collection = 'students';

  static async create(studentData) {
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
    let query = db.collection(this.collection);
    
    if (filters.schoolId) {
      query = query.where('schoolId', '==', filters.schoolId);
    }
    
    if (filters.class) {
      query = query.where('class', '==', filters.class);
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
    await db.collection(this.collection).doc(id).delete();
    return { message: 'Student deleted successfully' };
  }

  static async getStudentCount(schoolId) {
    const snapshot = await db.collection(this.collection)
      .where('schoolId', '==', schoolId)
      .get();
    
    return snapshot.size;
  }
}

module.exports = Student;