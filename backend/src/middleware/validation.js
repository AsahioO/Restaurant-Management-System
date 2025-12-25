const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/helpers');

// Middleware para manejar errores de validación
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      campo: error.path,
      mensaje: error.msg,
    }));
    
    return errorResponse(res, 'Datos de entrada inválidos', 400, formattedErrors);
  }
  
  next();
};

module.exports = { handleValidation };
