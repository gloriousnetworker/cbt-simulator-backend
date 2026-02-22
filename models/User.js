const { db } = require('../config/firebase');

class User {
  static collection = 'users';

  static async create(userData) {
    const userRef = db.collection(this.collection).doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const user = {
      id: userRef.id,
      ...userData,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await userRef.set(user);
    return user;
  }

  static async findByEmail(email) {
    const snapshot = await db.collection(this.collection)
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
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
    const userRef = db.collection(this.collection).doc(id);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await userRef.update({
      ...updateData,
      updatedAt: timestamp
    });
    
    const updated = await userRef.get();
    return {
      id: updated.id,
      ...updated.data()
    };
  }

  static async delete(id) {
    await db.collection(this.collection).doc(id).delete();
    return { message: 'User deleted successfully' };
  }
}

module.exports = User;