const db = require('../config/database');
const { successResponse, errorResponse, paginate, calculateItemAvailability } = require('../utils/helpers');
const { logAuditAction } = require('../utils/permissions');
const logger = require('../utils/logger');

// Obtener menú completo con disponibilidad calculada
const getMenu = async (req, res) => {
  try {
    const { categoria_id, disponible, destacado, search, includeInactive } = req.query;
    const isGerente = req.user?.rol === 'gerente';

    // Obtener ingredientes para calcular disponibilidad
    const ingredientsResult = await db.query(
      'SELECT id, nombre, unidad, stock_actual FROM ingredients WHERE activo = true'
    );
    const ingredients = ingredientsResult.rows;

    // Construir query
    let query = `
      SELECT 
        mi.id, mi.nombre, mi.descripcion, mi.precio, mi.imagen_url,
        mi.tiempo_preparacion, mi.disponible, mi.destacado, mi.activo,
        mi.categoria_id, c.nombre as categoria_nombre, c.icono as categoria_icono,
        COALESCE(
          json_agg(
            json_build_object(
              'ingredient_id', ming.ingredient_id,
              'cantidad_por_porcion', ming.cantidad_por_porcion,
              'es_opcional', ming.es_opcional,
              'nombre', ing.nombre,
              'unidad', ing.unidad
            )
          ) FILTER (WHERE ming.id IS NOT NULL),
          '[]'
        ) as ingredientes_required
      FROM menu_items mi
      LEFT JOIN categories c ON c.id = mi.categoria_id
      LEFT JOIN menu_ingredients ming ON ming.menu_item_id = mi.id
      LEFT JOIN ingredients ing ON ing.id = ming.ingredient_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Filtrar activos a menos que sea gerente y solicite inactivos
    if (!isGerente || includeInactive !== 'true') {
      query += ` AND mi.activo = true`;
    }

    if (categoria_id) {
      paramCount++;
      query += ` AND mi.categoria_id = $${paramCount}`;
      params.push(categoria_id);
    }

    if (destacado === 'true') {
      query += ` AND mi.destacado = true`;
    }

    if (search) {
      paramCount++;
      query += ` AND (mi.nombre ILIKE $${paramCount} OR mi.descripcion ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY mi.id, c.id ORDER BY c.orden, mi.nombre`;

    const result = await db.query(query, params);

    // Calcular disponibilidad real basada en stock
    const menuItems = result.rows.map(item => {
      const availability = calculateItemAvailability(item, ingredients);
      
      return {
        ...item,
        disponible_real: availability.available,
        max_porciones: availability.maxPortions,
        ingredientes_faltantes: availability.missingIngredients,
        // Para meseros, solo mostrar si está disponible
        mostrar_razon: isGerente,
      };
    });

    // Filtrar por disponibilidad si se solicita
    let filteredItems = menuItems;
    if (disponible === 'true') {
      filteredItems = menuItems.filter(item => item.disponible_real);
    } else if (disponible === 'false') {
      filteredItems = menuItems.filter(item => !item.disponible_real);
    }

    // Agrupar por categoría
    const menuByCategory = {};
    filteredItems.forEach(item => {
      const catKey = item.categoria_id || 'sin_categoria';
      if (!menuByCategory[catKey]) {
        menuByCategory[catKey] = {
          id: item.categoria_id,
          nombre: item.categoria_nombre || 'Sin categoría',
          icono: item.categoria_icono,
          items: [],
        };
      }
      menuByCategory[catKey].items.push(item);
    });

    return successResponse(res, {
      items: filteredItems,
      byCategory: Object.values(menuByCategory),
      totalItems: filteredItems.length,
      disponibles: filteredItems.filter(i => i.disponible_real).length,
      noDisponibles: filteredItems.filter(i => !i.disponible_real).length,
    });
  } catch (error) {
    logger.error('Error al obtener menú:', error);
    return errorResponse(res, 'Error al obtener menú', 500);
  }
};

// Obtener ítem por ID
const getMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        mi.*, c.nombre as categoria_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'ingredient_id', ming.ingredient_id,
              'cantidad_por_porcion', ming.cantidad_por_porcion,
              'es_opcional', ming.es_opcional,
              'nombre', ing.nombre,
              'unidad', ing.unidad,
              'stock_actual', ing.stock_actual
            )
          ) FILTER (WHERE ming.id IS NOT NULL),
          '[]'
        ) as ingredientes_required
      FROM menu_items mi
      LEFT JOIN categories c ON c.id = mi.categoria_id
      LEFT JOIN menu_ingredients ming ON ming.menu_item_id = mi.id
      LEFT JOIN ingredients ing ON ing.id = ming.ingredient_id
      WHERE mi.id = $1
      GROUP BY mi.id, c.id
    `, [id]);

    if (result.rows.length === 0) {
      return errorResponse(res, 'Ítem no encontrado', 404);
    }

    const item = result.rows[0];
    
    // Obtener ingredientes para calcular disponibilidad
    const ingredientsResult = await db.query(
      'SELECT id, nombre, unidad, stock_actual FROM ingredients WHERE activo = true'
    );
    const availability = calculateItemAvailability(item, ingredientsResult.rows);

    return successResponse(res, {
      ...item,
      disponible_real: availability.available,
      max_porciones: availability.maxPortions,
      ingredientes_faltantes: availability.missingIngredients,
    });
  } catch (error) {
    logger.error('Error al obtener ítem:', error);
    return errorResponse(res, 'Error al obtener ítem', 500);
  }
};

