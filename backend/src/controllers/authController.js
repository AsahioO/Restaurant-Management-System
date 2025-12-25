const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const config = require('../config');
const { successResponse, errorResponse } = require('../utils/helpers');
const { getRolePermissions, logAuditAction } = require('../utils/permissions');
const logger = require('../utils/logger');

// Generar tokens
const generateTokens = (userId, rol) => {
  const accessToken = jwt.sign(
    { userId, rol },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const result = await db.query(
      'SELECT id, nombre, email, password_hash, rol, activo FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Credenciales incorrectas', 401);
    }

    const user = result.rows[0];

    if (!user.activo) {
      return errorResponse(res, 'Usuario desactivado. Contacta al administrador.', 403);
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return errorResponse(res, 'Credenciales incorrectas', 401);
    }

    // Generar tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.rol);

    // Guardar refresh token y actualizar last_login
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken]
    );

    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Log de auditoría
    await logAuditAction(user.id, 'login', 'auth', user.id, { 
      ipAddress: req.ip 
    });

    logger.info(`Usuario ${user.email} inició sesión`);

    return successResponse(res, {
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        permisos: getRolePermissions(user.rol),
      },
      accessToken,
      refreshToken,
    }, 'Inicio de sesión exitoso');
  } catch (error) {
    logger.error('Error en login:', error);
    return errorResponse(res, 'Error al iniciar sesión', 500);
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return errorResponse(res, 'Refresh token requerido', 400);
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch {
      return errorResponse(res, 'Refresh token inválido o expirado', 401);
    }

    // Verificar que el token existe en BD
    const tokenResult = await db.query(
      `SELECT rt.*, u.rol, u.activo FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return errorResponse(res, 'Refresh token no válido', 401);
    }

    const tokenData = tokenResult.rows[0];

    if (!tokenData.activo) {
      return errorResponse(res, 'Usuario desactivado', 403);
    }

    // Generar nuevos tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      decoded.userId, 
      tokenData.rol
    );

    // Eliminar token antiguo y guardar nuevo
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [decoded.userId, newRefreshToken]
    );

    return successResponse(res, {
      accessToken,
      refreshToken: newRefreshToken,
    }, 'Token renovado');
  } catch (error) {
    logger.error('Error en refresh token:', error);
    return errorResponse(res, 'Error al renovar token', 500);
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    // Log de auditoría
    if (req.user) {
      await logAuditAction(req.user.id, 'logout', 'auth', req.user.id, {
        ipAddress: req.ip,
      });
    }

    return successResponse(res, null, 'Sesión cerrada correctamente');
  } catch (error) {
    logger.error('Error en logout:', error);
    return errorResponse(res, 'Error al cerrar sesión', 500);
  }
};

// Obtener perfil actual
const getProfile = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, nombre, email, rol, last_login, created_at 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    const user = result.rows[0];

    return successResponse(res, {
      ...user,
      permisos: getRolePermissions(user.rol),
    });
  } catch (error) {
    logger.error('Error al obtener perfil:', error);
    return errorResponse(res, 'Error al obtener perfil', 500);
  }
};

// Cambiar contraseña
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Obtener usuario con contraseña actual
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // Verificar contraseña actual
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      return errorResponse(res, 'Contraseña actual incorrecta', 400);
    }

    // Hashear nueva contraseña
    const newHash = await bcrypt.hash(newPassword, 10);

    // Actualizar
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.user.id]
    );

    // Invalidar todos los refresh tokens
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

    // Log de auditoría
    await logAuditAction(req.user.id, 'change_password', 'users', req.user.id, {
      ipAddress: req.ip,
    });

    return successResponse(res, null, 'Contraseña actualizada. Por favor inicia sesión nuevamente.');
  } catch (error) {
    logger.error('Error al cambiar contraseña:', error);
    return errorResponse(res, 'Error al cambiar contraseña', 500);
  }
};

module.exports = {
  login,
  refreshToken,
  logout,
  getProfile,
  changePassword,
};
