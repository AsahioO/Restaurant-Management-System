const express = require('express');
const router = express.Router();
const db = require('../config/database');

const authRoutes = require('./auth');
const userRoutes = require('./users');
const menuRoutes = require('./menu');
const inventoryRoutes = require('./inventory');
const orderRoutes = require('./orders');
const dashboardRoutes = require('./dashboard');

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Emilia Café API',
  });
});

// Debug endpoint para ver ventas por categoría
router.get('/debug-categorias', async (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    
    // Ver todas las órdenes cobradas
    const ordenes = await db.query(`
      SELECT id, codigo, estado, total, created_at 
      FROM orders 
      WHERE estado = 'cobrada'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // Ver ventas por categoría sin filtro de fecha
    const categorias = await db.query(`
      SELECT 
        c.nombre as categoria,
        SUM(oi.cantidad)::integer as cantidad,
        SUM(oi.subtotal)::numeric as ingresos
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      JOIN categories c ON c.id = mi.categoria_id
      WHERE o.estado = 'cobrada'
      GROUP BY c.id, c.nombre
      ORDER BY ingresos DESC
    `);
    
    res.json({
      fecha_hoy: hoy,
      ordenes_cobradas: ordenes.rows,
      ventas_por_categoria: categorias.rows.map(c => ({
        categoria: c.categoria,
        cantidad: parseInt(c.cantidad),
        ingresos: parseFloat(c.ingresos)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas de la API
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/menu', menuRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/orders', orderRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
