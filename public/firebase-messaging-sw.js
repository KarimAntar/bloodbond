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

self.addEventListener('install', function(event) {
  // Activate new service worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  // Take control of uncontrolled clients as soon as the SW activates
  event.waitUntil(clients.claim());
});

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] ===== BACKGROUND MESSAGE RECEIVED =====');
  console.log('[firebase-messaging-sw.js] Full payload:', JSON.stringify(payload, null, 2));
  console.log('[firebase-messaging-sw.js] payload.notification exists:', !!payload.notification);
  console.log('[firebase-messaging-sw.js] payload.data exists:', !!payload.data);

  try {
    const notif = payload.notification || null;
    const data = payload.data || {};

    console.log('[firebase-messaging-sw.js] Notification object:', notif);
    console.log('[firebase-messaging-sw.js] Data object:', data);

    // Determine title/body from notification payload OR data fields
    let title, body, tag, image;

    console.log('[firebase-messaging-sw.js] About to determine title/body');

    if (notif) {
      // FCM sent notification payload - use it directly
      console.log('[firebase-messaging-sw.js] Using FCM notification payload');
      title = notif.title || data._title || data.title || 'BloodBond';
      body = notif.body || data._body || data.body || '';
      image = notif.image || data.image;
      tag = `bloodbond-${Date.now()}`;
      console.log('[firebase-messaging-sw.js] Title from notification:', title);
    } else {
      // Fallback to data fields (legacy support)
      console.log('[firebase-messaging-sw.js] Using data payload fallback');
      title = data._title || data.title || 'BloodBond';
      body = data._body || data.body || '';
      image = data.image;
      tag = data.tag || `bloodbond-${Date.now()}`;
      console.log('[firebase-messaging-sw.js] Title from data:', title);
    }

    console.log('[firebase-messaging-sw.js] Final title:', title);

    console.log('[firebase-messaging-sw.js] Extracted data:', { title, body, tag, image });

    // If there is nothing to show, skip showing a notification
    if (!title && !body) {
      console.log('[firebase-messaging-sw.js] No title/body to show for background message, skipping notification.');
      return;
    }

    const options = {
      body: body,
      icon: '/favicon.png',
      data: data,
      tag,
      renotify: false,
      requireInteraction: true
    };

    // Add image if present
    if (image) {
      options.image = image;
    }

    console.log('[firebase-messaging-sw.js] Final notification options:', options);
    console.log('[firebase-messaging-sw.js] About to call showNotification...');

    // Check if we have permission and service worker context
    console.log('[firebase-messaging-sw.js] Service worker context check:');
    console.log('- self.registration:', !!self.registration);
    console.log('- self.registration.showNotification:', typeof self.registration?.showNotification);

    const result = self.registration.showNotification(title, options);
    console.log('[firebase-messaging-sw.js] showNotification called successfully, result:', result);

    return result;

  } catch (error) {
    console.error('[firebase-messaging-sw.js] ===== ERROR IN BACKGROUND MESSAGE HANDLER =====');
    console.error('[firebase-messaging-sw.js] Error details:', error);
    console.error('[firebase-messaging-sw.js] Error stack:', error.stack);
    console.error('[firebase-messaging-sw.js] Payload that caused error:', payload);

    // Try to show error notification as fallback
    try {
      console.log('[firebase-messaging-sw.js] Attempting error notification fallback...');
      self.registration.showNotification('BloodBond Error', {
        body: 'Notification failed to display. Check console for details.',
        icon: '/favicon.png',
        tag: 'bloodbond-error',
        requireInteraction: true
      });
    } catch (fallbackError) {
      console.error('[firebase-messaging-sw.js] Fallback notification also failed:', fallbackError);
    }

    throw error; // Re-throw to ensure error is properly logged
  }
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
