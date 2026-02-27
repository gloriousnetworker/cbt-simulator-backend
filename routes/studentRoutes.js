const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const examController = require('../controllers/examController');
const { authenticateStudent } = require('../middleware/studentAuthMiddleware');

router.post('/login', studentController.studentLogin);

router.use(authenticateStudent);

router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);
router.put('/change-password', studentController.changePassword);
router.get('/subjects', studentController.getSubjects);
router.get('/practice', studentController.getPracticeQuestions);
router.get('/exam-history', studentController.getExamHistory);

router.post('/exams/start', examController.startExam);
router.post('/exams/:examId/submit', examController.submitExam);
router.get('/exams/:examId', examController.getExamById);
router.post('/exams/:examId/tab-switch', examController.recordTabSwitch);
router.post('/exams/:examId/save-answer', examController.saveAnswer);
router.get('/results/all', examController.getResults);
router.get('/performance/summary', examController.getPerformance);

module.exports = router;