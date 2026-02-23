const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
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
    
    const { password: _, ...studentWithoutPassword } = student;
    
    res.json({
      message: 'Login successful',
      user: {
        ...studentWithoutPassword,
        role: 'student'
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const performance = await Exam.getResults(req.user.id);
    
    const { password: _, ...studentWithoutPassword } = student;
    
    res.json({
      student: studentWithoutPassword,
      performance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { phone, dateOfBirth } = req.body;
    
    const student = await Student.update(req.user.id, {
      phone,
      dateOfBirth
    });
    
    const { password: _, ...studentWithoutPassword } = student;
    
    res.json({
      message: 'Profile updated successfully',
      student: studentWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const student = await Student.findById(req.user.id);
    
    const isValidPassword = await bcrypt.compare(currentPassword, student.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await Student.update(req.user.id, { password: hashedPassword });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSubjects = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    
    res.json({ subjects: student.subjects || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExamHistory = async (req, res) => {
  try {
    const exams = await Exam.findByStudent(req.user.id);
    
    res.json({ exams });
  } catch (error) {
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