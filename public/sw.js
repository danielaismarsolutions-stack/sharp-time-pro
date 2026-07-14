const SW_TEXTS = {
  es: {
    fallbackBody: 'Nueva notificación',
    fallbackTitle: 'Nexio',
    open: 'Ver',
    close: 'Cerrar',
  },
  en: {
    fallbackBody: 'New notification',
    fallbackTitle: 'Nexio',
    open: 'View',
    close: 'Dismiss',
  },
};

// El payload incluye lang (idioma del negocio). Fallback: idioma del navegador.
function resolveTexts(data) {
  const lang = data.lang === 'en' || data.lang === 'es'
    ? data.lang
    : (self.navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  return SW_TEXTS[lang];
}

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const texts = resolveTexts(data);

  const options = {
    body: data.body || texts.fallbackBody,
    icon: '/223333333333.jpeg',
    badge: '/223333333333.jpeg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: texts.open },
      { action: 'close', title: texts.close }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || texts.fallbackTitle, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Reuse an open tab of the app and navigate it to the deep link
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then((focusedClient) => {
            const target = focusedClient || client;
            if ('navigate' in target) {
              return target.navigate(url);
            }
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
