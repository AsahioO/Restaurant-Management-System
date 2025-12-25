const db = require('../config/database');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');
const { logAuditAction } = require('../utils/permissions');
const logger = require('../utils/logger');

// Obtener todos los ingredientes
const getIngredients = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, low_stock, activo } = req.query;
    const { offset } = paginate(page, limit);

    let query = `SELECT * FROM ingredients WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (activo !== 'false') {
      query += ` AND activo = true`;
    }

    if (search) {
      paramCount++;
      query += ` AND (nombre ILIKE $${paramCount} OR ubicacion ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (low_stock === 'true') {
      query += ` AND stock_actual <= stock_minimo`;
    }

    // Contar total
    const countResult = await db.query(
      `SELECT COUNT(*) FROM ingredients WHERE 1=1 ${query.split('WHERE 1=1')[1]?.split('ORDER')[0] || ''}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Obtener ingredientes
    query += ` ORDER BY nombre LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Agregar alertas de stock bajo
    const ingredients = result.rows.map(ing => ({
      ...ing,
      alerta_stock_bajo: ing.stock_actual <= ing.stock_minimo,
      alerta_agotado: ing.stock_actual <= 0,
    }));

    return successResponse(res, {
      ingredients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      resumen: {
        total: ingredients.length,
        stockBajo: ingredients.filter(i => i.alerta_stock_bajo).length,
        agotados: ingredients.filter(i => i.alerta_agotado).length,
      },
    });
  } catch (error) {
    logger.error('Error al obtener ingredientes:', error);
    return errorResponse(res, 'Error al obtener ingredientes', 500);
  }
};

// Obtener ingrediente por ID
const getIngredient = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM ingredients WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return errorResponse(res, 'Ingrediente no encontrado', 404);
    }

    // Obtener ítems de menú que usan este ingrediente
    const menuItems = await db.query(`
      SELECT mi.id, mi.nombre, ming.cantidad_por_porcion
      FROM menu_items mi
      JOIN menu_ingredients ming ON ming.menu_item_id = mi.id
      WHERE ming.ingredient_id = $1 AND mi.activo = true
    `, [id]);

    // Obtener últimos movimientos
    const movements = await db.query(`
      SELECT im.*, u.nombre as usuario_nombre
      FROM inventory_movements im
      LEFT JOIN users u ON u.id = im.user_id
      WHERE im.ingredient_id = $1
      ORDER BY im.created_at DESC
      LIMIT 20
    `, [id]);

    return successResponse(res, {
      ...result.rows[0],
      alerta_stock_bajo: result.rows[0].stock_actual <= result.rows[0].stock_minimo,
      menu_items: menuItems.rows,
      ultimos_movimientos: movements.rows,
    });
  } catch (error) {
    logger.error('Error al obtener ingrediente:', error);
    return errorResponse(res, 'Error al obtener ingrediente', 500);
  }
};

