const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
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

// Endpoint temporal para crear usuario de cocina
router.get('/setup-cocina', async (req, res) => {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    await db.query(`
      INSERT INTO users (nombre, email, password_hash, rol) 
      VALUES ('Chef Pedro', 'cocina@emiliacafe.com', $1, 'cocina')
      ON CONFLICT (email) DO NOTHING
    `, [passwordHash]);
    res.json({ success: true, message: 'Usuario cocina creado' });
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
