const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/database');
const { errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// Middleware de autenticación JWT
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Token de autenticación requerido', 401);
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Verificar que el usuario existe y está activo
      const result = await db.query(
        'SELECT id, nombre, email, rol, activo FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return errorResponse(res, 'Usuario no encontrado', 401);
      }

      const user = result.rows[0];

      if (!user.activo) {
        return errorResponse(res, 'Usuario desactivado', 403);
      }

      // Agregar usuario al request
      req.user = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return errorResponse(res, 'Token expirado', 401);
      }
      return errorResponse(res, 'Token inválido', 401);
    }
  } catch (error) {
    logger.error('Error en autenticación:', error);
    return errorResponse(res, 'Error de autenticación', 500);
  }
};

// Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const result = await db.query(
        'SELECT id, nombre, email, rol, activo FROM users WHERE id = $1 AND activo = true',
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    } catch {
      // Ignorar errores de token, continuar sin usuario
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth,
};
