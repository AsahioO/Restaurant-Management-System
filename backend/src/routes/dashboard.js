const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { gerenteOnly } = require('../middleware/authorize');

// Todas las rutas requieren autenticación y rol gerente
router.use(authenticate);
router.use(gerenteOnly);

// Obtener KPIs
router.get('/kpis', dashboardController.getKPIs);

// Ventas por hora
router.get('/sales/by-hour', dashboardController.getSalesByHour);

// Ventas por día
router.get('/sales/by-day', dashboardController.getSalesByDay);

// Rendimiento de meseros
router.get('/waiters/performance', dashboardController.getWaiterPerformance);

// Tendencias de inventario
router.get('/inventory/trends', dashboardController.getInventoryTrends);

module.exports = router;
