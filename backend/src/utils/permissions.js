const db = require('../config/database');
const logger = require('./logger');

// Constantes de roles
const ROLES = {
  GERENTE: 'gerente',
  EMPLEADO: 'empleado',
  COCINA: 'cocina',
};

// Permisos por rol
const PERMISSIONS = {
  [ROLES.GERENTE]: [
    'dashboard:view',
    'dashboard:kpis',
    'menu:view',
    'menu:create',
    'menu:update',
    'menu:delete',
    'inventory:view',
    'inventory:create',
    'inventory:update',
    'inventory:delete',
    'inventory:adjust',
    'orders:view',
    'orders:view-all',
    'orders:create',
    'orders:update',
    'orders:delete',
    'users:view',
    'users:create',
    'users:update',
    'users:delete',
    'reports:view',
    'reports:export',
    'settings:view',
    'settings:update',
    'alerts:view',
    'alerts:manage',
    'kitchen:view',
  ],
  [ROLES.EMPLEADO]: [
    'menu:view',
    'orders:view',
    'orders:create',
    'orders:update-own',
    'alerts:view-own',
  ],
  [ROLES.COCINA]: [
    'kitchen:view',
    'orders:view',
    'orders:update-status',
    'alerts:view',
  ],
};

// Verifica si un rol tiene un permiso específico
const hasPermission = (role, permission) => {
  const rolePermissions = PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
};

// Obtiene todos los permisos de un rol
const getRolePermissions = (role) => {
  return PERMISSIONS[role] || [];
};

// Registra acción de auditoría
const logAuditAction = async (userId, action, resource, resourceId, details = {}) => {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, action, resource, resourceId, JSON.stringify(details), details.ipAddress || null]
    );
  } catch (error) {
    logger.error('Error registrando auditoría:', error);
  }
};

module.exports = {
  ROLES,
  PERMISSIONS,
  hasPermission,
  getRolePermissions,
  logAuditAction,
};