// Crear ingrediente
const createIngredient = async (req, res) => {
  try {
    const { 
      nombre, unidad, stock_actual, stock_minimo, 
      ubicacion, lote, costo_unitario, proveedor 
    } = req.body;

    const result = await db.query(`
      INSERT INTO ingredients (nombre, unidad, stock_actual, stock_minimo, ubicacion, lote, costo_unitario, proveedor)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [nombre, unidad, stock_actual || 0, stock_minimo || 0, ubicacion, lote, costo_unitario || 0, proveedor]);

    const newIngredient = result.rows[0];

    // Registrar movimiento inicial si hay stock
    if (stock_actual > 0) {
      await db.query(`
        INSERT INTO inventory_movements (ingredient_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, user_id)
        VALUES ($1, 'entrada', $2, 0, $2, 'Stock inicial', $3)
      `, [newIngredient.id, stock_actual, req.user.id]);
    }

    // Log de auditoría
    await logAuditAction(req.user.id, 'create', 'ingredients', newIngredient.id, {
      nombre,
      stock_inicial: stock_actual,
      ipAddress: req.ip,
    });

    // Emitir evento
    req.io?.emit('inventory:update', { action: 'create', ingredientId: newIngredient.id });

    return successResponse(res, newIngredient, 'Ingrediente creado', 201);
  } catch (error) {
    logger.error('Error al crear ingrediente:', error);
    return errorResponse(res, 'Error al crear ingrediente', 500);
  }
};

// Actualizar ingrediente
const updateIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, unidad, stock_minimo, ubicacion, 
      lote, costo_unitario, proveedor, activo 
    } = req.body;

    const existing = await db.query('SELECT * FROM ingredients WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return errorResponse(res, 'Ingrediente no encontrado', 404);
    }

    const result = await db.query(`
      UPDATE ingredients SET
        nombre = COALESCE($1, nombre),
        unidad = COALESCE($2, unidad),
        stock_minimo = COALESCE($3, stock_minimo),
        ubicacion = COALESCE($4, ubicacion),
        lote = COALESCE($5, lote),
        costo_unitario = COALESCE($6, costo_unitario),
        proveedor = COALESCE($7, proveedor),
        activo = COALESCE($8, activo),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [nombre, unidad, stock_minimo, ubicacion, lote, costo_unitario, proveedor, activo, id]);

    // Log de auditoría
    await logAuditAction(req.user.id, 'update', 'ingredients', parseInt(id), {
      changes: req.body,
      ipAddress: req.ip,
    });

    return successResponse(res, result.rows[0], 'Ingrediente actualizado');
  } catch (error) {
    logger.error('Error al actualizar ingrediente:', error);
    return errorResponse(res, 'Error al actualizar ingrediente', 500);
  }
};

