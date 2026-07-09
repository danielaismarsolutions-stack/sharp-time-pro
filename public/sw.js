self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body || 'Nueva notificación',
    icon: '/223333333333.jpeg',
    badge: '/223333333333.jpeg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Ver' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Rioja Barber Studio', options)
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
