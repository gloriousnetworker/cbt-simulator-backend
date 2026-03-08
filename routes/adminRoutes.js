// routes/adminRoutes.js (updated)
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const questionController = require('../controllers/questionController');
const paymentController = require('../controllers/paymentController');
const examSetupController = require('../controllers/examSetupController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate, createStudentValidation, createQuestionValidation } = require('../middleware/validationMiddleware');

router.use(authenticate);
router.use(authorize('admin'));

// Public admin routes (always accessible)
router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);
router.post('/change-password', adminController.changePassword);

// Subscription and Payment routes
router.get('/subscription/plans', adminController.getSubscriptionPlans);
router.post('/subscription/initialize', paymentController.initializePayment);
router.get('/subscription/verify/:reference', paymentController.verifyPayment);
router.get('/subscription/payments', paymentController.getPaymentHistory);
router.get('/subscription/status', adminController.getSubscriptionStatus);
router.get('/payment/methods', paymentController.getPaymentMethods);

// Webhook (public endpoint - no auth)
router.post('/payment/webhook', paymentController.handleWebhook);

// Subject routes (always accessible - read-only without subscription)
router.get('/subjects', adminController.getAllSubjects);
router.get('/subjects/:subjectId', adminController.getSubjectById);

// Exam Setup routes (require active subscription)
router.post('/exam-setups', examSetupController.createExamSetup);
router.get('/exam-setups', examSetupController.getAllExamSetups);
router.get('/exam-setups/:examId', examSetupController.getExamSetupById);
router.put('/exam-setups/:examId', examSetupController.updateExamSetup);
router.delete('/exam-setups/:examId', examSetupController.deleteExamSetup);
router.post('/exam-setups/:examId/activate', examSetupController.activateExam);
router.post('/exam-setups/:examId/deactivate', examSetupController.deactivateExam);
router.get('/exam-setups/:examId/results', examSetupController.getExamResults);
router.post('/exam-setups/:examId/assign-students', examSetupController.assignStudentsToExam);

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