// Crear ítem de menú
const createMenuItem = async (req, res) => {
  try {
    const { 
      nombre, descripcion, categoria_id, precio, imagen_url,
      tiempo_preparacion, destacado, ingredientes 
    } = req.body;

    const result = await db.withTransaction(async (client) => {
      // Crear ítem
      const itemResult = await client.query(`
        INSERT INTO menu_items (nombre, descripcion, categoria_id, precio, imagen_url, tiempo_preparacion, destacado)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [nombre, descripcion, categoria_id, precio, imagen_url, tiempo_preparacion || 10, destacado || false]);

      const newItem = itemResult.rows[0];

      // Agregar ingredientes si se proporcionan
      if (ingredientes && ingredientes.length > 0) {
        for (const ing of ingredientes) {
          await client.query(`
            INSERT INTO menu_ingredients (menu_item_id, ingredient_id, cantidad_por_porcion, es_opcional)
            VALUES ($1, $2, $3, $4)
          `, [newItem.id, ing.ingredient_id, ing.cantidad_por_porcion, ing.es_opcional || false]);
        }
      }

      return newItem;
    });

    // Log de auditoría
    await logAuditAction(req.user.id, 'create', 'menu_items', result.id, {
      nombre,
      precio,
      ipAddress: req.ip,
    });

    // Emitir evento de actualización de menú
    req.io?.emit('menu:update', { action: 'create', itemId: result.id });

    return successResponse(res, result, 'Ítem de menú creado', 201);
  } catch (error) {
    logger.error('Error al crear ítem de menú:', error);
    return errorResponse(res, 'Error al crear ítem de menú', 500);
  }
};

// Actualizar ítem de menú
const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, descripcion, categoria_id, precio, imagen_url,
      tiempo_preparacion, disponible, destacado, activo, ingredientes 
    } = req.body;

    // Verificar que existe
    const existing = await db.query('SELECT * FROM menu_items WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return errorResponse(res, 'Ítem no encontrado', 404);
    }

    const result = await db.withTransaction(async (client) => {
      // Actualizar ítem
      const itemResult = await client.query(`
        UPDATE menu_items SET
          nombre = COALESCE($1, nombre),
          descripcion = COALESCE($2, descripcion),
          categoria_id = COALESCE($3, categoria_id),
          precio = COALESCE($4, precio),
          imagen_url = COALESCE($5, imagen_url),
          tiempo_preparacion = COALESCE($6, tiempo_preparacion),
          disponible = COALESCE($7, disponible),
          destacado = COALESCE($8, destacado),
          activo = COALESCE($9, activo),
          updated_at = NOW()
        WHERE id = $10
        RETURNING *
      `, [nombre, descripcion, categoria_id, precio, imagen_url, tiempo_preparacion, disponible, destacado, activo, id]);

      // Actualizar ingredientes si se proporcionan
      if (ingredientes !== undefined) {
        // Eliminar ingredientes actuales
        await client.query('DELETE FROM menu_ingredients WHERE menu_item_id = $1', [id]);
        
        // Agregar nuevos ingredientes
        if (ingredientes && ingredientes.length > 0) {
          for (const ing of ingredientes) {
            await client.query(`
              INSERT INTO menu_ingredients (menu_item_id, ingredient_id, cantidad_por_porcion, es_opcional)
              VALUES ($1, $2, $3, $4)
            `, [id, ing.ingredient_id, ing.cantidad_por_porcion, ing.es_opcional || false]);
          }
        }
      }

      return itemResult.rows[0];
    });

    // Log de auditoría
    await logAuditAction(req.user.id, 'update', 'menu_items', parseInt(id), {
      changes: req.body,
      ipAddress: req.ip,
    });

    // Emitir evento de actualización de menú
    req.io?.emit('menu:update', { action: 'update', itemId: parseInt(id) });

    return successResponse(res, result, 'Ítem actualizado');
  } catch (error) {
    logger.error('Error al actualizar ítem:', error);
    return errorResponse(res, 'Error al actualizar ítem', 500);
  }
};

// Eliminar ítem de menú
const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT nombre FROM menu_items WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return errorResponse(res, 'Ítem no encontrado', 404);
    }

    await db.query('DELETE FROM menu_items WHERE id = $1', [id]);

    // Log de auditoría
    await logAuditAction(req.user.id, 'delete', 'menu_items', parseInt(id), {
      nombre: existing.rows[0].nombre,
      ipAddress: req.ip,
    });

    // Emitir evento de actualización de menú
    req.io?.emit('menu:update', { action: 'delete', itemId: parseInt(id) });

    return successResponse(res, null, 'Ítem eliminado');
  } catch (error) {
    logger.error('Error al eliminar ítem:', error);
    return errorResponse(res, 'Error al eliminar ítem', 500);
  }
};

// Obtener categorías
const getCategories = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, COUNT(mi.id) as total_items
      FROM categories c
      LEFT JOIN menu_items mi ON mi.categoria_id = c.id AND mi.activo = true
      WHERE c.activa = true
      GROUP BY c.id
      ORDER BY c.orden, c.nombre
    `);

    return successResponse(res, result.rows);
  } catch (error) {
    logger.error('Error al obtener categorías:', error);
    return errorResponse(res, 'Error al obtener categorías', 500);
  }
};

// Crear categoría
const createCategory = async (req, res) => {
  try {
    const { nombre, descripcion, orden, icono } = req.body;

    const result = await db.query(`
      INSERT INTO categories (nombre, descripcion, orden, icono)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [nombre, descripcion, orden || 0, icono]);

    return successResponse(res, result.rows[0], 'Categoría creada', 201);
  } catch (error) {
    logger.error('Error al crear categoría:', error);
    return errorResponse(res, 'Error al crear categoría', 500);
  }
};

// Actualizar categoría
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, orden, icono, activa } = req.body;

    const result = await db.query(`
      UPDATE categories SET
        nombre = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        orden = COALESCE($3, orden),
        icono = COALESCE($4, icono),
        activa = COALESCE($5, activa),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [nombre, descripcion, orden, icono, activa, id]);

    if (result.rows.length === 0) {
      return errorResponse(res, 'Categoría no encontrada', 404);
    }

    return successResponse(res, result.rows[0], 'Categoría actualizada');
  } catch (error) {
    logger.error('Error al actualizar categoría:', error);
    return errorResponse(res, 'Error al actualizar categoría', 500);
  }
};

module.exports = {
  getMenu,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getCategories,
  createCategory,
  updateCategory,
};
