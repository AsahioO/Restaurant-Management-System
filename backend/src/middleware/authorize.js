const { hasPermission, ROLES } = require('../utils/permissions');
const { errorResponse } = require('../utils/helpers');

// Middleware para verificar rol específico
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'No autenticado', 401);
    }

    if (!roles.includes(req.user.rol)) {
      return errorResponse(res, 'No tienes permisos para esta acción', 403);
    }

    next();
  };
};

// Middleware para verificar permiso específico
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'No autenticado', 401);
    }

    const hasAllPermissions = permissions.every(permission => 
      hasPermission(req.user.rol, permission)
    );

    if (!hasAllPermissions) {
      return errorResponse(res, 'No tienes los permisos necesarios', 403);
    }

    next();
  };
};

// Middleware para verificar al menos un permiso
const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'No autenticado', 401);
    }

    const hasAnyPermission = permissions.some(permission => 
      hasPermission(req.user.rol, permission)
    );

    if (!hasAnyPermission) {
      return errorResponse(res, 'No tienes los permisos necesarios', 403);
    }

    next();
  };
};

// Middleware solo para gerentes
const gerenteOnly = requireRole(ROLES.GERENTE);

// Middleware para cualquier rol autenticado
const anyRole = requireRole(ROLES.GERENTE, ROLES.EMPLEADO);

module.exports = {
  requireRole,
  requirePermission,
  requireAnyPermission,
  gerenteOnly,
  anyRole,
};
