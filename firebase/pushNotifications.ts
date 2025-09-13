import { db } from './firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';

// Web: use Firebase Messaging
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Configure notification handler for native (expo)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Determine platform
const isWeb = typeof window !== 'undefined' && window.document;

/*
  NOTE:
  - For web push via FCM you must provide your VAPID public key.
  - Replace the placeholder below with your actual VAPID public key from
    Firebase Console (Cloud Messaging -> Web Push certificates).
*/
const FCM_VAPID_KEY = 'BPtrKQoZb11GAv-WANVq6BfyU9nK8wEwSiS2xzxU9-0AKATQrexpqYwP_IVbXNMzf9BjmlCRazQSFlpaanCG5kE';

// Request permissions for notifications (native + web permission flow)
export const requestNotificationPermissions = async () => {
  if (isWeb) {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permissions not granted (web)');
      return permission;
    }
    return permission;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    throw new Error('Notification permissions not granted (native)');
  }

  return finalStatus;
};

// Get push token (returns FCM token on web, Expo token on native if available)
export const getPushToken = async () => {
  try {
    if (isWeb) {
      // Web: register service worker and get FCM token
      if (!('serviceWorker' in navigator)) {
        console.error('Service workers not supported in this browser');
        return null;
      }

      // Register service worker at app root (we create firebase-messaging-sw.js)
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      // Initialize messaging and get token using VAPID key
      const messaging = getMessaging();
      const fcmToken = await getToken(messaging, {
        vapidKey: FCM_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      return fcmToken || null;
    } else {
      // Native (Expo) fallback: use Expo Notifications to get a token (not FCM)
      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData?.data ?? null;
    }
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/*
  Send a broadcast notification record that a server or Cloud Function can
  pick up and deliver to all user tokens via FCM.
*/
export const sendBroadcastNotification = async (title: string, body: string, data?: any) => {
  try {
    await addDoc(collection(db, 'broadcastNotifications'), {
      title,
      message: body,
      data: data || {},
      timestamp: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating broadcast notification record:', error);
    throw error;
  }
};

// Register push token for a user in Firestore
export const registerPushToken = async (userId: string, token: string, platform = 'web') => {
  try {
    await addDoc(collection(db, 'userTokens'), {
      userId,
      token,
      platform,
      createdAt: Timestamp.now(),
      active: true,
    });
  } catch (error) {
    console.error('Error registering push token:', error);
  }
};

// Send push notification (this function currently stores a notification doc).
// In production you should send messages via FCM server API using server key.
export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: any
) => {
  try {
    // Store as notification record for later processing / server delivery
    await addDoc(collection(db, 'notifications'), {
      userId,
      type: 'admin_push',
      title,
      message: body,
      timestamp: Timestamp.now(),
      read: false,
      data: data || {},
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

// Initialize notifications
export const initializeNotifications = async () => {
  try {
    // Request permissions first
    const webPermission = await requestNotificationPermissions();
    if (isWeb && webPermission !== 'granted') {
      console.warn('Web notification permission not granted — skipping FCM setup');
      return true;
    }

    if (isWeb) {
      // On web, set up onMessage handler for foreground messages
      const messaging = getMessaging();
      try {
        onMessage(messaging, (payload) => {
          console.log('FCM message received in foreground:', payload);
          // Optionally show an in-page notification or use the Notifications API
          if (payload?.notification) {
            const { title, body } = payload.notification;
            // Show a simple browser notification
            try {
              new Notification(title ?? 'Notification', {
                body: body ?? undefined,
                data: payload?.data ?? {},
              });
            } catch (e) {
              console.error('Error showing browser notification', e);
            }
          }
        });
      } catch (e) {
        console.warn('onMessage setup failed', e);
      }

      return true;
    } else {
      // Native: set categories / handlers using expo-notifications
      await Notifications.setNotificationCategoryAsync('blood_request', [
        {
          identifier: 'respond',
          buttonTitle: 'Respond',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      return true;
    }
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
};
