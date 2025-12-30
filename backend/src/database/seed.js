const bcrypt = require('bcryptjs');
const db = require('../config/database');

const seed = async () => {
  try {
    console.log('🌱 Iniciando seed de datos...');

    // Crear usuarios de prueba
    const passwordHash = await bcrypt.hash('password123', 10);
    
    await db.query(`
      INSERT INTO users (nombre, email, password_hash, rol) VALUES
      ('Gerente Admin', 'gerente@emiliacafe.com', $1, 'gerente'),
      ('María García', 'maria@emiliacafe.com', $1, 'empleado'),
      ('Carlos López', 'carlos@emiliacafe.com', $1, 'empleado'),
      ('Ana Martínez', 'ana@emiliacafe.com', $1, 'empleado'),
      ('Chef Pedro', 'cocina@emiliacafe.com', $1, 'cocina')
      ON CONFLICT (email) DO NOTHING
    `, [passwordHash]);
    console.log('✅ Usuarios creados');

    // Crear categorías
    await db.query(`
      INSERT INTO categories (nombre, descripcion, orden, icono) VALUES
      ('Bebidas Calientes', 'Café, té y bebidas calientes', 1, '☕'),
      ('Bebidas Frías', 'Frappés, smoothies y bebidas frías', 2, '🧊'),
      ('Desayunos', 'Platillos de desayuno', 3, '🍳'),
      ('Panadería', 'Pan, pasteles y repostería', 4, '🥐'),
      ('Postres', 'Postres y dulces', 5, '🍰'),
      ('Snacks', 'Botanas y snacks ligeros', 6, '🥪')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Categorías creadas');

    // Crear ingredientes
    await db.query(`
      INSERT INTO ingredients (nombre, unidad, stock_actual, stock_minimo, ubicacion, costo_unitario) VALUES
      ('Café molido', 'kg', 10.5, 2, 'Almacén principal', 250.00),
      ('Leche entera', 'lt', 25, 10, 'Refrigerador', 28.00),
      ('Leche deslactosada', 'lt', 15, 5, 'Refrigerador', 32.00),
      ('Leche de almendras', 'lt', 8, 3, 'Refrigerador', 65.00),
      ('Crema batida', 'lt', 5, 2, 'Refrigerador', 85.00),
      ('Chocolate en polvo', 'kg', 3, 1, 'Almacén principal', 180.00),
      ('Azúcar', 'kg', 15, 5, 'Almacén principal', 25.00),
      ('Vainilla', 'lt', 2, 0.5, 'Almacén principal', 120.00),
      ('Canela', 'kg', 0.5, 0.2, 'Almacén principal', 350.00),
      ('Huevos', 'pz', 120, 30, 'Refrigerador', 4.50),
      ('Harina', 'kg', 20, 5, 'Almacén principal', 18.00),
      ('Mantequilla', 'kg', 5, 2, 'Refrigerador', 180.00),
      ('Pan brioche', 'pz', 30, 10, 'Panadería', 12.00),
      ('Tocino', 'kg', 3, 1, 'Refrigerador', 220.00),
      ('Queso manchego', 'kg', 2, 0.5, 'Refrigerador', 280.00),
      ('Jamón', 'kg', 2, 0.5, 'Refrigerador', 150.00),
      ('Aguacate', 'pz', 20, 5, 'Refrigerador', 35.00),
      ('Fresas', 'kg', 3, 1, 'Refrigerador', 95.00),
      ('Plátano', 'kg', 5, 2, 'Mostrador', 25.00),
      ('Helado vainilla', 'lt', 4, 1, 'Congelador', 120.00),
      ('Jarabe de maple', 'lt', 2, 0.5, 'Almacén principal', 250.00),
      ('Té verde', 'kg', 0.5, 0.2, 'Almacén principal', 400.00),
      ('Miel', 'lt', 1, 0.3, 'Almacén principal', 180.00),
      ('Limón', 'kg', 3, 1, 'Refrigerador', 30.00),
      ('Hielo', 'kg', 50, 20, 'Congelador', 8.00)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Ingredientes creados');

    // Crear ítems de menú
    await db.query(`
      INSERT INTO menu_items (nombre, descripcion, categoria_id, precio, tiempo_preparacion, destacado) VALUES
      ('Americano', 'Café espresso con agua caliente', 1, 45.00, 5, false),
      ('Cappuccino', 'Espresso con leche espumada y espuma', 1, 55.00, 7, true),
      ('Latte', 'Espresso con leche vaporizada', 1, 58.00, 7, true),
      ('Mocha', 'Espresso con chocolate y leche', 1, 65.00, 8, false),
      ('Té Verde', 'Té verde orgánico', 1, 40.00, 5, false),
      ('Chocolate Caliente', 'Chocolate con leche y crema batida', 1, 55.00, 6, false),
      ('Frappé Mocha', 'Café helado con chocolate y crema', 2, 75.00, 8, true),
      ('Frappé Caramelo', 'Café helado con caramelo y crema', 2, 75.00, 8, false),
      ('Smoothie de Fresa', 'Fresas frescas con leche y hielo', 2, 70.00, 6, false),
      ('Limonada', 'Limonada natural con menta', 2, 45.00, 5, false),
      ('Huevos Benedictinos', 'Huevos pochados sobre pan con salsa holandesa', 3, 120.00, 15, true),
      ('Hot Cakes', 'Stack de hot cakes con maple y mantequilla', 3, 85.00, 12, true),
      ('Omelette de Queso', 'Omelette relleno de queso manchego', 3, 95.00, 12, false),
      ('Tostada de Aguacate', 'Pan artesanal con aguacate y huevo', 3, 110.00, 10, true),
      ('Bagel con Salmón', 'Bagel con queso crema y salmón ahumado', 3, 135.00, 8, false),
      ('Croissant', 'Croissant de mantequilla artesanal', 4, 45.00, 0, false),
      ('Pan de Chocolate', 'Pan dulce relleno de chocolate', 4, 40.00, 0, false),
      ('Muffin de Arándano', 'Muffin casero con arándanos', 4, 50.00, 0, false),
      ('Cheesecake', 'Cheesecake New York con frutos rojos', 5, 85.00, 0, true),
      ('Brownie', 'Brownie de chocolate con nueces', 5, 65.00, 0, false),
      ('Tiramisú', 'Tiramisú italiano tradicional', 5, 90.00, 0, false),
      ('Sandwich Club', 'Triple sándwich de jamón, queso y tocino', 6, 95.00, 10, false),
      ('Wrap de Pollo', 'Wrap con pollo, vegetales y aderezo', 6, 105.00, 10, false)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Ítems de menú creados');

    // Crear relaciones menú-ingredientes
    const menuIngredients = [
      // Americano
      { menu: 'Americano', ingredients: [{ name: 'Café molido', qty: 0.018 }] },
      // Cappuccino
      { menu: 'Cappuccino', ingredients: [{ name: 'Café molido', qty: 0.018 }, { name: 'Leche entera', qty: 0.15 }] },
      // Latte
      { menu: 'Latte', ingredients: [{ name: 'Café molido', qty: 0.018 }, { name: 'Leche entera', qty: 0.25 }] },
      // Mocha
      { menu: 'Mocha', ingredients: [{ name: 'Café molido', qty: 0.018 }, { name: 'Leche entera', qty: 0.2 }, { name: 'Chocolate en polvo', qty: 0.02 }] },
      // Chocolate Caliente
      { menu: 'Chocolate Caliente', ingredients: [{ name: 'Leche entera', qty: 0.3 }, { name: 'Chocolate en polvo', qty: 0.04 }, { name: 'Crema batida', qty: 0.03 }] },
      // Frappé Mocha
      { menu: 'Frappé Mocha', ingredients: [{ name: 'Café molido', qty: 0.02 }, { name: 'Leche entera', qty: 0.2 }, { name: 'Chocolate en polvo', qty: 0.02 }, { name: 'Hielo', qty: 0.15 }, { name: 'Crema batida', qty: 0.03 }] },
      // Smoothie de Fresa
      { menu: 'Smoothie de Fresa', ingredients: [{ name: 'Fresas', qty: 0.15 }, { name: 'Leche entera', qty: 0.2 }, { name: 'Hielo', qty: 0.1 }] },
      // Hot Cakes
      { menu: 'Hot Cakes', ingredients: [{ name: 'Harina', qty: 0.1 }, { name: 'Huevos', qty: 2 }, { name: 'Leche entera', qty: 0.1 }, { name: 'Mantequilla', qty: 0.02 }, { name: 'Jarabe de maple', qty: 0.03 }] },
      // Omelette
      { menu: 'Omelette de Queso', ingredients: [{ name: 'Huevos', qty: 3 }, { name: 'Queso manchego', qty: 0.05 }, { name: 'Mantequilla', qty: 0.01 }] },
      // Tostada de Aguacate
      { menu: 'Tostada de Aguacate', ingredients: [{ name: 'Pan brioche', qty: 2 }, { name: 'Aguacate', qty: 1 }, { name: 'Huevos', qty: 1 }] },
    ];

    for (const item of menuIngredients) {
      const menuResult = await db.query('SELECT id FROM menu_items WHERE nombre = $1', [item.menu]);
      if (menuResult.rows.length > 0) {
        const menuId = menuResult.rows[0].id;
        for (const ing of item.ingredients) {
          const ingResult = await db.query('SELECT id FROM ingredients WHERE nombre = $1', [ing.name]);
          if (ingResult.rows.length > 0) {
            await db.query(
              'INSERT INTO menu_ingredients (menu_item_id, ingredient_id, cantidad_por_porcion) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
              [menuId, ingResult.rows[0].id, ing.qty]
            );
          }
        }
      }
    }
    console.log('✅ Relaciones menú-ingredientes creadas');

    // Crear mesas
    await db.query(`
      INSERT INTO tables (numero, capacidad, ubicacion, estado) VALUES
      ('1', 2, 'Interior', 'disponible'),
      ('2', 2, 'Interior', 'disponible'),
      ('3', 4, 'Interior', 'disponible'),
      ('4', 4, 'Interior', 'disponible'),
      ('5', 6, 'Interior', 'disponible'),
      ('6', 4, 'Terraza', 'disponible'),
      ('7', 4, 'Terraza', 'disponible'),
      ('8', 6, 'Terraza', 'disponible'),
      ('B1', 2, 'Barra', 'disponible'),
      ('B2', 2, 'Barra', 'disponible')
      ON CONFLICT (numero) DO NOTHING
    `);
    console.log('✅ Mesas creadas');

    // Crear configuraciones iniciales
    await db.query(`
      INSERT INTO settings (clave, valor, tipo, descripcion) VALUES
      ('nombre_negocio', 'Emilia Café', 'string', 'Nombre del establecimiento'),
      ('direccion', 'Av. Principal 123, Col. Centro', 'string', 'Dirección del local'),
      ('telefono', '555-123-4567', 'string', 'Teléfono de contacto'),
      ('iva_porcentaje', '16', 'number', 'Porcentaje de IVA'),
      ('propina_sugerida', '15', 'number', 'Porcentaje de propina sugerida'),
      ('hora_apertura', '07:00', 'string', 'Hora de apertura'),
      ('hora_cierre', '22:00', 'string', 'Hora de cierre'),
      ('moneda', 'MXN', 'string', 'Moneda del sistema'),
      ('alerta_stock_minimo', 'true', 'boolean', 'Enviar alertas de stock mínimo')
      ON CONFLICT (clave) DO NOTHING
    `);
    console.log('✅ Configuraciones creadas');

    console.log('\n🎉 Seed completado exitosamente');
    console.log('\n📋 Credenciales de prueba:');
    console.log('   Gerente: gerente@emiliacafe.com / password123');
    console.log('   Empleado: maria@emiliacafe.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
};

seed();
