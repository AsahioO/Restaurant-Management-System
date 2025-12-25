const db = require('../config/database');
const { successResponse, errorResponse, paginate, generateOrderCode, calculateItemAvailability } = require('../utils/helpers');
const { logAuditAction } = require('../utils/permissions');
const logger = require('../utils/logger');

// Obtener órdenes
const getOrders = async (req, res) => {
  try {
    const { 
      page = 1, limit = 20, estado, mesa_id, mesero_id,
      fecha_inicio, fecha_fin 
    } = req.query;
    const { offset } = paginate(page, limit);
    const isGerente = req.user.rol === 'gerente';

    let query = `
      SELECT o.*, u.nombre as mesero_nombre,
        (SELECT json_agg(
          json_build_object(
            'id', oi.id,
            'menu_item_id', oi.menu_item_id,
            'nombre_item', oi.nombre_item,
            'cantidad', oi.cantidad,
            'precio_unitario', oi.precio_unitario,
            'subtotal', oi.subtotal,
            'notas', oi.notas,
            'estado', oi.estado
          )
        ) FROM order_items oi WHERE oi.order_id = o.id) as items
      FROM orders o
      LEFT JOIN users u ON u.id = o.mesero_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Empleados solo ven sus órdenes
    if (!isGerente) {
      paramCount++;
      query += ` AND o.mesero_id = $${paramCount}`;
      params.push(req.user.id);
    }

    if (estado) {
      paramCount++;
      query += ` AND o.estado = $${paramCount}`;
      params.push(estado);
    }

    if (mesa_id) {
      paramCount++;
      query += ` AND o.mesa_id = $${paramCount}`;
      params.push(mesa_id);
    }

    if (mesero_id && isGerente) {
      paramCount++;
      query += ` AND o.mesero_id = $${paramCount}`;
      params.push(mesero_id);
    }

    if (fecha_inicio) {
      paramCount++;
      query += ` AND o.created_at >= $${paramCount}`;
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      paramCount++;
      query += ` AND o.created_at <= $${paramCount}`;
      params.push(fecha_fin);
    }

    // Contar total
    const countQuery = query.replace(
      /SELECT o\.\*, u\.nombre as mesero_nombre,[\s\S]*?FROM orders o/,
      'SELECT COUNT(*) FROM orders o'
    );
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Obtener órdenes
    query += ` ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return successResponse(res, {
      orders: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error al obtener órdenes:', error);
    return errorResponse(res, 'Error al obtener órdenes', 500);
  }
};

// Obtener orden por ID
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const isGerente = req.user.rol === 'gerente';

    let query = `
      SELECT o.*, u.nombre as mesero_nombre, t.ubicacion as mesa_ubicacion
      FROM orders o
      LEFT JOIN users u ON u.id = o.mesero_id
      LEFT JOIN tables t ON t.id = o.mesa_id
      WHERE o.id = $1
    `;

    // Empleados solo pueden ver sus órdenes
    if (!isGerente) {
      query += ` AND o.mesero_id = $2`;
    }

    const result = await db.query(query, isGerente ? [id] : [id, req.user.id]);

    if (result.rows.length === 0) {
      return errorResponse(res, 'Orden no encontrada', 404);
    }

    // Obtener ítems de la orden
    const items = await db.query(`
      SELECT oi.*, mi.imagen_url, mi.categoria_id
      FROM order_items oi
      LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at
    `, [id]);

    return successResponse(res, {
      ...result.rows[0],
      items: items.rows,
    });
  } catch (error) {
    logger.error('Error al obtener orden:', error);
    return errorResponse(res, 'Error al obtener orden', 500);
  }
};

