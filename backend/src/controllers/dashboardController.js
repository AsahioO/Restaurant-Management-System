const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// Obtener KPIs del dashboard
const getKPIs = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    // Si no se especifican fechas, usar el día actual
    const hoy = new Date().toISOString().split('T')[0];
    const startDate = fecha_inicio || hoy;
    const endDate = fecha_fin || hoy;

    // Ventas totales del periodo
    const ventasResult = await db.query(`
      SELECT 
        COUNT(*) as total_ordenes,
        COALESCE(SUM(total), 0) as ventas_totales,
        COALESCE(AVG(total), 0) as ticket_promedio
      FROM orders
      WHERE estado = 'cobrada'
        AND DATE(created_at) >= $1 AND DATE(created_at) <= $2
    `, [startDate, endDate]);

    // Ventas de hoy
    const hoy = new Date().toISOString().split('T')[0];
    const ventasHoyResult = await db.query(`
      SELECT 
        COUNT(*) as ordenes_hoy,
        COALESCE(SUM(total), 0) as ventas_hoy
      FROM orders
      WHERE estado = 'cobrada'
        AND DATE(created_at) = $1
    `, [hoy]);

    // Órdenes por estado
    const ordenesPorEstado = await db.query(`
      SELECT estado, COUNT(*) as cantidad
      FROM orders
      WHERE DATE(created_at) >= $1 AND DATE(created_at) <= $2
      GROUP BY estado
    `, [startDate, endDate]);

    // Ítems más vendidos
    const itemsMasVendidos = await db.query(`
      SELECT 
        oi.nombre_item,
        SUM(oi.cantidad) as cantidad_vendida,
        SUM(oi.subtotal) as ingresos
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.estado = 'cobrada'
        AND DATE(o.created_at) >= $1 AND DATE(o.created_at) <= $2
      GROUP BY oi.nombre_item
      ORDER BY cantidad_vendida DESC
      LIMIT 10
    `, [startDate, endDate]);

    // Ventas por categoría
    const ventasPorCategoria = await db.query(`
      SELECT 
        c.nombre as categoria,
        SUM(oi.cantidad)::integer as cantidad,
        SUM(oi.subtotal)::numeric as ingresos
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      JOIN categories c ON c.id = mi.categoria_id
      WHERE o.estado = 'cobrada'
        AND DATE(o.created_at) >= DATE($1) AND DATE(o.created_at) <= DATE($2)
      GROUP BY c.id, c.nombre
      ORDER BY ingresos DESC
    `, [startDate, endDate]);

    // Alertas de stock
    const alertasStock = await db.query(`
      SELECT COUNT(*) as total_alertas
      FROM ingredients
      WHERE activo = true AND stock_actual <= stock_minimo
    `);

    // Ingredientes agotados
    const agotados = await db.query(`
      SELECT COUNT(*) as agotados
      FROM ingredients
      WHERE activo = true AND stock_actual <= 0
    `);

    // Mesas ocupadas
    const mesas = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE estado = 'ocupada') as ocupadas,
        COUNT(*) FILTER (WHERE estado = 'disponible') as disponibles,
        COUNT(*) as total
      FROM tables
      WHERE activa = true
    `);

    return successResponse(res, {
      periodo: { inicio: startDate, fin: endDate },
      ventas: {
        total: parseFloat(ventasResult.rows[0].ventas_totales),
        ordenes: parseInt(ventasResult.rows[0].total_ordenes),
        ticketPromedio: parseFloat(ventasResult.rows[0].ticket_promedio),
      },
      hoy: {
        ventas: parseFloat(ventasHoyResult.rows[0].ventas_hoy),
        ordenes: parseInt(ventasHoyResult.rows[0].ordenes_hoy),
      },
      ordenesPorEstado: ordenesPorEstado.rows.reduce((acc, row) => {
        acc[row.estado] = parseInt(row.cantidad);
        return acc;
      }, {}),
      itemsMasVendidos: itemsMasVendidos.rows.map(item => ({
        ...item,
        cantidad_vendida: parseInt(item.cantidad_vendida),
        ingresos: parseFloat(item.ingresos),
      })),
      ventasPorCategoria: ventasPorCategoria.rows.map(cat => ({
        categoria: cat.categoria,
        cantidad: parseInt(cat.cantidad),
        ingresos: parseFloat(cat.ingresos),
      })),
      alertas: {
        stockBajo: parseInt(alertasStock.rows[0].total_alertas),
        agotados: parseInt(agotados.rows[0].agotados),
      },
      mesas: {
        ocupadas: parseInt(mesas.rows[0].ocupadas),
        disponibles: parseInt(mesas.rows[0].disponibles),
        total: parseInt(mesas.rows[0].total),
      },
    });
  } catch (error) {
    logger.error('Error al obtener KPIs:', error);
    return errorResponse(res, 'Error al obtener KPIs', 500);
  }
};

// Ventas por hora
const getSalesByHour = async (req, res) => {
  try {
    const { fecha } = req.query;
    const targetDate = fecha || new Date().toISOString().split('T')[0];

    const result = await db.query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hora,
        COUNT(*) as ordenes,
        COALESCE(SUM(total), 0) as ventas
      FROM orders
      WHERE estado = 'cobrada'
        AND DATE(created_at) = $1
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hora
    `, [targetDate]);

    // Llenar horas sin ventas
    const hoursData = [];
    for (let i = 0; i < 24; i++) {
      const hourData = result.rows.find(r => parseInt(r.hora) === i);
      hoursData.push({
        hora: i,
        horaFormato: `${i.toString().padStart(2, '0')}:00`,
        ordenes: hourData ? parseInt(hourData.ordenes) : 0,
        ventas: hourData ? parseFloat(hourData.ventas) : 0,
      });
    }

    return successResponse(res, {
      fecha: targetDate,
      data: hoursData,
    });
  } catch (error) {
    logger.error('Error al obtener ventas por hora:', error);
    return errorResponse(res, 'Error al obtener ventas por hora', 500);
  }
};

