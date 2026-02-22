const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
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

router.post('/tickets', adminController.createTicket);
router.get('/tickets', adminController.getTickets);
router.post('/tickets/:ticketId/reply', adminController.replyToTicket);

router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;