const { body, validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    res.status(400).json({ errors: errors.array() });
  };
};

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const createAdminValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
  body('schoolId').notEmpty(),
  body('subscription.plan').isIn(['monthly', 'termly', 'yearly', 'unlimited'])
];

const createStudentValidation = [
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('class').notEmpty(),
  body('nin').optional(),
  body('phone').optional()
];

module.exports = {
  validate,
  loginValidation,
  createAdminValidation,
  createStudentValidation
};