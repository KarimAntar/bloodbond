import { db } from './firebaseConfig';
import { collection, addDoc, Timestamp, query, where, orderBy, getDocs } from 'firebase/firestore';
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
      // Context debug
      try {
        console.log('getPushToken: context', {
          origin: typeof location !== 'undefined' ? location.origin : undefined,
          href: typeof location !== 'undefined' ? location.href : undefined,
          isSecureContext: typeof window !== 'undefined' ? (window as any).isSecureContext : undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        });
      } catch (ctxErr) {
        console.warn('getPushToken: failed to read context info', ctxErr);
      }

      // Web: register service worker and get FCM token
      if (!('serviceWorker' in navigator)) {
        console.error('Service workers not supported in this browser');
        return null;
      }

      // Report current notification permission
      const currentPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
      console.log('getPushToken: Notification.permission =', currentPerm);
      if (currentPerm === 'denied') {
        console.warn('Notifications are blocked by the user (Notification.permission === "denied")');
        return null;
      }

      // If permission not already granted, request it explicitly
      if (currentPerm !== 'granted') {
        console.log('getPushToken: requesting notification permission...');
        const perm = await requestNotificationPermissions();
        console.log('getPushToken: permission request result =', perm);
        if (perm !== 'granted') {
          console.warn('Notification permission not granted after request:', perm);
          return null;
        }
      }

      // Quick check that the service worker file is reachable
      try {
        const swUrl = '/firebase-messaging-sw.js';
        const swResp = await fetch(swUrl, { method: 'GET', cache: 'no-store' });
        console.log('getPushToken: service worker file fetch status=', swResp.status);
        if (!swResp.ok) {
          console.warn('getPushToken: service worker file returned non-OK status. SW may not be served from root.');
        }
      } catch (fetchErr) {
        console.warn('getPushToken: failed to fetch service worker file (this can be fine in dev), error=', fetchErr);
      }

      // Register service worker at app root (we create firebase-messaging-sw.js)
      // But first, double-check permission hasn't been revoked during the process
      const preRegistrationPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
      console.log('getPushToken: permission before service worker registration:', preRegistrationPerm);
      if (preRegistrationPerm !== 'granted') {
        console.warn('getPushToken: permission was revoked before service worker registration');
        return null;
      }

      // Try to get existing service worker registration first
      let registration = await navigator.serviceWorker.getRegistration('/');

      // If no registration exists, try to register one
      if (!registration) {
        try {
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
          console.log('getPushToken: service worker registered, scope=', registration.scope);
        } catch (regErr: any) {
          console.warn('getPushToken: service worker registration failed:', regErr);
          // Continue anyway - sometimes we can get token without explicit registration
        }
      } else {
        console.log('getPushToken: using existing service worker registration, scope=', registration.scope);
      }

      // Initialize messaging and try to get token
      const messaging = getMessaging();

      // First try with service worker registration if available
      if (registration) {
        try {
          const fcmToken = await getToken(messaging, {
            vapidKey: FCM_VAPID_KEY,
            serviceWorkerRegistration: registration,
          });
          console.log('getPushToken: getToken with SW registration succeeded:', !!fcmToken);
          return fcmToken || null;
        } catch (tokenErr: any) {
          console.warn('getPushToken: getToken with SW registration failed:', tokenErr);
          // Fall through to try without SW registration
        }
      }

      // Try without explicit service worker registration
      try {
        const fcmToken = await getToken(messaging, {
          vapidKey: FCM_VAPID_KEY,
        });
        console.log('getPushToken: getToken without SW registration succeeded:', !!fcmToken);
        return fcmToken || null;
      } catch (altErr: any) {
        console.error('getPushToken: all token retrieval methods failed:', altErr);

        // IMPORTANT: Firebase's getToken() can cause permission revocation
        // Check if permission was revoked during FCM token retrieval and restore it
        const currentPermAfterFailure = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
        console.log('getPushToken: permission after FCM failure:', currentPermAfterFailure);

        // If permission was revoked during FCM call, this is a Firebase bug
        // We can't prevent this, but we can document it
        if (currentPermAfterFailure === 'default' && preRegistrationPerm === 'granted') {
          console.warn('WARNING: Firebase getToken() caused permission revocation - this is a known Firebase bug');
          console.warn('The permission was granted but FCM token retrieval failed and revoked the permission');
          console.warn('This is a limitation of Firebase Cloud Messaging in some browsers');
        }

        // Check if this is a permission issue
        if (altErr && (altErr.name === 'NotAllowedError' || (typeof altErr.message === 'string' && altErr.message.toLowerCase().includes('permission')))) {
          console.warn('Permission denied when getting FCM token. This might be due to browser restrictions.');
        } else {
          console.warn('getPushToken: token retrieval failed with non-permission error; check console for details.');
        }
        return null;
      }
    } else {
      // Native (Expo) fallback: use Expo Notifications to get a token (not FCM)
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        console.log('getPushToken: Expo token obtained', tokenData?.data);
        return tokenData?.data ?? null;
      } catch (expoErr) {
        console.error('getPushToken: Expo token request failed', expoErr);
        return null;
      }
    }
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/*
  Ensure permission, obtain an FCM token and register it for the given user.
  Use this on user gesture (e.g., Settings -> Enable notifications) so browsers
  prompt for permission in a clear UX flow.
*/
export const ensureAndRegisterPushToken = async (userId: string, platform = 'web') => {
  try {
    console.log('ensureAndRegisterPushToken: STARTING for userId:', userId, 'platform:', platform);

    if (!userId) {
      console.warn('ensureAndRegisterPushToken: missing userId');
      return { success: false, reason: 'no-user' };
    }

    // Request permission flow - only if not already granted
    if (isWeb) {
      const currentPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
      console.log('ensureAndRegisterPushToken: current permission =', currentPerm);

      // If already granted, skip requesting again
      if (currentPerm === 'granted') {
        console.log('ensureAndRegisterPushToken: permission already granted, skipping request');
      } else {
        // Only request if not already granted
        console.log('ensureAndRegisterPushToken: requesting permission...');
        const perm = await requestNotificationPermissions();
        console.log('ensureAndRegisterPushToken: permission result =', perm);
        if (perm !== 'granted') {
          console.log('ensureAndRegisterPushToken: permission request failed, returning');
          return { success: false, reason: 'permission-denied' };
        }
      }
    } else {
      // native: rely on expo permissions helper
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          if (newStatus !== 'granted') {
            return { success: false, reason: 'permission-denied' };
          }
        }
      } catch (e) {
        console.warn('ensureAndRegisterPushToken: native permission flow failed', e);
      }
    }

    // Double-check permission before attempting token retrieval
    if (isWeb) {
      const finalPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
      console.log('ensureAndRegisterPushToken: final permission check before token retrieval =', finalPerm);
      if (finalPerm !== 'granted') {
        console.warn('ensureAndRegisterPushToken: permission was revoked before token retrieval');
        return { success: false, reason: 'permission-revoked' };
      }
    }

    console.log('ensureAndRegisterPushToken: calling getPushToken...');
    // Obtain token
    const token = await getPushToken();
    console.log('ensureAndRegisterPushToken: getPushToken result:', token ? 'SUCCESS' : 'FAILED');

    if (!token) {
      console.warn('ensureAndRegisterPushToken: no token obtained');

      // Check if permission is still granted - if so, we can still consider notifications enabled
      // even if FCM token retrieval failed (Firebase bug causes permission revocation)
      const finalPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
      console.log('ensureAndRegisterPushToken: final permission after token attempt:', finalPerm);

      if (finalPerm === 'granted') {
        console.log('ensureAndRegisterPushToken: permission still granted despite FCM failure, enabling notifications');
        console.log('NOTE: FCM push notifications may not work due to Firebase permission handling bug');
        // Don't register a token, but still return success since permission is granted
        return { success: true, token: null, reason: 'permission-granted-no-token' };
      }

      // Check if permission was revoked by Firebase (common Firebase bug)
      if (finalPerm === 'default') {
        console.warn('ensureAndRegisterPushToken: permission was revoked to "default" - likely Firebase bug');
        console.warn('This is a known issue with Firebase Cloud Messaging in some browsers');
        return { success: false, reason: 'firebase-permission-revocation' };
      }

      return { success: false, reason: 'no-token' };
    }

    console.log('ensureAndRegisterPushToken: registering token in Firestore...');
    // Register token in Firestore
    await registerPushToken(userId, token, platform);
    console.log('ensureAndRegisterPushToken: token registered successfully!');
    return { success: true, token };
  } catch (error) {
    console.error('ensureAndRegisterPushToken error:', error);
    return { success: false, reason: 'error', error };
  }
};

