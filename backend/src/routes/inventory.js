const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');
const { gerenteOnly } = require('../middleware/authorize');
const { handleValidation } = require('../middleware/validation');

// Todas las rutas requieren autenticación y rol gerente
router.use(authenticate);
router.use(gerenteOnly);

// Obtener todos los ingredientes
router.get('/', inventoryController.getIngredients);

// Obtener alertas de stock
router.get('/alerts', inventoryController.getStockAlerts);

// Obtener movimientos de inventario
router.get('/movements', inventoryController.getMovements);

// Obtener ingrediente por ID
router.get('/:id',
  [param('id').isInt().withMessage('ID inválido')],
  handleValidation,
  inventoryController.getIngredient
);

// Crear ingrediente
router.post('/',
  [
    body('nombre').notEmpty().withMessage('Nombre requerido'),
    body('unidad').notEmpty().withMessage('Unidad requerida'),
  ],
  handleValidation,
  inventoryController.createIngredient
);

// Actualizar ingrediente
router.put('/:id',
  [param('id').isInt().withMessage('ID inválido')],
  handleValidation,
  inventoryController.updateIngredient
);

// Ajustar stock
router.post('/:id/adjust',
  [
    param('id').isInt().withMessage('ID inválido'),
    body('tipo').isIn(['entrada', 'salida', 'ajuste', 'merma']).withMessage('Tipo inválido'),
    body('cantidad').isFloat({ min: 0.001 }).withMessage('Cantidad debe ser mayor a 0'),
  ],
  handleValidation,
  inventoryController.adjustStock
);

module.exports = router;
