/**
 * Script para crear índices adicionales en la base de datos
 * Ejecutar: npm run db:indexes
 * 
 * Este script es seguro de ejecutar múltiples veces (usa IF NOT EXISTS)
 */

const db = require('../config/database');

const createIndexes = async () => {
  const indexes = [
    // Índices para órdenes - optimizar búsquedas frecuentes
    { name: 'idx_orders_estado', sql: 'CREATE INDEX IF NOT EXISTS idx_orders_estado ON orders(estado)' },
    { name: 'idx_orders_created_desc', sql: 'CREATE INDEX IF NOT EXISTS idx_orders_created_desc ON orders(created_at DESC)' },
    { name: 'idx_orders_mesero', sql: 'CREATE INDEX IF NOT EXISTS idx_orders_mesero ON orders(mesero_id)' },
    { name: 'idx_orders_mesa', sql: 'CREATE INDEX IF NOT EXISTS idx_orders_mesa ON orders(mesa_id)' },
    
    // Índices para items de orden
    { name: 'idx_order_items_order', sql: 'CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)' },
    { name: 'idx_order_items_menu_item', sql: 'CREATE INDEX IF NOT EXISTS idx_order_items_menu_item ON order_items(menu_item_id)' },
    
    // Índices para menú
    { name: 'idx_menu_items_categoria', sql: 'CREATE INDEX IF NOT EXISTS idx_menu_items_categoria ON menu_items(categoria_id)' },
    { name: 'idx_menu_items_disponible', sql: 'CREATE INDEX IF NOT EXISTS idx_menu_items_disponible ON menu_items(disponible)' },
    
    // Índices para inventario
    { name: 'idx_ingredients_stock', sql: 'CREATE INDEX IF NOT EXISTS idx_ingredients_stock ON ingredients(stock_actual, stock_minimo)' },
    { name: 'idx_ingredients_activo', sql: 'CREATE INDEX IF NOT EXISTS idx_ingredients_activo ON ingredients(activo)' },
    { name: 'idx_inventory_movements_ingredient', sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_movements_ingredient ON inventory_movements(ingredient_id)' },
    { name: 'idx_inventory_movements_created', sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at)' },
    
    // Índices para alertas
    { name: 'idx_alerts_tipo', sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_tipo ON alerts(tipo)' },
    { name: 'idx_alerts_leida', sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_leida ON alerts(leida)' },
    { name: 'idx_alerts_resuelta', sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_resuelta ON alerts(resuelta)' },
    
    // Índices para auditoría
    { name: 'idx_audit_logs_user', sql: 'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)' },
    { name: 'idx_audit_logs_created', sql: 'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)' },
    { name: 'idx_audit_logs_action', sql: 'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)' },
    
    // Índices para usuarios
    { name: 'idx_users_email', sql: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)' },
    { name: 'idx_users_rol', sql: 'CREATE INDEX IF NOT EXISTS idx_users_rol ON users(rol)' },
    { name: 'idx_users_activo', sql: 'CREATE INDEX IF NOT EXISTS idx_users_activo ON users(activo)' },
    
    // Índices para tokens y suscripciones
    { name: 'idx_refresh_tokens_user', sql: 'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)' },
    { name: 'idx_refresh_tokens_expires', sql: 'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at)' },
    { name: 'idx_push_subscriptions_user', sql: 'CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)' },
  ];
  
  console.log('🚀 Creando índices de base de datos...\n');
  
  let created = 0;
  let errors = 0;
  
  for (const index of indexes) {
    try {
      await db.query(index.sql);
      console.log(`✅ ${index.name}`);
      created++;
    } catch (error) {
      console.error(`❌ ${index.name}: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\n📊 Resumen: ${created} creados, ${errors} errores`);
  
  // Mostrar estadísticas de índices
  try {
    const result = await db.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(quote_ident(indexname)::text)) as size
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    console.log('\n📋 Índices actuales en la base de datos:');
    console.log('─'.repeat(70));
    
    let currentTable = '';
    for (const row of result.rows) {
      if (row.tablename !== currentTable) {
        currentTable = row.tablename;
        console.log(`\n📁 ${currentTable}:`);
      }
      console.log(`   └─ ${row.indexname} (${row.size || 'N/A'})`);
    }
  } catch (error) {
    console.log('\n⚠️ No se pudo obtener lista de índices:', error.message);
  }
  
  process.exit(errors > 0 ? 1 : 0);
};

createIndexes().catch(error => {
  console.error('❌ Error crítico:', error);
  process.exit(1);
});
