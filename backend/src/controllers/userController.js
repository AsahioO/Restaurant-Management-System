const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');
const { logAuditAction, ROLES } = require('../utils/permissions');
const logger = require('../utils/logger');

// Listar usuarios
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, rol, activo, search } = req.query;
    const { offset } = paginate(page, limit);

    let query = `
      SELECT id, nombre, email, rol, activo, last_login, created_at
      FROM users WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (rol) {
      paramCount++;
      query += ` AND rol = $${paramCount}`;
      params.push(rol);
    }

    if (activo !== undefined) {
      paramCount++;
      query += ` AND activo = $${paramCount}`;
      params.push(activo === 'true');
    }

    if (search) {
      paramCount++;
      query += ` AND (nombre ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Contar total
    const countResult = await db.query(
      `SELECT COUNT(*) FROM users WHERE 1=1 ${query.split('WHERE 1=1')[1].split('ORDER')[0]}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Obtener usuarios
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    return successResponse(res, {
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error al obtener usuarios:', error);
    return errorResponse(res, 'Error al obtener usuarios', 500);
  }
};

// Obtener usuario por ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, nombre, email, rol, activo, last_login, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    return successResponse(res, result.rows[0]);
  } catch (error) {
    logger.error('Error al obtener usuario:', error);
    return errorResponse(res, 'Error al obtener usuario', 500);
  }
};

// Crear usuario
const createUser = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // Verificar que el rol es válido
    if (!Object.values(ROLES).includes(rol)) {
      return errorResponse(res, 'Rol inválido', 400);
    }

    // Verificar email único
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return errorResponse(res, 'El email ya está registrado', 409);
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario
    const result = await db.query(
      `INSERT INTO users (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, activo, created_at`,
      [nombre, email.toLowerCase(), passwordHash, rol]
    );

    const newUser = result.rows[0];

    // Log de auditoría
    await logAuditAction(req.user.id, 'create', 'users', newUser.id, {
      nombre,
      email,
      rol,
      ipAddress: req.ip,
    });

    logger.info(`Usuario ${newUser.email} creado por ${req.user.email}`);

    return successResponse(res, newUser, 'Usuario creado exitosamente', 201);
  } catch (error) {
    logger.error('Error al crear usuario:', error);
    return errorResponse(res, 'Error al crear usuario', 500);
  }
};

// Actualizar usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, activo } = req.body;

    // Verificar que el usuario existe
    const existing = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // No permitir desactivar al propio usuario
    if (parseInt(id) === req.user.id && activo === false) {
      return errorResponse(res, 'No puedes desactivarte a ti mismo', 400);
    }

    // Si se cambia el email, verificar que no exista
    if (email && email.toLowerCase() !== existing.rows[0].email) {
      const emailCheck = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email.toLowerCase(), id]
      );
      if (emailCheck.rows.length > 0) {
        return errorResponse(res, 'El email ya está en uso', 409);
      }
    }

    // Actualizar
    const result = await db.query(
      `UPDATE users SET
        nombre = COALESCE($1, nombre),
        email = COALESCE($2, email),
        rol = COALESCE($3, rol),
        activo = COALESCE($4, activo),
        updated_at = NOW()
       WHERE id = $5
       RETURNING id, nombre, email, rol, activo, updated_at`,
      [nombre, email?.toLowerCase(), rol, activo, id]
    );

    // Log de auditoría
    await logAuditAction(req.user.id, 'update', 'users', parseInt(id), {
      changes: { nombre, email, rol, activo },
      ipAddress: req.ip,
    });

    return successResponse(res, result.rows[0], 'Usuario actualizado');
  } catch (error) {
    logger.error('Error al actualizar usuario:', error);
    return errorResponse(res, 'Error al actualizar usuario', 500);
  }
};

// Eliminar usuario
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir eliminarse a sí mismo
    if (parseInt(id) === req.user.id) {
      return errorResponse(res, 'No puedes eliminarte a ti mismo', 400);
    }

    // Verificar que existe
    const existing = await db.query('SELECT email FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // Eliminar
    await db.query('DELETE FROM users WHERE id = $1', [id]);

    // Log de auditoría
    await logAuditAction(req.user.id, 'delete', 'users', parseInt(id), {
      deletedEmail: existing.rows[0].email,
      ipAddress: req.ip,
    });

    logger.info(`Usuario ${existing.rows[0].email} eliminado por ${req.user.email}`);

    return successResponse(res, null, 'Usuario eliminado');
  } catch (error) {
    logger.error('Error al eliminar usuario:', error);
    return errorResponse(res, 'Error al eliminar usuario', 500);
  }
};

// Resetear contraseña (admin)
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Verificar que existe
    const existing = await db.query('SELECT email FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // Hashear nueva contraseña
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Actualizar
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, id]
    );

    // Invalidar todos los tokens del usuario
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);

    // Log de auditoría
    await logAuditAction(req.user.id, 'reset_password', 'users', parseInt(id), {
      targetEmail: existing.rows[0].email,
      ipAddress: req.ip,
    });

    return successResponse(res, null, 'Contraseña reseteada exitosamente');
  } catch (error) {
    logger.error('Error al resetear contraseña:', error);
    return errorResponse(res, 'Error al resetear contraseña', 500);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
};
