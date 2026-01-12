const express = require('express');
const router = express.Router();
const pushService = require('../services/pushService');
const { successResponse, errorResponse } = require('../utils/responses');
const logger = require('../utils/logger');

/**
 * GET /api/push/vapid-public-key
 * Obtener la clave pública VAPID para suscripción push
 */
router.get('/vapid-public-key', (req, res) => {
  const publicKey = pushService.getPublicKey();
  
  if (!publicKey) {
    return errorResponse(res, 'Push notifications no configuradas', 503);
  }
  
  return successResponse(res, { publicKey });
});

/**
 * POST /api/push/subscribe
 * Guardar suscripción push del usuario actual
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;
    const userAgent = req.headers['user-agent'];

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return errorResponse(res, 'Suscripción inválida', 400);
    }

    await pushService.saveSubscription(userId, subscription, userAgent);

    return successResponse(res, { 
      message: 'Suscripción guardada correctamente' 
    });
  } catch (error) {
    logger.error('Error en subscribe:', error);
    return errorResponse(res, 'Error al guardar suscripción', 500);
  }
});

/**
 * DELETE /api/push/unsubscribe
 * Eliminar suscripción push
 */
router.delete('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return errorResponse(res, 'Endpoint requerido', 400);
    }

    await pushService.removeSubscription(endpoint);

    return successResponse(res, { 
      message: 'Suscripción eliminada correctamente' 
    });
  } catch (error) {
    logger.error('Error en unsubscribe:', error);
    return errorResponse(res, 'Error al eliminar suscripción', 500);
  }
});

/**
 * POST /api/push/test
 * Enviar notificación de prueba al usuario actual (solo para testing)
 */
router.post('/test', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pushService.sendToUser(userId, {
      title: '🔔 Notificación de Prueba',
      body: 'Si ves esto, las notificaciones push funcionan correctamente!',
      icon: '/icons/icon-192x192.svg',
      tag: 'test-notification',
      data: { type: 'test' }
    });

    return successResponse(res, { 
      message: 'Notificación enviada',
      result 
    });
  } catch (error) {
    logger.error('Error en test push:', error);
    return errorResponse(res, 'Error al enviar notificación', 500);
  }
});

module.exports = router;
