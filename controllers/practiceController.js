// controllers/practiceController.js
const Practice = require('../models/Practice');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

const savePracticeResult = async (req, res) => {
  try {
    const { 
      subjectId, 
      subjectName, 
      totalQuestions, 
      correct, 
      wrong, 
      unanswered, 
      percentage, 
      duration,
      difficulty,
      isTimedTest 
    } = req.body;

    if (!subjectId || !subjectName || totalQuestions === undefined || correct === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const student = await Student.findById(req.student.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const practiceData = {
      studentId: req.student.id,
      schoolId: student.schoolId,
      subjectId,
      subjectName,
      totalQuestions,
      correct,
      wrong: wrong || 0,
      unanswered: unanswered || 0,
      percentage,
      duration: duration || 0,
      difficulty: difficulty || 'all',
      isTimedTest: isTimedTest || false,
      studentClass: student.class,
      date: new Date()
    };

    const practice = await Practice.create(practiceData);

    res.status(201).json({
      message: 'Practice result saved successfully',
      practice
    });
  } catch (error) {
    console.error('Save practice result error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getPracticeHistory = async (req, res) => {
  try {
    const { subjectId, limit = 50 } = req.query;
    
    let practices;
    if (subjectId) {
      practices = await Practice.findByStudentAndSubject(req.student.id, subjectId, parseInt(limit));
    } else {
      practices = await Practice.findByStudent(req.student.id, parseInt(limit));
    }

    const formattedPractices = practices.map(practice => ({
      id: practice.id,
      subjectId: practice.subjectId,
      subjectName: practice.subjectName,
      totalQuestions: practice.totalQuestions,
      correct: practice.correct,
      wrong: practice.wrong,
      unanswered: practice.unanswered,
      percentage: practice.percentage,
      duration: practice.duration,
      difficulty: practice.difficulty,
      isTimedTest: practice.isTimedTest,
      date: practice.createdAt,
      studentClass: practice.studentClass
    }));

    res.json({ practices: formattedPractices });
  } catch (error) {
    console.error('Get practice history error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getPracticeStats = async (req, res) => {
  try {
    const stats = await Practice.getStats(req.student.id);
    res.json({ stats });
  } catch (error) {
    console.error('Get practice stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deletePracticeRecord = async (req, res) => {
  try {
    const { practiceId } = req.params;
    
    const practice = await Practice.findById(practiceId);
    if (!practice || practice.studentId !== req.student.id) {
      return res.status(404).json({ message: 'Practice record not found' });
    }

    await Practice.delete(practiceId);
    res.json({ message: 'Practice record deleted successfully' });
  } catch (error) {
    console.error('Delete practice record error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  savePracticeResult,
  getPracticeHistory,
  getPracticeStats,
  deletePracticeRecord
};