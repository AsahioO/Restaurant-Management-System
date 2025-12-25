const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validation');

// Login
router.post('/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida'),
  ],
  handleValidation,
  authController.login
);

// Refresh token
router.post('/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token requerido'),
  ],
  handleValidation,
  authController.refreshToken
);

// Logout
router.post('/logout', authenticate, authController.logout);

// Obtener perfil
router.get('/profile', authenticate, authController.getProfile);

// Cambiar contraseña
router.post('/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
    body('newPassword')
      .isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  ],
  handleValidation,
  authController.changePassword
);

module.exports = router;
