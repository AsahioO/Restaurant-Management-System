import api from './api';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Convertir URL-safe base64 a Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verificar si las push notifications están soportadas
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}

/**
 * Obtener el estado del permiso de notificaciones
 */
export function getNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicitar permiso para notificaciones
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    throw new Error('Notificaciones no soportadas');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Obtener la clave pública VAPID del servidor
 */
async function getVapidPublicKey() {
  try {
    const response = await api.get('/push/vapid-public-key');
    return response.data.data.publicKey;
  } catch (error) {
    console.error('Error obteniendo VAPID key:', error);
    throw error;
  }
}

/**
 * Suscribirse a push notifications
 */
export async function subscribeToPush() {
  try {
    if (!isPushSupported()) {
      throw new Error('Push notifications no soportadas en este navegador');
    }

    // Verificar permiso de notificaciones
    let permission = getNotificationPermission();
    if (permission === 'denied') {
      throw new Error('Permiso de notificaciones denegado');
    }

    if (permission !== 'granted') {
      permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        throw new Error('Permiso de notificaciones no concedido');
      }
    }

    // Obtener Service Worker registration
    const registration = await navigator.serviceWorker.ready;

    // Verificar si ya hay una suscripción existente
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Obtener VAPID public key del servidor
      const vapidPublicKey = await getVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Crear nueva suscripción
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      console.log('Nueva suscripción push creada');
    } else {
      console.log('Usando suscripción push existente');
    }

    // Enviar suscripción al servidor
    await api.post('/push/subscribe', { subscription: subscription.toJSON() });

    console.log('Suscripción push guardada en servidor');
    return subscription;
  } catch (error) {
    console.error('Error suscribiendo a push:', error);
    throw error;
  }
}

/**
 * Desuscribirse de push notifications
 */
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Desuscribir del navegador
      await subscription.unsubscribe();

      // Notificar al servidor
      await api.delete('/push/unsubscribe', { 
        data: { endpoint: subscription.endpoint } 
      });

      console.log('Desuscrito de push notifications');
    }
  } catch (error) {
    console.error('Error desuscribiendo de push:', error);
    throw error;
  }
}

/**
 * Enviar notificación de prueba
 */
export async function sendTestNotification() {
  try {
    const response = await api.post('/push/test');
    return response.data;
  } catch (error) {
    console.error('Error enviando notificación de prueba:', error);
    throw error;
  }
}

/**
 * Verificar estado de suscripción
 */
export async function checkPushSubscription() {
  try {
    if (!isPushSupported()) {
      return { subscribed: false, reason: 'not_supported' };
    }

    const permission = getNotificationPermission();
    if (permission !== 'granted') {
      return { subscribed: false, reason: 'permission_not_granted', permission };
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return { 
      subscribed: !!subscription, 
      subscription: subscription?.toJSON() 
    };
  } catch (error) {
    return { subscribed: false, reason: 'error', error: error.message };
  }
}
