const logger = require('../utils/logger');
const { errorResponse } = require('../utils/helpers');

// Middleware global de manejo de errores
const errorHandler = (err, req, res, next) => {
  // Log del error
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user?.id,
  });

  // Errores conocidos
  if (err.name === 'ValidationError') {
    return errorResponse(res, err.message, 400);
  }

  if (err.name === 'UnauthorizedError') {
    return errorResponse(res, 'No autorizado', 401);
  }

  if (err.code === '23505') { // Unique violation en PostgreSQL
    return errorResponse(res, 'El registro ya existe', 409);
  }

  if (err.code === '23503') { // Foreign key violation
    return errorResponse(res, 'Referencia inválida', 400);
  }

  // Error genérico
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : err.message;

  return errorResponse(res, message, statusCode);
};

// Middleware para rutas no encontradas
const notFound = (req, res) => {
  return errorResponse(res, `Ruta no encontrada: ${req.method} ${req.url}`, 404);
};

module.exports = {
  errorHandler,
  notFound,
};