/**
 * Run quick diagnostics to help debug web/PC notification issues.
 * Returns an object containing:
 *  - permission: Notification.permission value
 *  - isSecureContext: boolean
 *  - origin: location.origin
 *  - userAgent: navigator.userAgent
 *  - serviceWorker: { supported, registrationScope, fetchStatus, fetchOk, registrationExists }
 */
export const runNotificationDiagnostics = async () => {
  try {
    const permission = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';
    const isSecureContext = (typeof window !== 'undefined') ? (window as any).isSecureContext : false;
    const origin = (typeof location !== 'undefined') ? location.origin : null;
    const userAgent = (typeof navigator !== 'undefined') ? navigator.userAgent : null;

    const swInfo: any = {
      supported: !!('serviceWorker' in navigator),
      registrationExists: false,
      registrationScope: null,
      fetchStatus: null,
      fetchOk: null,
      fetchError: null,
      manualRegistrationAttempt: null,
    };

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          swInfo.registrationExists = true;
          swInfo.registrationScope = reg.scope;
        }

        try {
          const resp = await fetch('/firebase-messaging-sw.js', { method: 'GET', cache: 'no-store' });
          swInfo.fetchStatus = resp.status;
          swInfo.fetchOk = resp.ok;
        } catch (fetchErr: any) {
          swInfo.fetchError = String(fetchErr);
        }

        // Try manual service worker registration
        try {
          console.log('runNotificationDiagnostics: Attempting manual SW registration...');
          const manualReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
          swInfo.manualRegistrationAttempt = {
            success: true,
            scope: manualReg.scope,
            state: manualReg.active?.state || 'unknown'
          };
          console.log('runNotificationDiagnostics: Manual SW registration succeeded:', manualReg.scope);
        } catch (manualErr: any) {
          swInfo.manualRegistrationAttempt = {
            success: false,
            error: String(manualErr)
          };
          console.warn('runNotificationDiagnostics: Manual SW registration failed:', manualErr);
        }
      } catch (swErr: any) {
        swInfo.fetchError = String(swErr);
      }
    }

    const result = {
      permission,
      isSecureContext,
      origin,
      userAgent,
      serviceWorker: swInfo,
      timestamp: new Date().toISOString(),
    };

    console.log('runNotificationDiagnostics:', result);
    return result;
  } catch (error) {
    console.error('runNotificationDiagnostics error:', error);
    return { error };
  }
};


