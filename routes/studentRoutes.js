// routes/studentRoutes.js (updated - add exam routes for students)
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const examController = require('../controllers/examController');
const examSetupController = require('../controllers/examSetupController');
const { authenticateStudent } = require('../middleware/authMiddleware');

// Public route
router.post('/login', studentController.studentLogin);

// Protected routes
router.use(authenticateStudent);

router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);
router.post('/change-password', studentController.changePassword);
router.get('/subjects', studentController.getSubjects);
router.get('/practice', studentController.getPracticeQuestions);
router.get('/history', studentController.getExamHistory);

// Exam routes
router.get('/available-exams', examSetupController.getAvailableExamsForStudent);
router.post('/exams/start', examController.startExam);
router.post('/exams/:examId/submit', examController.submitExam);
router.get('/exams/:examId', examController.getExamById);
router.post('/exams/:examId/tab-switch', examController.recordTabSwitch);
router.post('/exams/:examId/save-answer', examController.saveAnswer);
router.get('/results', examController.getResults);
router.get('/performance', examController.getPerformance);

module.exports = router;