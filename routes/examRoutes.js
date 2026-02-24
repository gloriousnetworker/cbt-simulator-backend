// routes/examRoutes.js
const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { authenticateStudent } = require('../middleware/studentAuthMiddleware');

router.use(authenticateStudent);

router.post('/start', examController.startExam);
router.post('/:examId/submit', examController.submitExam);
router.get('/:examId', examController.getExamById);
router.post('/:examId/tab-switch', examController.recordTabSwitch);
router.post('/:examId/save-answer', examController.saveAnswer);
router.get('/results/all', examController.getResults);
router.get('/performance/summary', examController.getPerformance);

module.exports = router;