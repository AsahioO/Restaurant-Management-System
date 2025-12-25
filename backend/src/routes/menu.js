const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { gerenteOnly, anyRole } = require('../middleware/authorize');
const { handleValidation } = require('../middleware/validation');

// Obtener menú (público o autenticado)
router.get('/', optionalAuth, menuController.getMenu);

// Obtener categorías
router.get('/categories', menuController.getCategories);

// Obtener ítem por ID
router.get('/:id',
  [param('id').isInt().withMessage('ID inválido')],
  handleValidation,
  optionalAuth,
  menuController.getMenuItem
);

// --- Rutas protegidas (solo gerente) ---

// Crear ítem de menú
router.post('/',
  authenticate,
  gerenteOnly,
  [
    body('nombre').notEmpty().withMessage('Nombre requerido'),
    body('precio').isFloat({ min: 0 }).withMessage('Precio debe ser un número positivo'),
  ],
  handleValidation,
  menuController.createMenuItem
);

// Actualizar ítem de menú
router.put('/:id',
  authenticate,
  gerenteOnly,
  [param('id').isInt().withMessage('ID inválido')],
  handleValidation,
  menuController.updateMenuItem
);

// Eliminar ítem de menú
router.delete('/:id',
  authenticate,
  gerenteOnly,
  [param('id').isInt().withMessage('ID inválido')],
  handleValidation,
  menuController.deleteMenuItem
);

// --- Categorías ---

// Crear categoría
router.post('/categories',
  authenticate,
  gerenteOnly,
  [body('nombre').notEmpty().withMessage('Nombre requerido')],
  handleValidation,
  menuController.createCategory
);

// Actualizar categoría
router.put('/categories/:id',
  authenticate,
  gerenteOnly,
  [param('id').isInt().withMessage('ID inválido')],
  handleValidation,
  menuController.updateCategory
);

module.exports = router;
