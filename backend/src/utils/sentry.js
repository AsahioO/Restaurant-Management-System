/**
 * Configuración de Sentry para monitoreo de errores (APM)
 * Documentación: https://docs.sentry.io/platforms/node/
 */

const Sentry = require('@sentry/node');
const config = require('../config');
const logger = require('./logger');

/**
 * Inicializa Sentry si está configurado
 */
const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    logger.warn('⚠️ SENTRY_DSN no configurado - Monitoreo APM desactivado');
    return false;
  }
  
  try {
    Sentry.init({
      dsn,
      environment: config.env,
      release: `rms@${require('../../package.json').version}`,
      
      // Capturar el 100% de transacciones en desarrollo, 10% en producción
      tracesSampleRate: config.env === 'production' ? 0.1 : 1.0,
      
      // Filtrar datos sensibles
      beforeSend(event) {
        // Eliminar contraseñas y tokens de los breadcrumbs
        if (event.request?.data) {
          const sensitiveFields = ['password', 'token', 'refreshToken', 'authorization'];
          for (const field of sensitiveFields) {
            if (event.request.data[field]) {
              event.request.data[field] = '[REDACTED]';
            }
          }
        }
        return event;
      },
      
      // Ignorar errores comunes no críticos
      ignoreErrors: [
        'Network request failed',
        'Failed to fetch',
        'Load failed',
        'Token expirado',
      ],
    });
    
    logger.info('✅ Sentry APM inicializado correctamente');
    return true;
  } catch (error) {
    logger.error('❌ Error al inicializar Sentry:', error);
    return false;
  }
};

/**
 * Middleware para capturar request data
 * En Sentry v8+, captura automáticamente pero agregamos contexto extra
 */
const sentryRequestHandler = () => {
  return (req, res, next) => {
    if (process.env.SENTRY_DSN) {
      Sentry.setContext('request', {
        method: req.method,
        url: req.url,
        userAgent: req.get('user-agent'),
      });
    }
    next();
  };
};

/**
 * Middleware para capturar errores
 * En Sentry v8+, usamos captureException directamente
 */
const sentryErrorHandler = () => {
  return (err, req, res, next) => {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    }
    next(err);
  };
};

/**
 * Captura manualmente un error
 */
const captureError = (error, context = {}) => {
  if (!process.env.SENTRY_DSN) {
    logger.error('Error capturado (Sentry no configurado):', error);
    return;
  }
  
  Sentry.withScope((scope) => {
    if (context.user) {
      scope.setUser(context.user);
    }
    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context.extra) {
      for (const [key, value] of Object.entries(context.extra)) {
        scope.setExtra(key, value);
      }
    }
    
    Sentry.captureException(error);
  });
};

/**
 * Captura un mensaje informativo
 */
const captureMessage = (message, level = 'info') => {
  if (!process.env.SENTRY_DSN) {
    logger.info(`Mensaje (Sentry no configurado): ${message}`);
    return;
  }
  
  Sentry.captureMessage(message, level);
};

/**
 * Establece el usuario actual para el contexto
 */
const setUser = (user) => {
  if (!process.env.SENTRY_DSN) return;
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.nombre,
    role: user.rol,
  });
};

/**
 * Limpia el usuario del contexto (en logout)
 */
const clearUser = () => {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setUser(null);
};

module.exports = {
  initSentry,
  sentryRequestHandler,
  sentryErrorHandler,
  captureError,
  captureMessage,
  setUser,
  clearUser,
  Sentry,
};
