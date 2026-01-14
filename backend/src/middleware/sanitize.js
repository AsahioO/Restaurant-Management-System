/**
 * Middleware de sanitización de inputs
 * Previene XSS e inyección de código malicioso
 */

const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

// Crear instancia de DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitiza un valor string
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // Eliminar caracteres peligrosos y sanitizar HTML
  return DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [], // No permitir ninguna etiqueta HTML
    ALLOWED_ATTR: [], // No permitir atributos
  }).trim();
};

/**
 * Sanitiza un objeto recursivamente
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitizar la clave también
      const cleanKey = sanitizeString(key);
      sanitized[cleanKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Middleware que sanitiza req.body, req.query y req.params
 */
const sanitizeInputs = (req, res, next) => {
  try {
    // Sanitizar body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitizar query params
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitizar route params
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware para sanitizar campos específicos (para usar en rutas)
 */
const sanitizeFields = (fields) => {
  return (req, res, next) => {
    try {
      for (const field of fields) {
        if (req.body && req.body[field]) {
          req.body[field] = sanitizeString(req.body[field]);
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validadores adicionales para express-validator
 */
const customSanitizers = {
  // Sanitizar y recortar espacios
  trimAndSanitize: (value) => {
    if (typeof value !== 'string') return value;
    return sanitizeString(value);
  },
  
  // Sanitizar email
  sanitizeEmail: (value) => {
    if (typeof value !== 'string') return value;
    return value.toLowerCase().trim();
  },
  
  // Sanitizar número de teléfono
  sanitizePhone: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/[^\d+\-\s()]/g, '').trim();
  },
};

module.exports = {
  sanitizeInputs,
  sanitizeFields,
  sanitizeString,
  sanitizeObject,
  customSanitizers,
};
