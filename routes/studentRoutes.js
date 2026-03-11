// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const examController = require('../controllers/examController');
const examSetupController = require('../controllers/examSetupController');
const practiceController = require('../controllers/practiceController');
const { authenticateStudent } = require('../middleware/studentAuthMiddleware');

// Public route
router.post('/login', studentController.studentLogin);

// Protected routes - all require authentication
router.use(authenticateStudent);

// Profile routes
router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);
router.post('/change-password', studentController.changePassword);

// Subject routes
router.get('/subjects', studentController.getSubjects);
router.get('/practice', studentController.getPracticeQuestions);
router.get('/history', studentController.getExamHistory);

// Practice result routes
router.post('/practice/save', practiceController.savePracticeResult);
router.get('/practice/history', practiceController.getPracticeHistory);
router.get('/practice/stats', practiceController.getPracticeStats);
router.delete('/practice/:practiceId', practiceController.deletePracticeRecord);

// Exam setup routes
router.get('/available-exams', examSetupController.getAvailableExamsForStudent);

// Exam routes
router.post('/exams/start', examSetupController.startStudentExam);
router.post('/exams/:examId/submit', examController.submitExam);
router.get('/exams/:examId', examController.getExamById);
router.post('/exams/:examId/tab-switch', examController.recordTabSwitch);
router.post('/exams/:examId/save-answer', examController.saveAnswer);

// Results routes
router.get('/results', examController.getResults);
router.get('/performance', examController.getPerformance);

module.exports = router;