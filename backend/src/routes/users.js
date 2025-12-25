const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { gerenteOnly } = require('../middleware/authorize');
const { handleValidation } = require('../middleware/validation');

// Todas las rutas requieren autenticación y rol gerente
router.use(authenticate);
router.use(gerenteOnly);

// Listar usuarios
router.get('/', userController.getUsers);

// Obtener usuario por ID
router.get('/:id',
  [param('id').isInt().withMessage('ID inválido')],
  handleValidation,
  userController.getUserById
);

// Crear usuario
router.post('/',
  [
    body('nombre').notEmpty().withMessage('Nombre requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('rol').isIn(['gerente', 'empleado']).withMessage('Rol inválido'),
  ],
  handleValidation,
  userController.createUser
);

// Actualizar usuario
router.put('/:id',
  [param('id').isInt().withMessage('ID inválido')],
  handleValidation,
  userController.updateUser
);

// Eliminar usuario
router.delete('/:id',
  [param('id').isInt().withMessage('ID inválido')],
  handleValidation,
  userController.deleteUser
);

// Resetear contraseña
router.post('/:id/reset-password',
  [
    param('id').isInt().withMessage('ID inválido'),
    body('newPassword').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  ],
  handleValidation,
  userController.resetPassword
);

module.exports = router;
