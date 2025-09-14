// firebase-messaging-sw.js
// Service worker to handle background FCM messages for web.
// Uses Firebase "compat" scripts for simple service-worker usage.
// Make sure you set the same firebaseConfig values below (or keep them in sync).

importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyC7Ld4NcW9ZxMYPlwp1Ck7cpOYinTKD58s",
  authDomain: "bloodbond-892f7.firebaseapp.com",
  projectId: "bloodbond-892f7",
  storageBucket: "bloodbond-892f7.firebasestorage.app",
  messagingSenderId: "589684037045",
  appId: "1:589684037045:web:6b9ca8fe3ac3d8269975fc",
  measurementId: "G-GZH3MCEQD3"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notification = payload.notification || {};
  const title = 'Bloodbond';
  const options = {
    body: notification.body || '',
    icon: '/favicon.png',
    data: payload.data || {}
  };

  return self.registration.showNotification(title, options);
});

// Notification click behavior: focus existing tab or open root
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
