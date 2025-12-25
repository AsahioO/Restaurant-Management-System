const db = require('../config/database');

const createTables = async () => {
  const queries = [
    // Tabla de usuarios
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      rol VARCHAR(20) NOT NULL CHECK (rol IN ('gerente', 'empleado')),
      activo BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla de tokens de refresco
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(500) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla de categorías
    `CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      descripcion TEXT,
      orden INTEGER DEFAULT 0,
      activa BOOLEAN DEFAULT true,
      icono VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla de ingredientes
    `CREATE TABLE IF NOT EXISTS ingredients (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      unidad VARCHAR(20) NOT NULL,
      stock_actual DECIMAL(10,3) DEFAULT 0,
      stock_minimo DECIMAL(10,3) DEFAULT 0,
      ubicacion VARCHAR(100),
      lote VARCHAR(50),
      costo_unitario DECIMAL(10,2) DEFAULT 0,
      proveedor VARCHAR(100),
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla de ítems del menú
    `CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      descripcion TEXT,
      categoria_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      precio DECIMAL(10,2) NOT NULL,
      imagen_url VARCHAR(500),
      tiempo_preparacion INTEGER DEFAULT 10,
      disponible BOOLEAN DEFAULT true,
      destacado BOOLEAN DEFAULT false,
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla de relación menú-ingredientes
    `CREATE TABLE IF NOT EXISTS menu_ingredients (
      id SERIAL PRIMARY KEY,
      menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
      ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
      cantidad_por_porcion DECIMAL(10,3) NOT NULL,
      es_opcional BOOLEAN DEFAULT false,
      UNIQUE(menu_item_id, ingredient_id)
    )`,

    // Tabla de mesas
    `CREATE TABLE IF NOT EXISTS tables (
      id SERIAL PRIMARY KEY,
      numero VARCHAR(10) NOT NULL UNIQUE,
      capacidad INTEGER DEFAULT 4,
      ubicacion VARCHAR(50),
      estado VARCHAR(20) DEFAULT 'disponible' CHECK (estado IN ('disponible', 'ocupada', 'reservada', 'mantenimiento')),
      activa BOOLEAN DEFAULT true
    )`,

    // Tabla de órdenes
    `CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      codigo VARCHAR(30) UNIQUE NOT NULL,
      mesa_id INTEGER REFERENCES tables(id),
      mesa_numero VARCHAR(10),
      mesero_id INTEGER REFERENCES users(id),
      estado VARCHAR(30) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'en_preparacion', 'lista', 'servida', 'cobrada', 'cancelada')),
      subtotal DECIMAL(10,2) DEFAULT 0,
      impuestos DECIMAL(10,2) DEFAULT 0,
      descuento DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) DEFAULT 0,
      metodo_pago VARCHAR(30),
      notas TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    )`,

    // Tabla de ítems de orden
    `CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER REFERENCES menu_items(id),
      nombre_item VARCHAR(150) NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1,
      precio_unitario DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      notas TEXT,
      estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'preparando', 'listo', 'servido', 'cancelado')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla de movimientos de inventario
    `CREATE TABLE IF NOT EXISTS inventory_movements (
      id SERIAL PRIMARY KEY,
      ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
      tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'merma')),
      cantidad DECIMAL(10,3) NOT NULL,
      stock_anterior DECIMAL(10,3),
      stock_nuevo DECIMAL(10,3),
      referencia VARCHAR(100),
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id),
      notas TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla de alertas
    `CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('stock_bajo', 'stock_agotado', 'pedido_retrasado', 'menu_no_disponible', 'sistema')),
      prioridad VARCHAR(10) DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
      titulo VARCHAR(200) NOT NULL,
      mensaje TEXT,
      recurso VARCHAR(50),
      recurso_id INTEGER,
      leida BOOLEAN DEFAULT false,
      resuelta BOOLEAN DEFAULT false,
      user_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP
    )`,

    // Tabla de auditoría
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      action VARCHAR(50) NOT NULL,
      resource VARCHAR(50) NOT NULL,
      resource_id INTEGER,
      details JSONB,
      ip_address VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla de configuración
    `CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      clave VARCHAR(100) UNIQUE NOT NULL,
      valor TEXT,
      tipo VARCHAR(20) DEFAULT 'string',
      descripcion TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Índices para mejorar rendimiento
    `CREATE INDEX IF NOT EXISTS idx_orders_estado ON orders(estado)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_mesa ON orders(mesa_id)`,
    `CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_inventory_movements_ingredient ON inventory_movements(ingredient_id)`,
    `CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_menu_items_categoria ON menu_items(categoria_id)`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_tipo ON alerts(tipo)`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_leida ON alerts(leida)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)`,
  ];

  for (const query of queries) {
    await db.query(query);
  }
};

const migrate = async () => {
  try {
    console.log('🚀 Iniciando migración de base de datos...');
    await createTables();
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
};

migrate();
