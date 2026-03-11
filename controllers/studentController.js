// controllers/studentController.js
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const TokenService = require('../services/tokenService');
const { db } = require('../config/firebase');

const studentLogin = async (req, res) => {
  try {
    const { loginId, nin, password } = req.body;
    
    let student;
    
    if (!db) {
      return res.status(500).json({ 
        message: 'Database connection error',
        error: 'Firebase not initialized'
      });
    }
    
    if (loginId) {
      const snapshot = await db.collection('students')
        .where('loginId', '==', loginId)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        student = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
    } else if (nin) {
      const snapshot = await db.collection('students')
        .where('nin', '==', nin)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        student = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
    }
    
    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, student.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    if (student.status !== 'active') {
      return res.status(401).json({ message: 'Account is not active' });
    }
    
    const tokens = TokenService.generateTokens({
      id: student.id,
      email: student.email,
      role: 'student'
    });
    
    TokenService.setTokenCookies(res, tokens);
    
    const { password: pwd, ...studentWithoutPassword } = student;
    
    res.json({
      message: 'Login successful',
      user: {
        ...studentWithoutPassword,
        role: 'student'
      },
      examMode: student.examMode || false,
      currentExam: student.currentExam || null
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.student.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const performance = await Exam.getResults(req.student.id);
    const currentExam = student.currentExam ? await Exam.findById(student.currentExam) : null;
    
    const { password: pwd, ...studentWithoutPassword } = student;
    
    res.json({
      student: studentWithoutPassword,
      performance,
      examMode: student.examMode,
      currentExam: currentExam ? {
        id: currentExam.id,
        subject: currentExam.subject,
        subjectId: currentExam.subjectId,
        status: currentExam.status
      } : null
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { phone, dateOfBirth } = req.body;
    
    const student = await Student.update(req.student.id, {
      phone,
      dateOfBirth
    });
    
    const { password, ...studentWithoutPassword } = student;
    
    res.json({
      message: 'Profile updated successfully',
      student: studentWithoutPassword
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const student = await Student.findById(req.student.id);
    
    const isValidPassword = await bcrypt.compare(currentPassword, student.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await Student.update(req.student.id, { password: hashedPassword });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getSubjects = async (req, res) => {
  try {
    const student = await Student.findById(req.student.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const subjectNames = student.subjects || [];
    const subjects = [];
    
    for (const name of subjectNames) {
      const subjectList = await Subject.findAll({ 
        name: name
      });
      
      subjects.push(...subjectList);
    }
    
    const uniqueSubjects = subjects.filter((subject, index, self) => 
      index === self.findIndex(s => s.id === subject.id)
    );
    
    res.json({ 
      subjects: uniqueSubjects,
      subjectNames: subjectNames 
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getPracticeQuestions = async (req, res) => {
  try {
    const { subjectId, count = 20 } = req.query;
    
    console.log('Practice questions request:', { subjectId, count });
    
    if (!subjectId) {
      return res.status(400).json({ message: 'subjectId is required' });
    }

    const student = await Student.findById(req.student.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const subject = await Subject.findById(subjectId);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    // Check if student is enrolled in this subject
    const subjectNames = student.subjects || [];
    if (!subjectNames.includes(subject.name)) {
      return res.status(403).json({ message: 'You are not enrolled in this subject' });
    }
    
    const questions = await Question.getRandomQuestions(
      subjectId, 
      parseInt(count) || 20, 
      student.class,
      'practice'
    );
    
    console.log(`Found ${questions.length} practice questions`);
    
    // For practice mode, include correctAnswer and explanation to help students learn
    const questionsForClient = questions.map(q => ({
      id: q.id,
      subjectId: q.subjectId,
      subjectName: q.subjectName,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer, // Include correct answer for practice mode
      marks: q.marks || 1,
      difficulty: q.difficulty,
      topic: q.topic || 'General',
      class: q.class,
      examType: q.examType,
      mode: q.mode,
      explanation: q.explanation || 'No explanation provided'
    }));
    
    res.json({ 
      subject: subject.name,
      subjectId: subject.id,
      totalQuestions: questions.length,
      questions: questionsForClient 
    });
  } catch (error) {
    console.error('Get practice questions error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getExamHistory = async (req, res) => {
  try {
    const exams = await Exam.findByStudent(req.student.id, 'completed');
    
    const formattedExams = exams.map(exam => ({
      id: exam.id,
      examSetupId: exam.examSetupId,
      subject: exam.subject,
      subjects: exam.subjects,
      score: exam.score || 0,
      totalMarks: exam.totalMarks || 0,
      percentage: exam.percentage || 0,
      date: exam.endTime || exam.createdAt,
      duration: exam.duration,
      questionCount: exam.questionCount,
      status: exam.status
    }));
    
    res.json({ exams: formattedExams });
  } catch (error) {
    console.error('Get exam history error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  studentLogin,
  getProfile,
  updateProfile,
  changePassword,
  getSubjects,
  getPracticeQuestions,
  getExamHistory
};