// Crear orden
const createOrder = async (req, res) => {
  try {
    const { mesa_id, items, notas } = req.body;

    if (!items || items.length === 0) {
      return errorResponse(res, 'La orden debe tener al menos un ítem', 400);
    }

    const result = await db.withTransaction(async (client) => {
      // Verificar mesa si se proporciona
      let mesaNumero = null;
      if (mesa_id) {
        const mesa = await client.query('SELECT numero, estado FROM tables WHERE id = $1', [mesa_id]);
        if (mesa.rows.length === 0) {
          throw new Error('Mesa no encontrada');
        }
        mesaNumero = mesa.rows[0].numero;
        
        // Marcar mesa como ocupada
        await client.query('UPDATE tables SET estado = $1 WHERE id = $2', ['ocupada', mesa_id]);
      }

      // Obtener ingredientes para verificar disponibilidad
      const ingredientsResult = await client.query(
        'SELECT id, nombre, unidad, stock_actual FROM ingredients WHERE activo = true'
      );
      const ingredients = ingredientsResult.rows;

      // Verificar disponibilidad y obtener información de cada ítem
      const orderItems = [];
      let subtotal = 0;

      for (const item of items) {
        // Obtener info del ítem de menú
        const menuItem = await client.query(`
          SELECT mi.*, 
            COALESCE(
              json_agg(
                json_build_object(
                  'ingredient_id', ming.ingredient_id,
                  'cantidad_por_porcion', ming.cantidad_por_porcion
                )
              ) FILTER (WHERE ming.id IS NOT NULL),
              '[]'
            ) as ingredientes_required
          FROM menu_items mi
          LEFT JOIN menu_ingredients ming ON ming.menu_item_id = mi.id
          WHERE mi.id = $1 AND mi.activo = true
          GROUP BY mi.id
        `, [item.menu_item_id]);

        if (menuItem.rows.length === 0) {
          throw new Error(`Ítem de menú no encontrado: ${item.menu_item_id}`);
        }

        const menuData = menuItem.rows[0];
        
        // Verificar disponibilidad
        const availability = calculateItemAvailability(menuData, ingredients);
        if (!availability.available || (availability.maxPortions !== null && availability.maxPortions < item.cantidad)) {
          throw new Error(`No hay suficiente stock para: ${menuData.nombre}. Falta: ${availability.missingIngredients.map(i => i.name).join(', ')}`);
        }

        // Calcular subtotal del ítem
        const itemSubtotal = menuData.precio * item.cantidad;
        subtotal += itemSubtotal;

        orderItems.push({
          menu_item_id: item.menu_item_id,
          nombre_item: menuData.nombre,
          cantidad: item.cantidad,
          precio_unitario: menuData.precio,
          subtotal: itemSubtotal,
          notas: item.notas,
          ingredientes_required: menuData.ingredientes_required,
        });
      }

      // Calcular totales
      const impuestos = subtotal * 0.16; // 16% IVA
      const total = subtotal + impuestos;

      // Crear orden
      const orderResult = await client.query(`
        INSERT INTO orders (codigo, mesa_id, mesa_numero, mesero_id, subtotal, impuestos, total, notas, estado)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendiente')
        RETURNING *
      `, [generateOrderCode(), mesa_id, mesaNumero, req.user.id, subtotal, impuestos, total, notas]);

      const order = orderResult.rows[0];

      // Insertar ítems y descontar inventario
      for (const item of orderItems) {
        await client.query(`
          INSERT INTO order_items (order_id, menu_item_id, nombre_item, cantidad, precio_unitario, subtotal, notas)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [order.id, item.menu_item_id, item.nombre_item, item.cantidad, item.precio_unitario, item.subtotal, item.notas]);

        // Descontar ingredientes del inventario
        for (const ing of item.ingredientes_required) {
          const cantidadTotal = ing.cantidad_por_porcion * item.cantidad;
          
          // Obtener stock actual
          const currentStock = await client.query(
            'SELECT stock_actual FROM ingredients WHERE id = $1 FOR UPDATE',
            [ing.ingredient_id]
          );
          
          if (currentStock.rows.length > 0) {
            const stockAnterior = parseFloat(currentStock.rows[0].stock_actual);
            const stockNuevo = stockAnterior - cantidadTotal;

            // Actualizar stock
            await client.query(
              'UPDATE ingredients SET stock_actual = $1, updated_at = NOW() WHERE id = $2',
              [stockNuevo, ing.ingredient_id]
            );

            // Registrar movimiento
            await client.query(`
              INSERT INTO inventory_movements 
              (ingredient_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, order_id, user_id)
              VALUES ($1, 'salida', $2, $3, $4, $5, $6, $7)
            `, [ing.ingredient_id, cantidadTotal, stockAnterior, stockNuevo, `Orden ${order.codigo}`, order.id, req.user.id]);
          }
        }
      }

      return { order, items: orderItems };
    });

    // Log de auditoría
    await logAuditAction(req.user.id, 'create', 'orders', result.order.id, {
      codigo: result.order.codigo,
      total: result.order.total,
      items: result.items.length,
      ipAddress: req.ip,
    });

    // Emitir eventos
    req.io?.emit('order:new', { 
      orderId: result.order.id, 
      codigo: result.order.codigo,
      mesa: result.order.mesa_numero,
    });
    req.io?.emit('inventory:update', { action: 'order_consumed' });
    req.io?.emit('menu:availability', { reason: 'order_created' });

    logger.info(`Nueva orden creada: ${result.order.codigo} por ${req.user.nombre}`);

    return successResponse(res, result, 'Orden creada exitosamente', 201);
  } catch (error) {
    logger.error('Error al crear orden:', error);
    if (error.message.includes('No hay suficiente stock') || 
        error.message.includes('no encontrad')) {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, 'Error al crear orden', 500);
  }
};

// Actualizar estado de orden
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const isGerente = req.user.rol === 'gerente';

    const validStatuses = ['pendiente', 'confirmada', 'en_preparacion', 'lista', 'servida', 'cobrada', 'cancelada'];
    if (!validStatuses.includes(estado)) {
      return errorResponse(res, 'Estado inválido', 400);
    }

    // Verificar que la orden existe y pertenece al usuario (si no es gerente)
    let query = 'SELECT * FROM orders WHERE id = $1';
    if (!isGerente) {
      query += ' AND mesero_id = $2';
    }

    const existing = await db.query(query, isGerente ? [id] : [id, req.user.id]);
    if (existing.rows.length === 0) {
      return errorResponse(res, 'Orden no encontrada', 404);
    }

    const order = existing.rows[0];

    // Validar transiciones de estado
    const allowedTransitions = {
      'pendiente': ['confirmada', 'cancelada'],
      'confirmada': ['en_preparacion', 'cancelada'],
      'en_preparacion': ['lista', 'cancelada'],
      'lista': ['servida'],
      'servida': ['cobrada'],
      'cobrada': [],
      'cancelada': [],
    };

    if (!allowedTransitions[order.estado].includes(estado)) {
      return errorResponse(res, `No se puede cambiar de ${order.estado} a ${estado}`, 400);
    }

    // Actualizar estado
    const updateData = { estado };
    if (estado === 'cobrada' || estado === 'cancelada') {
      updateData.completed_at = 'NOW()';
    }

    const result = await db.query(`
      UPDATE orders SET 
        estado = $1, 
        updated_at = NOW(),
        completed_at = ${estado === 'cobrada' || estado === 'cancelada' ? 'NOW()' : 'completed_at'}
      WHERE id = $2
      RETURNING *
    `, [estado, id]);

    // Si se cancela, liberar mesa y restaurar inventario
    if (estado === 'cancelada') {
      await db.withTransaction(async (client) => {
        // Liberar mesa
        if (order.mesa_id) {
          await client.query('UPDATE tables SET estado = $1 WHERE id = $2', ['disponible', order.mesa_id]);
        }

        // Restaurar inventario
        const movements = await client.query(
          'SELECT * FROM inventory_movements WHERE order_id = $1 AND tipo = $2',
          [id, 'salida']
        );

        for (const mov of movements.rows) {
          // Obtener stock actual
          const current = await client.query(
            'SELECT stock_actual FROM ingredients WHERE id = $1 FOR UPDATE',
            [mov.ingredient_id]
          );
          
          if (current.rows.length > 0) {
            const stockActual = parseFloat(current.rows[0].stock_actual);
            const stockNuevo = stockActual + parseFloat(mov.cantidad);

            await client.query(
              'UPDATE ingredients SET stock_actual = $1, updated_at = NOW() WHERE id = $2',
              [stockNuevo, mov.ingredient_id]
            );

            // Registrar devolución
            await client.query(`
              INSERT INTO inventory_movements 
              (ingredient_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, order_id, user_id)
              VALUES ($1, 'entrada', $2, $3, $4, $5, $6, $7)
            `, [mov.ingredient_id, mov.cantidad, stockActual, stockNuevo, `Cancelación orden ${order.codigo}`, id, req.user.id]);
          }
        }
      });
    }

    // Liberar mesa cuando se cobra
    if (estado === 'cobrada' && order.mesa_id) {
      await db.query('UPDATE tables SET estado = $1 WHERE id = $2', ['disponible', order.mesa_id]);
    }

    // Log de auditoría
    await logAuditAction(req.user.id, 'update_status', 'orders', parseInt(id), {
      estado_anterior: order.estado,
      estado_nuevo: estado,
      ipAddress: req.ip,
    });

    // Emitir evento
    req.io?.emit('order:status', { 
      orderId: parseInt(id), 
      codigo: order.codigo,
      estado,
      estadoAnterior: order.estado,
    });

    if (estado === 'cancelada') {
      req.io?.emit('inventory:update', { action: 'order_cancelled' });
      req.io?.emit('menu:availability', { reason: 'order_cancelled' });
    }

    return successResponse(res, result.rows[0], `Orden ${estado}`);
  } catch (error) {
    logger.error('Error al actualizar estado de orden:', error);
    return errorResponse(res, 'Error al actualizar estado', 500);
  }
};

// Actualizar estado de ítem de orden
const updateOrderItemStatus = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { estado } = req.body;

    const validStatuses = ['pendiente', 'preparando', 'listo', 'servido', 'cancelado'];
    if (!validStatuses.includes(estado)) {
      return errorResponse(res, 'Estado inválido', 400);
    }

    const result = await db.query(`
      UPDATE order_items SET estado = $1
      WHERE id = $2 AND order_id = $3
      RETURNING *
    `, [estado, itemId, id]);

    if (result.rows.length === 0) {
      return errorResponse(res, 'Ítem no encontrado', 404);
    }

    // Emitir evento
    req.io?.emit('order:item_status', { 
      orderId: parseInt(id), 
      itemId: parseInt(itemId),
      estado,
    });

    return successResponse(res, result.rows[0], 'Estado de ítem actualizado');
  } catch (error) {
    logger.error('Error al actualizar estado de ítem:', error);
    return errorResponse(res, 'Error al actualizar estado de ítem', 500);
  }
};

// Obtener mesas
const getTables = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, 
        (SELECT json_build_object(
          'id', o.id,
          'codigo', o.codigo,
          'total', o.total,
          'created_at', o.created_at
        ) FROM orders o 
        WHERE o.mesa_id = t.id AND o.estado NOT IN ('cobrada', 'cancelada')
        ORDER BY o.created_at DESC LIMIT 1) as orden_activa
      FROM tables t
      WHERE t.activa = true
      ORDER BY t.ubicacion, t.numero
    `);

    return successResponse(res, result.rows);
  } catch (error) {
    logger.error('Error al obtener mesas:', error);
    return errorResponse(res, 'Error al obtener mesas', 500);
  }
};

// Actualizar estado de mesa
const updateTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const validStatuses = ['disponible', 'ocupada', 'reservada', 'mantenimiento'];
    if (!validStatuses.includes(estado)) {
      return errorResponse(res, 'Estado inválido', 400);
    }

    const result = await db.query(
      'UPDATE tables SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Mesa no encontrada', 404);
    }

    req.io?.emit('table:update', { tableId: parseInt(id), estado });

    return successResponse(res, result.rows[0], 'Estado de mesa actualizado');
  } catch (error) {
    logger.error('Error al actualizar mesa:', error);
    return errorResponse(res, 'Error al actualizar mesa', 500);
  }
};

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  updateOrderItemStatus,
  getTables,
  updateTableStatus,
};
