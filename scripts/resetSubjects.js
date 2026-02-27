const { db } = require('../config/firebase');
const Subject = require('../models/Subject');

async function resetSubjects() {
  try {
    console.log('Resetting subjects...');
    
    // Delete all subjects
    const snapshot = await db.collection('subjects').get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    console.log(`Deleted ${snapshot.size} subjects`);
    
    // Re-initialize default subjects
    await Subject.initializeDefaultSubjects();
    
    console.log('Default subjects re-initialized');
    
    // Verify
    const subjects = await Subject.findAll({ isGlobal: true });
    console.log('Current subjects:', subjects.map(s => ({ name: s.name, id: s.id })));
    
  } catch (error) {
    console.error('Error resetting subjects:', error);
  } finally {
    process.exit(0);
  }
}

resetSubjects();