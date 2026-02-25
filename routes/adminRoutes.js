// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const subjectController = require('../controllers/subjectController');
const questionController = require('../controllers/questionController');
const { authenticate, authorize, checkAdminSubscription } = require('../middleware/authMiddleware');
const { validate, createStudentValidation } = require('../middleware/validationMiddleware');

router.use(authenticate);
router.use(authorize('admin'));
router.use(checkAdminSubscription);

router.post('/students', validate(createStudentValidation), adminController.createStudent);
router.get('/students', adminController.getAllStudents);
router.get('/students/:studentId', adminController.getStudentById);
router.put('/students/:studentId', adminController.updateStudent);
router.delete('/students/:studentId', adminController.deleteStudent);
router.post('/students/:studentId/subjects', adminController.addStudentSubject);
router.delete('/students/:studentId/subjects', adminController.removeStudentSubject);

router.post('/change-password', adminController.changePassword);

router.post('/subjects', subjectController.createSubject);
router.get('/subjects', subjectController.getAllSubjects);
router.get('/subjects/:subjectId', subjectController.getSubjectById);
router.put('/subjects/:subjectId', subjectController.updateSubject);
router.delete('/subjects/:subjectId', subjectController.deleteSubject);

router.post('/questions', questionController.createQuestion);
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