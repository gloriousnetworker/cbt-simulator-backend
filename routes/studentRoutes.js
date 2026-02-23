const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateStudent } = require('../middleware/studentAuthMiddleware');

router.post('/login', studentController.studentLogin);

router.use(authenticateStudent);

router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);
router.put('/change-password', studentController.changePassword);
router.get('/subjects', studentController.getSubjects);
router.get('/exam-history', studentController.getExamHistory);

module.exports = router;