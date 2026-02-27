const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const questionController = require('../controllers/questionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate, createStudentValidation, createQuestionValidation } = require('../middleware/validationMiddleware');

router.use(authenticate);
router.use(authorize('admin'));

// Public admin routes (always accessible)
router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);
router.post('/change-password', adminController.changePassword);

// Subscription routes (always accessible)
router.get('/subscription/plans', adminController.getSubscriptionPlans);
router.post('/subscription/activate', adminController.activateSubscription);
router.get('/subscription/status', adminController.getSubscriptionStatus);

// Subject routes (always accessible - read-only without subscription)
router.get('/subjects', adminController.getAllSubjects);
router.get('/subjects/:subjectId', adminController.getSubjectById);

// Protected routes (require active subscription)
router.post('/students', validate(createStudentValidation), adminController.createStudent);
router.get('/students', adminController.getAllStudents);
router.get('/students/:studentId', adminController.getStudentById);
router.put('/students/:studentId', adminController.updateStudent);
router.delete('/students/:studentId', adminController.deleteStudent);
router.patch('/students/:studentId/exam-mode', adminController.toggleExamMode);
router.post('/students/:studentId/subjects', adminController.addStudentSubject);
router.delete('/students/:studentId/subjects', adminController.removeStudentSubject);

router.post('/questions', validate(createQuestionValidation), questionController.createQuestion);
router.post('/questions/bulk-import', questionController.bulkImportQuestions);
router.get('/questions', questionController.getAllQuestions);
router.get('/questions/:questionId', questionController.getQuestionById);
router.put('/questions/:questionId', questionController.updateQuestion);
router.delete('/questions/:questionId', questionController.deleteQuestion);

router.post('/tickets', adminController.createTicket);
router.get('/tickets', adminController.getTickets);
router.post('/tickets/:ticketId/reply', adminController.replyToTicket);

router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;