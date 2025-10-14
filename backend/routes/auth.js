const express = require('express');
const { body } = require('express-validator');
const { signup, signin, forgotPassword } = require('../controllers/authController');

const router = express.Router();

// Validation middleware
const signupValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role').optional().isIn(['admin', 'operator', 'viewer'])
];

const signinValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail()
];

// Routes
router.post('/signup', signupValidation, signup);
router.post('/signin', signinValidation, signin);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);

module.exports = router;
