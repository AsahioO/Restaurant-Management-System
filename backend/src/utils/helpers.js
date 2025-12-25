// Formatea números a moneda MXN
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
};

// Formatea fechas a español México
const formatDate = (date, options = {}) => {
  const defaultOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  };
  return new Intl.DateTimeFormat('es-MX', defaultOptions).format(new Date(date));
};

// Genera código único para órdenes
const generateOrderCode = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${dateStr}-${random}`;
};

// Calcula disponibilidad de un ítem basado en ingredientes
const calculateItemAvailability = (menuItem, ingredients) => {
  if (!menuItem.ingredientes_required || menuItem.ingredientes_required.length === 0) {
    return { available: true, maxPortions: Infinity, missingIngredients: [] };
  }

  let maxPortions = Infinity;
  const missingIngredients = [];

  for (const req of menuItem.ingredientes_required) {
    const ingredient = ingredients.find(i => i.id === req.ingredient_id);
    
    if (!ingredient) {
      missingIngredients.push({ name: 'Desconocido', required: req.cantidad_por_porcion, available: 0 });
      maxPortions = 0;
      continue;
    }

    const possiblePortions = Math.floor(ingredient.stock_actual / req.cantidad_por_porcion);
    
    if (possiblePortions === 0) {
      missingIngredients.push({
        id: ingredient.id,
        name: ingredient.nombre,
        required: req.cantidad_por_porcion,
        available: ingredient.stock_actual,
        unit: ingredient.unidad,
      });
    }

    maxPortions = Math.min(maxPortions, possiblePortions);
  }

  return {
    available: maxPortions > 0,
    maxPortions: maxPortions === Infinity ? null : maxPortions,
    missingIngredients,
  };
};

// Paginación helper
const paginate = (page = 1, limit = 20) => {
  const offset = (Math.max(1, page) - 1) * limit;
  return { limit, offset };
};

// Response helpers
const successResponse = (res, data, message = 'Éxito', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const errorResponse = (res, message = 'Error', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  formatCurrency,
  formatDate,
  generateOrderCode,
  calculateItemAvailability,
  paginate,
  successResponse,
  errorResponse,
};
