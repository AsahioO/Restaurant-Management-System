const db = require('../config/database');

const reset = async () => {
  try {
    console.log('⚠️  Reiniciando base de datos...');
    
    // Eliminar todas las tablas en orden correcto (por dependencias)
    const dropQueries = [
      'DROP TABLE IF EXISTS audit_logs CASCADE',
      'DROP TABLE IF EXISTS alerts CASCADE',
      'DROP TABLE IF EXISTS inventory_movements CASCADE',
      'DROP TABLE IF EXISTS order_items CASCADE',
      'DROP TABLE IF EXISTS orders CASCADE',
      'DROP TABLE IF EXISTS menu_ingredients CASCADE',
      'DROP TABLE IF EXISTS menu_items CASCADE',
      'DROP TABLE IF EXISTS ingredients CASCADE',
      'DROP TABLE IF EXISTS categories CASCADE',
      'DROP TABLE IF EXISTS tables CASCADE',
      'DROP TABLE IF EXISTS refresh_tokens CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
      'DROP TABLE IF EXISTS settings CASCADE',
    ];

    for (const query of dropQueries) {
      await db.query(query);
    }

    console.log('✅ Base de datos reiniciada');
    console.log('💡 Ejecuta npm run db:migrate y npm run db:seed para reconstruir');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al reiniciar:', error);
    process.exit(1);
  }
};

reset();
