const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate, createAdminValidation } = require('../middleware/validationMiddleware');

router.use(authenticate);
router.use(authorize('super_admin'));

router.post('/admins', validate(createAdminValidation), superAdminController.createAdmin);
router.get('/admins', superAdminController.getAllAdmins);

router.post('/schools', superAdminController.createSchool);
router.get('/schools', superAdminController.getAllSchools);

router.get('/students', superAdminController.getAllStudents);

router.get('/tickets', superAdminController.getTickets);
router.post('/tickets/:ticketId/respond', superAdminController.respondToTicket);
router.patch('/tickets/:ticketId/status', superAdminController.updateTicketStatus);

router.get('/dashboard/stats', superAdminController.getDashboardStats);

router.post('/reports/generate', superAdminController.generateReport);

module.exports = router;