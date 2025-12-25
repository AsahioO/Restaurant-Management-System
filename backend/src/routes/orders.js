const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { anyRole, gerenteOnly } = require('../middleware/authorize');
const { handleValidation } = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener mesas
router.get('/tables', orderController.getTables);

// Actualizar estado de mesa
router.patch('/tables/:id',
  [
    param('id').isInt().withMessage('ID inválido'),
    body('estado').isIn(['disponible', 'ocupada', 'reservada', 'mantenimiento']).withMessage('Estado inválido'),
  ],
  handleValidation,
  orderController.updateTableStatus
);

// Obtener órdenes
router.get('/', orderController.getOrders);

// Obtener orden por ID
router.get('/:id',
  [param('id').isInt().withMessage('ID inválido')],
  handleValidation,
  orderController.getOrder
);

// Crear orden
router.post('/',
  [
    body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un ítem'),
    body('items.*.menu_item_id').isInt().withMessage('ID de ítem inválido'),
    body('items.*.cantidad').isInt({ min: 1 }).withMessage('Cantidad debe ser al menos 1'),
  ],
  handleValidation,
  orderController.createOrder
);

// Actualizar estado de orden
router.patch('/:id/status',
  [
    param('id').isInt().withMessage('ID inválido'),
    body('estado').isIn(['pendiente', 'confirmada', 'en_preparacion', 'lista', 'servida', 'cobrada', 'cancelada'])
      .withMessage('Estado inválido'),
  ],
  handleValidation,
  orderController.updateOrderStatus
);

// Actualizar estado de ítem de orden
router.patch('/:id/items/:itemId/status',
  [
    param('id').isInt().withMessage('ID de orden inválido'),
    param('itemId').isInt().withMessage('ID de ítem inválido'),
    body('estado').isIn(['pendiente', 'preparando', 'listo', 'servido', 'cancelado']).withMessage('Estado inválido'),
  ],
  handleValidation,
  orderController.updateOrderItemStatus
);

module.exports = router;