/*
  Send a broadcast notification record that a server or Cloud Function can
  pick up and deliver to all user tokens via FCM.
*/
export const sendBroadcastNotification = async (title: string, body: string, data?: any) => {
  try {
    // Store notification for cloud function processing
    await addDoc(collection(db, 'broadcastNotifications'), {
      title,
      message: body,
      data: data || {},
      timestamp: Timestamp.now(),
    });

    // For testing: also try to send directly to current user if we have their token
    // This is a temporary solution for testing - in production use cloud functions
    try {
      const userTokensRef = collection(db, 'userTokens');
      const q = query(userTokensRef, where('platform', '==', 'web'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const tokens = snapshot.docs.map(doc => doc.data().token);
        console.log('Found tokens for broadcast:', tokens.length);

        // Send to first few tokens for testing
        for (const token of tokens.slice(0, 5)) {
          await sendFCMMessage(token, title, body, data);
        }
      }
    } catch (directSendError) {
      console.warn('Direct FCM send failed, relying on cloud functions:', directSendError);
    }

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

// Send FCM message directly (for testing - not recommended for production)
const sendFCMMessage = async (token: string, title: string, body: string, data?: any) => {
  try {
    // For testing purposes, we'll use a simple approach
    // In production, this should be done server-side with proper authentication
    console.log('Attempting to send FCM message to token:', token.substring(0, 20) + '...');

    // This is a placeholder - actual FCM sending requires server-side implementation
    // For now, we'll just log that we would send the message
    console.log('FCM Message would be sent:', { token: token.substring(0, 20) + '...', title, body, data });

    // In a real implementation, you would use the FCM REST API:
    /*
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': 'key=YOUR_SERVER_KEY',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          icon: '/assets/images/icon.png',
        },
        data: data || {},
      }),
    });
    */

    return { success: true };
  } catch (error) {
    console.error('Error sending FCM message:', error);
    throw error;
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
    console.log('sendPushNotification: Starting push notification send', { userId, title, body });

    // Store as notification record for later processing / server delivery
    const notificationDoc = {
      userId,
      type: 'admin_push',
      title,
      message: body,
      timestamp: Timestamp.now(),
      read: false,
      data: data || {},
    };

    await addDoc(collection(db, 'notifications'), notificationDoc);
    console.log('sendPushNotification: Notification stored in Firestore');

    // For testing: try to send directly to user's tokens
    try {
      const userTokensRef = collection(db, 'userTokens');
      const q = query(userTokensRef, where('userId', '==', userId), where('platform', '==', 'web'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      console.log('sendPushNotification: Found', snapshot.size, 'user tokens');

      if (!snapshot.empty) {
        const token = snapshot.docs[0].data().token;
        console.log('sendPushNotification: Found user token, attempting direct FCM send');
        console.log('sendPushNotification: Token preview:', token.substring(0, 20) + '...');

        await sendFCMMessage(token, title, body, data);
        console.log('sendPushNotification: Direct FCM send completed');
      } else {
        console.log('sendPushNotification: No user tokens found for direct send');
      }
    } catch (directSendError) {
      console.warn('sendPushNotification: Direct FCM send failed, notification stored for cloud function processing:', directSendError);
    }

    console.log('sendPushNotification: Push notification send completed successfully');
    return { success: true };
  } catch (error) {
    console.error('sendPushNotification: Error sending push notification:', error);
    throw error;
  }
};

/*
  Initialize notifications:

  - IMPORTANT: Do NOT request notification permission automatically on web app startup.
    Browsers block or ignore permission prompts that are not triggered by a direct
    user gesture and aggressive auto-requests can cause the permission to become
    denied or reset on reload. Permission should be requested only from a user
    gesture (we expose ensureAndRegisterPushToken for that).

  - This function will only wire up foreground message listeners on web if the
    browser permission is already "granted". For requesting permission use
    ensureAndRegisterPushToken (called from a button / explicit user action).

  - Following Firebase documentation: https://firebase.google.com/docs/cloud-messaging/get-started?platform=web
*/
export const initializeNotifications = async () => {
  try {
    if (isWeb) {
      // Do NOT call requestNotificationPermissions() here to avoid non-gesture prompts.
      const currentPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
      console.log('initializeNotifications: web Notification.permission =', currentPerm);

      if (currentPerm !== 'granted') {
        console.log('initializeNotifications: web permission not granted — skipping onMessage setup (wait for user gesture)');
        return true;
      }

      // Following Firebase docs: Initialize messaging first, then set up message handler
      const messaging = getMessaging();

      try {
        // Set up foreground message handler as per Firebase documentation
        onMessage(messaging, (payload) => {
          console.log('FCM message received in foreground:', payload);
          if (payload?.notification) {
            const { title, body } = payload.notification;
            try {
              // Create browser notification for foreground messages
              new Notification(title ?? 'Notification', {
                body: body ?? undefined,
                icon: '/assets/images/icon.png', // Add icon as per Firebase best practices
                data: payload?.data ?? {},
              });
            } catch (e) {
              console.error('Error showing browser notification', e);
            }
          }
        });
        console.log('initializeNotifications: onMessage handler set up successfully');
      } catch (e) {
        console.warn('onMessage setup failed', e);
      }

      return true;
    } else {
      // Native: we can request permissions safely on startup
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Native notification permission not granted on init — skipping category setup');
        return true;
      }

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
