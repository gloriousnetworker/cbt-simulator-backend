const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate, loginValidation, registerAdminValidation } = require('../middleware/validationMiddleware');

router.post('/register', validate(registerAdminValidation), authController.registerAdmin);
router.post('/verify-email', authController.verifyEmail);
router.post('/login', validate(loginValidation), authController.login);
router.post('/verify-2fa', authController.verify2FA);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);
router.get('/me', authenticate, authController.getMe);

router.post('/setup-2fa', authenticate, authorize('super_admin', 'admin'), authController.setup2FA);
router.post('/verify-2fa-setup', authenticate, authorize('super_admin', 'admin'), authController.verify2FASetup);
router.post('/disable-2fa', authenticate, authorize('super_admin', 'admin'), authController.disable2FA);

router.post('/create-super-admin', authController.createSuperAdmin);

module.exports = router;