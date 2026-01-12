// Service Worker personalizado para Web Push Notifications
// Este archivo se inyecta en el Service Worker generado por Workbox

// Manejar evento push (notificaciones en segundo plano)
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido:', event);

  let data = {
    title: 'Emilia Café',
    body: 'Tienes una nueva notificación',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-192x192.svg'
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    console.error('[SW] Error parseando push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.svg',
    badge: data.badge || '/icons/icon-192x192.svg',
    tag: data.tag || 'default',
    data: data.data || {},
    vibrate: data.vibrate || [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Manejar click en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada:', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  // Si hay URL en los datos, navegar a ella
  let targetUrl = '/';
  if (data.url) {
    targetUrl = data.url;
  } else if (data.type === 'order_ready') {
    targetUrl = '/orders';
  } else if (data.type === 'new_order') {
    targetUrl = '/kitchen';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Si no hay ventana, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Manejar cierre de notificación
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificación cerrada:', event);
});

// Manejar suscripción push change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription cambió');
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.VAPID_PUBLIC_KEY
    }).then((subscription) => {
      // Enviar nueva suscripción al servidor
      return fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });
    })
  );
});
