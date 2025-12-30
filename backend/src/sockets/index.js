const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/database');
const logger = require('../utils/logger');

// Almacén de conexiones por usuario
const userConnections = new Map();

const initializeSocket = (io) => {
  // Middleware de autenticación para Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Token requerido'));
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Verificar que el usuario existe y está activo
      const result = await db.query(
        'SELECT id, nombre, email, rol FROM users WHERE id = $1 AND activo = true',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return next(new Error('Usuario no encontrado'));
      }

      socket.user = result.rows[0];
      next();
    } catch (error) {
      logger.error('Error de autenticación WebSocket:', error.message);
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket;
    logger.info(`Usuario conectado: ${user.nombre} (${user.rol})`);

    // Agregar a mapa de conexiones
    if (!userConnections.has(user.id)) {
      userConnections.set(user.id, new Set());
    }
    userConnections.get(user.id).add(socket.id);

    // Unir a rooms según rol
    socket.join(`role:${user.rol}`);
    socket.join(`user:${user.id}`);

    // Enviar confirmación de conexión
    socket.emit('connected', {
      message: 'Conexión establecida',
      user: { id: user.id, nombre: user.nombre, rol: user.rol },
    });

    // --- Eventos del cliente ---

    // Suscribirse a actualizaciones de una mesa específica
    socket.on('subscribe:table', (tableId) => {
      socket.join(`table:${tableId}`);
      logger.debug(`${user.nombre} suscrito a mesa ${tableId}`);
    });

    // Desuscribirse de una mesa
    socket.on('unsubscribe:table', (tableId) => {
      socket.leave(`table:${tableId}`);
    });

    // Suscribirse a actualizaciones de una orden específica
    socket.on('subscribe:order', (orderId) => {
      socket.join(`order:${orderId}`);
      logger.debug(`${user.nombre} suscrito a orden ${orderId}`);
    });

    // Ping para mantener conexión
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Marcar alerta como leída
    socket.on('alert:read', async (alertId) => {
      try {
        await db.query(
          'UPDATE alerts SET leida = true WHERE id = $1',
          [alertId]
        );
      } catch (error) {
        logger.error('Error al marcar alerta como leída:', error);
      }
    });

    // Desconexión
    socket.on('disconnect', (reason) => {
      logger.info(`Usuario desconectado: ${user.nombre} (${reason})`);
      
      // Remover del mapa de conexiones
      const connections = userConnections.get(user.id);
      if (connections) {
        connections.delete(socket.id);
        if (connections.size === 0) {
          userConnections.delete(user.id);
        }
      }
    });

    // Error
    socket.on('error', (error) => {
      logger.error(`Error WebSocket (${user.nombre}):`, error);
    });
  });

  // --- Funciones para emitir eventos desde el servidor ---

  // Emitir a todos los gerentes
  io.emitToManagers = (event, data) => {
    io.to('role:gerente').emit(event, data);
  };

  // Emitir a todos los empleados
  io.emitToEmployees = (event, data) => {
    io.to('role:empleado').emit(event, data);
  };

  // Emitir a cocina
  io.emitToKitchen = (event, data) => {
    io.to('role:cocina').emit(event, data);
  };

  // Emitir a un usuario específico
  io.emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  // Emitir a una mesa específica
  io.emitToTable = (tableId, event, data) => {
    io.to(`table:${tableId}`).emit(event, data);
  };

  // Verificar si un usuario está conectado
  io.isUserConnected = (userId) => {
    return userConnections.has(userId) && userConnections.get(userId).size > 0;
  };

  // Obtener número de conexiones
  io.getConnectionCount = () => {
    let total = 0;
    for (const connections of userConnections.values()) {
      total += connections.size;
    }
    return total;
  };

  logger.info('Socket.IO inicializado');
  
  return io;
};

module.exports = { initializeSocket };
