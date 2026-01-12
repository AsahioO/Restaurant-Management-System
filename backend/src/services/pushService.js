const webpush = require('web-push');
const db = require('../config/database');
const logger = require('../utils/logger');

// Configurar VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@emiliacafe.com';

let pushEnabled = false;

try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    pushEnabled = true;
    logger.info('✅ Web Push configurado correctamente');
  } else {
    logger.warn('⚠️ VAPID keys no configuradas - Push notifications deshabilitadas');
  }
} catch (error) {
  logger.error('Error configurando Web Push:', error.message);
}

/**
 * Guardar suscripción push de un usuario
 */
const saveSubscription = async (userId, subscription, userAgent = null) => {
  try {
    const { endpoint, keys } = subscription;
    
    // Verificar si ya existe esta suscripción
    const existing = await db.query(
      'SELECT id FROM push_subscriptions WHERE endpoint = $1',
      [endpoint]
    );

    if (existing.rows.length > 0) {
      // Actualizar suscripción existente
      await db.query(`
        UPDATE push_subscriptions 
        SET user_id = $1, keys_p256dh = $2, keys_auth = $3, user_agent = $4, updated_at = NOW()
        WHERE endpoint = $5
      `, [userId, keys.p256dh, keys.auth, userAgent, endpoint]);
      
      logger.info(`Push subscription actualizada para usuario ${userId}`);
    } else {
      // Crear nueva suscripción
      await db.query(`
        INSERT INTO push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, endpoint, keys.p256dh, keys.auth, userAgent]);
      
      logger.info(`Nueva push subscription para usuario ${userId}`);
    }

    return true;
  } catch (error) {
    logger.error('Error guardando push subscription:', error);
    throw error;
  }
};

/**
 * Eliminar suscripción push
 */
const removeSubscription = async (endpoint) => {
  try {
    await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    logger.info('Push subscription eliminada');
    return true;
  } catch (error) {
    logger.error('Error eliminando push subscription:', error);
    throw error;
  }
};

/**
 * Enviar notificación push a un usuario específico
 */
const sendToUser = async (userId, payload) => {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      logger.warn('Push notifications no configuradas');
      return { success: 0, failed: 0 };
    }

    const subscriptions = await db.query(
      'SELECT * FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );

    const results = { success: 0, failed: 0 };

    for (const sub of subscriptions.rows) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth
          }
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );
        results.success++;
      } catch (error) {
        results.failed++;
        
        // Si la suscripción expiró o es inválida, eliminarla
        if (error.statusCode === 410 || error.statusCode === 404) {
          await removeSubscription(sub.endpoint);
          logger.info(`Suscripción expirada eliminada: ${sub.endpoint.substring(0, 50)}...`);
        } else {
          logger.error(`Error enviando push a ${sub.endpoint.substring(0, 50)}:`, error.message);
        }
      }
    }

    return results;
  } catch (error) {
    logger.error('Error en sendToUser:', error);
    throw error;
  }
};

/**
 * Enviar notificación push a usuarios por rol
 */
const sendToRole = async (rol, payload) => {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return { success: 0, failed: 0 };
    }

    const subscriptions = await db.query(`
      SELECT ps.* FROM push_subscriptions ps
      JOIN users u ON u.id = ps.user_id
      WHERE u.rol = $1 AND u.activo = true
    `, [rol]);

    const results = { success: 0, failed: 0 };

    for (const sub of subscriptions.rows) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth
          }
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );
        results.success++;
      } catch (error) {
        results.failed++;
        
        if (error.statusCode === 410 || error.statusCode === 404) {
          await removeSubscription(sub.endpoint);
        }
      }
    }

    logger.info(`Push enviado a rol ${rol}: ${results.success} exitosos, ${results.failed} fallidos`);
    return results;
  } catch (error) {
    logger.error('Error en sendToRole:', error);
    throw error;
  }
};

/**
 * Notificar a mesero que su orden está lista
 */
const notifyOrderReady = async (order) => {
  const payload = {
    title: '🍽️ ¡Orden Lista!',
    body: `Mesa ${order.mesa_numero || 'S/N'} - ${order.codigo}`,
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-192x192.svg',
    tag: `order-${order.id}`,
    data: {
      type: 'order_ready',
      orderId: order.id,
      orderCode: order.codigo,
      url: '/orders'
    },
    actions: [
      { action: 'view', title: 'Ver Orden' },
      { action: 'dismiss', title: 'Cerrar' }
    ],
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true
  };

  return sendToUser(order.mesero_id, payload);
};

/**
 * Notificar a cocina de nuevo pedido
 */
const notifyNewOrder = async (order) => {
  const payload = {
    title: '🆕 Nuevo Pedido',
    body: `Mesa ${order.mesa_numero || 'S/N'} - ${order.codigo}`,
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-192x192.svg',
    tag: `new-order-${order.id}`,
    data: {
      type: 'new_order',
      orderId: order.id,
      orderCode: order.codigo,
      url: '/kitchen'
    },
    vibrate: [200, 100, 200],
    requireInteraction: false
  };

  return sendToRole('cocina', payload);
};

/**
 * Obtener VAPID public key
 */
const getPublicKey = () => {
  return VAPID_PUBLIC_KEY;
};

module.exports = {
  saveSubscription,
  removeSubscription,
  sendToUser,
  sendToRole,
  notifyOrderReady,
  notifyNewOrder,
  getPublicKey
};
