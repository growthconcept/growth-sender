import express from 'express';
import { body } from 'express-validator';
import authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// Registro
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    validate
  ],
  authController.register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  authController.login
);

// Dados do usuário atual
router.get('/me', authenticate, authController.me);

// Solicitar redefinição de senha
router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('E-mail válido é obrigatório'),
    validate
  ],
  authController.forgotPassword
);

// Redefinir senha com token
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token é obrigatório'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('A senha deve ter pelo menos 6 caracteres'),
    validate
  ],
  authController.resetPassword
);

export default router;
