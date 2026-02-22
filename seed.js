const bcrypt = require('bcryptjs');
const { db } = require('./config/firebase');

async function createInitialSuperAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);
    
    const superAdmin = {
      email: 'superadmin@megatechsolutions.org',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'super_admin',
      status: 'active',
      createdAt: new Date()
    };
    
    await db.collection('users').add(superAdmin);
    
    console.log('Initial super admin created successfully');
    console.log('Email: superadmin@megatechsolutions.org');
    console.log('Password: SuperAdmin123!');
  } catch (error) {
    console.error('Error creating super admin:', error);
  }
}

createInitialSuperAdmin();