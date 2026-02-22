const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(authorize('student'));

router.post('/start', examController.startExam);
router.post('/:examId/submit', examController.submitExam);
router.get('/:examId', examController.getExamById);
router.post('/:examId/tab-switch', examController.recordTabSwitch);
router.post('/:examId/save-answer', examController.saveAnswer);
router.get('/results/all', examController.getResults);
router.get('/performance/summary', examController.getPerformance);

module.exports = router;