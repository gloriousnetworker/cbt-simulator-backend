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

const registerAdminValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
  body('schoolName').notEmpty(),
  body('schoolAddress').notEmpty(),
  body('schoolPhone').notEmpty(),
  body('subscription.plan').isIn(['monthly', 'termly', 'yearly', 'unlimited']).optional(),
  body('subscription.paymentMethod').optional().isString()
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
  body('class').notEmpty()
];

const createSubjectValidation = [
  body('name').notEmpty(),
  body('code').notEmpty()
];

const createQuestionValidation = [
  body('subjectId').notEmpty(),
  body('question').notEmpty(),
  body('options').isArray({ min: 4, max: 4 }),
  body('correctAnswer').notEmpty(),
  body('mode').isIn(['exam', 'practice'])
];

module.exports = {
  validate,
  loginValidation,
  registerAdminValidation,
  createAdminValidation,
  createStudentValidation,
  createSubjectValidation,
  createQuestionValidation
};