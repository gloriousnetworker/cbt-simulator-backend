const { db } = require('../config/firebase');

async function clearDatabase() {
  try {
    console.log('Starting database cleanup...');
    
    // Collections to clear
    const collections = ['users', 'schools', 'students', 'subjects', 'questions', 'exams', 'tickets'];
    
    for (const collectionName of collections) {
      console.log(`Clearing ${collectionName}...`);
      const snapshot = await db.collection(collectionName).get();
      
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Deleted ${snapshot.size} documents from ${collectionName}`);
    }
    
    console.log('Database cleared successfully!');
    
    // Initialize default subjects
    const Subject = require('../models/Subject');
    await Subject.initializeDefaultSubjects();
    console.log('Default subjects initialized');
    
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    process.exit(0);
  }
}

clearDatabase();