// Ajustar stock (entrada/salida/ajuste)
const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, cantidad, referencia, notas } = req.body;

    if (!['entrada', 'salida', 'ajuste', 'merma'].includes(tipo)) {
      return errorResponse(res, 'Tipo de movimiento inválido', 400);
    }

    const result = await db.withTransaction(async (client) => {
      // Obtener stock actual
      const current = await client.query(
        'SELECT stock_actual, nombre FROM ingredients WHERE id = $1 FOR UPDATE',
        [id]
      );

      if (current.rows.length === 0) {
        throw new Error('Ingrediente no encontrado');
      }

      const stockActual = parseFloat(current.rows[0].stock_actual);
      let nuevoStock;

      if (tipo === 'entrada') {
        nuevoStock = stockActual + cantidad;
      } else if (tipo === 'salida' || tipo === 'merma') {
        nuevoStock = stockActual - cantidad;
        if (nuevoStock < 0) {
          throw new Error('Stock insuficiente');
        }
      } else { // ajuste
        nuevoStock = cantidad; // El ajuste establece el stock directamente
      }

      // Actualizar stock
      await client.query(
        'UPDATE ingredients SET stock_actual = $1, updated_at = NOW() WHERE id = $2',
        [nuevoStock, id]
      );

      // Registrar movimiento
      const movementResult = await client.query(`
        INSERT INTO inventory_movements 
        (ingredient_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, user_id, notas)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [id, tipo, cantidad, stockActual, nuevoStock, referencia, req.user.id, notas]);

      return {
        ingredient: {
          id: parseInt(id),
          nombre: current.rows[0].nombre,
          stock_anterior: stockActual,
          stock_nuevo: nuevoStock,
        },
        movement: movementResult.rows[0],
      };
    });

    // Verificar si hay alerta de stock bajo
    const ingredient = await db.query('SELECT * FROM ingredients WHERE id = $1', [id]);
    if (ingredient.rows[0].stock_actual <= ingredient.rows[0].stock_minimo) {
      // Crear alerta
      await db.query(`
        INSERT INTO alerts (tipo, prioridad, titulo, mensaje, recurso, recurso_id)
        VALUES ('stock_bajo', 'alta', $1, $2, 'ingredients', $3)
      `, [
        `Stock bajo: ${ingredient.rows[0].nombre}`,
        `El ingrediente ${ingredient.rows[0].nombre} tiene ${ingredient.rows[0].stock_actual} ${ingredient.rows[0].unidad} (mínimo: ${ingredient.rows[0].stock_minimo})`,
        id,
      ]);

      // Emitir alerta
      req.io?.emit('alert:new', {
        tipo: 'stock_bajo',
        ingrediente: ingredient.rows[0].nombre,
        stock: ingredient.rows[0].stock_actual,
      });
    }

    // Log de auditoría
    await logAuditAction(req.user.id, 'adjust_stock', 'ingredients', parseInt(id), {
      tipo,
      cantidad,
      stock_anterior: result.ingredient.stock_anterior,
      stock_nuevo: result.ingredient.stock_nuevo,
      ipAddress: req.ip,
    });

    // Emitir evento de inventario
    req.io?.emit('inventory:update', { 
      action: 'stock_change', 
      ingredientId: parseInt(id),
      newStock: result.ingredient.stock_nuevo,
    });

    // Emitir evento de menú para actualizar disponibilidad
    req.io?.emit('menu:availability', { reason: 'stock_change' });

    return successResponse(res, result, 'Stock ajustado correctamente');
  } catch (error) {
    logger.error('Error al ajustar stock:', error);
    if (error.message === 'Stock insuficiente') {
      return errorResponse(res, 'Stock insuficiente para esta operación', 400);
    }
    if (error.message === 'Ingrediente no encontrado') {
      return errorResponse(res, 'Ingrediente no encontrado', 404);
    }
    return errorResponse(res, 'Error al ajustar stock', 500);
  }
};

// Obtener historial de movimientos
const getMovements = async (req, res) => {
  try {
    const { 
      page = 1, limit = 50, ingredient_id, tipo, 
      fecha_inicio, fecha_fin, user_id 
    } = req.query;
    const { offset } = paginate(page, limit);

    let query = `
      SELECT im.*, i.nombre as ingrediente_nombre, i.unidad, u.nombre as usuario_nombre
      FROM inventory_movements im
      JOIN ingredients i ON i.id = im.ingredient_id
      LEFT JOIN users u ON u.id = im.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (ingredient_id) {
      paramCount++;
      query += ` AND im.ingredient_id = $${paramCount}`;
      params.push(ingredient_id);
    }

    if (tipo) {
      paramCount++;
      query += ` AND im.tipo = $${paramCount}`;
      params.push(tipo);
    }

    if (fecha_inicio) {
      paramCount++;
      query += ` AND im.created_at >= $${paramCount}`;
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      paramCount++;
      query += ` AND im.created_at <= $${paramCount}`;
      params.push(fecha_fin);
    }

    if (user_id) {
      paramCount++;
      query += ` AND im.user_id = $${paramCount}`;
      params.push(user_id);
    }

    // Contar total
    const countQuery = query.replace(
      'SELECT im.*, i.nombre as ingrediente_nombre, i.unidad, u.nombre as usuario_nombre',
      'SELECT COUNT(*)'
    );
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Obtener movimientos
    query += ` ORDER BY im.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return successResponse(res, {
      movements: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error al obtener movimientos:', error);
    return errorResponse(res, 'Error al obtener movimientos', 500);
  }
};

// Obtener alertas de stock
const getStockAlerts = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, nombre, unidad, stock_actual, stock_minimo, ubicacion,
        CASE 
          WHEN stock_actual <= 0 THEN 'agotado'
          WHEN stock_actual <= stock_minimo THEN 'bajo'
          ELSE 'normal'
        END as estado
      FROM ingredients
      WHERE activo = true AND stock_actual <= stock_minimo
      ORDER BY 
        CASE WHEN stock_actual <= 0 THEN 0 ELSE 1 END,
        stock_actual ASC
    `);

    return successResponse(res, {
      alerts: result.rows,
      agotados: result.rows.filter(i => i.estado === 'agotado').length,
      stock_bajo: result.rows.filter(i => i.estado === 'bajo').length,
    });
  } catch (error) {
    logger.error('Error al obtener alertas de stock:', error);
    return errorResponse(res, 'Error al obtener alertas', 500);
  }
};

module.exports = {
  getIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  adjustStock,
  getMovements,
  getStockAlerts,
};