// Ventas por día (últimos N días)
const getSalesByDay = async (req, res) => {
  try {
    const { dias = 30 } = req.query;

    const result = await db.query(`
      SELECT 
        DATE(created_at) as fecha,
        COUNT(*) as ordenes,
        COALESCE(SUM(total), 0) as ventas,
        COALESCE(AVG(total), 0) as ticket_promedio
      FROM orders
      WHERE estado = 'cobrada'
        AND created_at >= CURRENT_DATE - INTERVAL '${parseInt(dias)} days'
      GROUP BY DATE(created_at)
      ORDER BY fecha
    `);

    return successResponse(res, {
      dias: parseInt(dias),
      data: result.rows.map(row => ({
        fecha: row.fecha,
        ordenes: parseInt(row.ordenes),
        ventas: parseFloat(row.ventas),
        ticketPromedio: parseFloat(row.ticket_promedio),
      })),
    });
  } catch (error) {
    logger.error('Error al obtener ventas por día:', error);
    return errorResponse(res, 'Error al obtener ventas por día', 500);
  }
};

// Rendimiento de meseros
const getWaiterPerformance = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const startDate = fecha_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = fecha_fin || new Date().toISOString().split('T')[0] + ' 23:59:59';

    const result = await db.query(`
      SELECT 
        u.id,
        u.nombre,
        COUNT(o.id) as total_ordenes,
        COALESCE(SUM(o.total), 0) as ventas_totales,
        COALESCE(AVG(o.total), 0) as ticket_promedio,
        COUNT(o.id) FILTER (WHERE o.estado = 'cancelada') as ordenes_canceladas
      FROM users u
      LEFT JOIN orders o ON o.mesero_id = u.id 
        AND o.created_at >= $1 AND o.created_at <= $2
      WHERE u.rol = 'empleado' AND u.activo = true
      GROUP BY u.id, u.nombre
      ORDER BY ventas_totales DESC
    `, [startDate, endDate]);

    return successResponse(res, {
      periodo: { inicio: startDate, fin: endDate },
      data: result.rows.map(row => ({
        ...row,
        total_ordenes: parseInt(row.total_ordenes),
        ventas_totales: parseFloat(row.ventas_totales),
        ticket_promedio: parseFloat(row.ticket_promedio),
        ordenes_canceladas: parseInt(row.ordenes_canceladas),
      })),
    });
  } catch (error) {
    logger.error('Error al obtener rendimiento de meseros:', error);
    return errorResponse(res, 'Error al obtener rendimiento de meseros', 500);
  }
};

// Tendencias de inventario
const getInventoryTrends = async (req, res) => {
  try {
    const { ingredient_id, dias = 30 } = req.query;

    let query = `
      SELECT 
        DATE(created_at) as fecha,
        ingredient_id,
        i.nombre as ingrediente,
        SUM(CASE WHEN tipo = 'entrada' THEN cantidad ELSE 0 END) as entradas,
        SUM(CASE WHEN tipo IN ('salida', 'merma') THEN cantidad ELSE 0 END) as salidas
      FROM inventory_movements im
      JOIN ingredients i ON i.id = im.ingredient_id
      WHERE im.created_at >= CURRENT_DATE - INTERVAL '${parseInt(dias)} days'
    `;
    const params = [];

    if (ingredient_id) {
      query += ` AND im.ingredient_id = $1`;
      params.push(ingredient_id);
    }

    query += `
      GROUP BY DATE(created_at), ingredient_id, i.nombre
      ORDER BY fecha, ingrediente
    `;

    const result = await db.query(query, params);

    return successResponse(res, {
      dias: parseInt(dias),
      data: result.rows.map(row => ({
        ...row,
        entradas: parseFloat(row.entradas),
        salidas: parseFloat(row.salidas),
        neto: parseFloat(row.entradas) - parseFloat(row.salidas),
      })),
    });
  } catch (error) {
    logger.error('Error al obtener tendencias de inventario:', error);
    return errorResponse(res, 'Error al obtener tendencias de inventario', 500);
  }
};

module.exports = {
  getKPIs,
  getSalesByHour,
  getSalesByDay,
  getWaiterPerformance,
  getInventoryTrends,
};
