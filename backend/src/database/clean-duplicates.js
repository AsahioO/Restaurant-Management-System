const db = require('../config/database');

const cleanDuplicates = async () => {
  try {
    console.log('🧹 Limpiando datos duplicados...');

    // Eliminar categorías duplicadas (mantener solo la primera de cada nombre)
    await db.query(`
      DELETE FROM categories c1
      USING categories c2
      WHERE c1.id > c2.id AND c1.nombre = c2.nombre
    `);
    console.log('✅ Categorías duplicadas eliminadas');

    // Eliminar ingredientes duplicados (mantener solo el primero de cada nombre)
    await db.query(`
      DELETE FROM ingredients i1
      USING ingredients i2
      WHERE i1.id > i2.id AND i1.nombre = i2.nombre
    `);
    console.log('✅ Ingredientes duplicados eliminados');

    // Eliminar items del menú duplicados (mantener solo el primero de cada nombre)
    await db.query(`
      DELETE FROM menu_items m1
      USING menu_items m2
      WHERE m1.id > m2.id AND m1.nombre = m2.nombre
    `);
    console.log('✅ Items del menú duplicados eliminados');

    // Eliminar mesas duplicadas (mantener solo la primera de cada número)
    await db.query(`
      DELETE FROM tables t1
      USING tables t2
      WHERE t1.id > t2.id AND t1.numero = t2.numero
    `);
    console.log('✅ Mesas duplicadas eliminadas');

    // Mostrar conteo final
    const counts = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM categories) as categorias,
        (SELECT COUNT(*) FROM ingredients) as ingredientes,
        (SELECT COUNT(*) FROM menu_items) as menu_items,
        (SELECT COUNT(*) FROM tables) as mesas
    `);
    
    console.log('\n📊 Conteo final:');
    console.log(`   Categorías: ${counts.rows[0].categorias}`);
    console.log(`   Ingredientes: ${counts.rows[0].ingredientes}`);
    console.log(`   Items del menú: ${counts.rows[0].menu_items}`);
    console.log(`   Mesas: ${counts.rows[0].mesas}`);

    console.log('\n✅ Limpieza completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  }
};

cleanDuplicates();
