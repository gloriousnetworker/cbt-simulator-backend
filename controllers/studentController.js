// controllers/studentController.js
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Exam = require('../models/Exam');
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
      }
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
    
    const { password: pwd, ...studentWithoutPassword } = student;
    
    res.json({
      student: studentWithoutPassword,
      performance
    });
  } catch (error) {
    console.error('Get profile error:', error);
    if (error.code === 'FAILED_PRECONDITION') {
      return res.status(400).json({ 
        message: 'Please create the required Firestore index first',
        link: 'https://console.firebase.google.com/v1/r/project/cbt-simulator/firestore/indexes'
      });
    }
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
    
    const subjectNames = student.subjects || [];
    
    const subjects = [];
    for (const name of subjectNames) {
      const subjectList = await Subject.findAll({ 
        schoolId: student.schoolId,
        name: name
      });
      if (subjectList.length > 0) {
        subjects.push(subjectList[0]);
      }
    }
    
    res.json({ 
      subjects: subjects,
      subjectNames: subjectNames 
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getExamHistory = async (req, res) => {
  try {
    const exams = await Exam.findByStudent(req.student.id);
    
    res.json({ exams });
  } catch (error) {
    console.error('Get exam history error:', error);
    if (error.code === 'FAILED_PRECONDITION') {
      return res.status(400).json({ 
        message: 'Please create the required Firestore index first',
        link: 'https://console.firebase.google.com/v1/r/project/cbt-simulator/firestore/indexes'
      });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  studentLogin,
  getProfile,
  updateProfile,
  changePassword,
  getSubjects,
  getExamHistory
};