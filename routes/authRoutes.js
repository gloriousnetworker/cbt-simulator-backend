const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate, loginValidation } = require('../middleware/validationMiddleware');

router.post('/login', validate(loginValidation), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);
router.get('/me', authenticate, authController.getMe);

router.post('/create-super-admin', authController.createSuperAdmin);

module.exports = router;