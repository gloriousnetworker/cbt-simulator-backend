const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate, createAdminValidation, createSubjectValidation } = require('../middleware/validationMiddleware');

router.use(authenticate);
router.use(authorize('super_admin'));

router.post('/admins', validate(createAdminValidation), superAdminController.createAdmin);
router.get('/admins', superAdminController.getAllAdmins);
router.get('/admins/:adminId', superAdminController.getAdminById);
router.put('/admins/:adminId', superAdminController.updateAdmin);
router.delete('/admins/:adminId', superAdminController.deleteAdmin);
router.patch('/admins/:adminId/status', superAdminController.toggleAdminStatus);

router.post('/schools', superAdminController.createSchool);
router.get('/schools', superAdminController.getAllSchools);
router.get('/schools/:schoolId', superAdminController.getSchoolById);
router.put('/schools/:schoolId', superAdminController.updateSchool);
router.delete('/schools/:schoolId', superAdminController.deleteSchool);
router.patch('/schools/:schoolId/status', superAdminController.toggleSchoolStatus);

router.post('/subjects', validate(createSubjectValidation), superAdminController.createSubject);
router.get('/subjects', superAdminController.getAllSubjects);
router.get('/subjects/:subjectId', superAdminController.getSubjectById);
router.put('/subjects/:subjectId', superAdminController.updateSubject);
router.delete('/subjects/:subjectId', superAdminController.deleteSubject);

router.get('/students', superAdminController.getAllStudents);

router.get('/tickets', superAdminController.getTickets);
router.get('/tickets/:ticketId', superAdminController.getTicketById);
router.post('/tickets/:ticketId/respond', superAdminController.respondToTicket);
router.patch('/tickets/:ticketId/status', superAdminController.updateTicketStatus);

router.get('/dashboard/stats', superAdminController.getDashboardStats);

router.post('/reports/generate', superAdminController.generateReport);

module.exports = router;