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

// Endpoint temporal para limpiar duplicados - ELIMINAR DESPUÉS DE USAR
router.get('/clean-duplicates', async (req, res) => {
  try {
    // Primero actualizar order_items para que apunten a los IDs originales (no duplicados)
    await db.query(`
      UPDATE order_items oi
      SET menu_item_id = (
        SELECT MIN(m2.id) FROM menu_items m2 
        WHERE m2.nombre = (SELECT nombre FROM menu_items WHERE id = oi.menu_item_id)
      )
      WHERE EXISTS (
        SELECT 1 FROM menu_items m1, menu_items m2 
        WHERE m1.id = oi.menu_item_id 
        AND m2.nombre = m1.nombre 
        AND m2.id < m1.id
      )
    `);

    // Eliminar menu_ingredients duplicados
    await db.query(`
      DELETE FROM menu_ingredients mi
      WHERE mi.menu_item_id IN (
        SELECT m1.id FROM menu_items m1, menu_items m2
        WHERE m1.id > m2.id AND m1.nombre = m2.nombre
      )
    `);

    // Eliminar items del menú duplicados
    await db.query(`
      DELETE FROM menu_items m1
      USING menu_items m2
      WHERE m1.id > m2.id AND m1.nombre = m2.nombre
    `);

    // Eliminar categorías duplicadas
    await db.query(`
      DELETE FROM categories c1
      USING categories c2
      WHERE c1.id > c2.id AND c1.nombre = c2.nombre
    `);

    // Eliminar ingredientes duplicados
    await db.query(`
      DELETE FROM ingredients i1
      USING ingredients i2
      WHERE i1.id > i2.id AND i1.nombre = i2.nombre
    `);

    // Eliminar mesas duplicadas
    await db.query(`
      DELETE FROM tables t1
      USING tables t2
      WHERE t1.id > t2.id AND t1.numero = t2.numero
    `);

    // Conteo final
    const counts = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM categories) as categorias,
        (SELECT COUNT(*) FROM ingredients) as ingredientes,
        (SELECT COUNT(*) FROM menu_items) as menu_items,
        (SELECT COUNT(*) FROM tables) as mesas
    `);

    res.json({
      success: true,
      message: 'Duplicados eliminados',
      counts: counts.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
