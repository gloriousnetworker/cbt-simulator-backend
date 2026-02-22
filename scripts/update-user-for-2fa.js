const { db } = require('../config/firebase');

async function updateUserFor2FA() {
  try {
    const userEmail = 'superadmin@megatechsolutions.org';
    
    const snapshot = await db.collection('users')
      .where('email', '==', userEmail)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      console.log('User not found');
      return;
    }
    
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    
    // Check if 2FA fields already exist
    if (userData.twoFactorEnabled === undefined) {
      await userDoc.ref.update({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorVerified: false
      });
      console.log('✅ User updated with 2FA fields');
    } else {
      console.log('✅ User already has 2FA fields');
    }
    
    console.log('User:', userData.email);
    process.exit(0);
  } catch (error) {
    console.error('Error updating user:', error);
    process.exit(1);
  }
}

updateUserFor2FA();