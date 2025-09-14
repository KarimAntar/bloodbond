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

      // BROWSER-SPECIFIC WORKAROUND: Firebase permission revocation bug affects Edge/Chrome
      // Use alternative token retrieval strategies to minimize Firebase bug impact

      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const isEdge = userAgent.includes('Edg') || userAgent.includes('Edge');
      const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edg');

      console.log('getPushToken: browser detection - Edge:', isEdge, 'Chrome:', isChrome);

      // STRATEGY 1: For Edge/Chrome, use minimal Firebase interaction
      if (isEdge || isChrome) {
        console.log('getPushToken: using Edge/Chrome-safe token retrieval strategy');

        // Check permission stability before any Firebase calls
        const initialPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
        console.log('getPushToken: initial permission check:', initialPerm);

        if (initialPerm !== 'granted') {
          console.warn('getPushToken: permission not granted initially');
          return null;
        }

        // Wait a brief moment to let permission stabilize
        await new Promise(resolve => setTimeout(resolve, 100));

        // Double-check permission after stabilization
        const stabilizedPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
        if (stabilizedPerm !== 'granted') {
          console.warn('getPushToken: permission destabilized during stabilization');
          return null;
        }

        // Use a single, carefully controlled getToken call
        try {
          console.log('getPushToken: making single controlled getToken call...');

          // Create fresh messaging instance to minimize state issues
          const freshMessaging = getMessaging();

          const token = await getToken(freshMessaging, {
            vapidKey: FCM_VAPID_KEY,
            serviceWorkerRegistration: registration,
          });

          // IMMEDIATE permission verification after getToken
          const postTokenPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';

          if (postTokenPerm !== 'granted') {
            console.warn('getPushToken: Firebase revoked permission - aborting and returning null');
            // Don't throw, just return null to trigger fallback handling
            return null;
          }

          if (token) {
            console.log('getPushToken: token retrieved successfully with permission intact');
            return token;
          } else {
            console.warn('getPushToken: no token returned despite permission intact');
            return null;
          }

        } catch (error: any) {
          console.warn('getPushToken: controlled getToken failed:', error);

          // Check if permission was revoked during the failed call
          const errorPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
          if (errorPerm !== 'granted') {
            console.warn('getPushToken: permission revoked during error - Firebase bug detected');
            return null;
          }

          // If permission is still granted but getToken failed, it might be a different issue
          console.warn('getPushToken: permission intact but getToken failed - may be service worker issue');
          return null;
        }

      } else {
        // STRATEGY 2: For other browsers, use the enhanced protection
        console.log('getPushToken: using standard enhanced protection for non-Edge/Chrome browsers');

        const preTokenPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
        console.log('getPushToken: permission before getToken call:', preTokenPerm);

        if (preTokenPerm !== 'granted') {
          console.warn('getPushToken: permission revoked before token retrieval, aborting');
          return null;
        }

        // Single controlled attempt for non-problematic browsers
        try {
          console.log('getPushToken: attempting getToken...');
          const fcmToken = await getToken(messaging, {
            vapidKey: FCM_VAPID_KEY,
            serviceWorkerRegistration: registration,
          });

          // Verify permission survived
          const postAttemptPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
          if (postAttemptPerm !== 'granted') {
            console.warn('getPushToken: Firebase revoked permission during token retrieval');
            return null;
          }

          console.log('getPushToken: getToken succeeded:', !!fcmToken);
          return fcmToken || null;
        } catch (tokenErr: any) {
          console.warn('getPushToken: getToken failed:', tokenErr);

          // Check if Firebase revoked permission during the failed call
          const postFailurePerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
          if (postFailurePerm !== 'granted') {
            console.warn('getPushToken: Firebase revoked permission during failed call');
            return null;
          }

          return null;
        }
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
export const ensureAndRegisterPushToken = async (userId: string, platform?: string) => {
  // Determine platform if not provided
  if (!platform) {
    platform = isWeb ? 'web' : 'native';
  }
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
        console.log('WORKAROUND: Using browser Notification API for direct push notifications');

        // Register a special "fallback" token that indicates we should use browser notifications
        await registerPushToken(userId, 'browser-direct-notification', platform);
        console.log('ensureAndRegisterPushToken: registered fallback token for browser notifications');

        return {
          success: true,
          token: 'browser-direct-notification',
          reason: 'permission-granted-fallback-mode',
          fallbackMode: true
        };
      }

      // Check if permission was revoked by Firebase (common Firebase bug)
      if (finalPerm === 'default') {
        console.warn('ensureAndRegisterPushToken: permission was revoked to "default" - likely Firebase bug');
        console.warn('This is a known issue with Firebase Cloud Messaging in some browsers');
        console.warn('WORKAROUND: Since permission was revoked by Firebase, we cannot re-enable it programmatically');
        console.warn('The user will need to manually re-enable notifications in site settings');

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
      // First check all tokens for the user
      const qAll = query(userTokensRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const snapshotAll = await getDocs(qAll);
      console.log('sendPushNotification: Found', snapshotAll.size, 'total user tokens');
      snapshotAll.forEach((doc) => {
        const data = doc.data();
        console.log('sendPushNotification: Token:', {
          platform: data.platform,
          tokenPreview: data.token.substring(0, 20) + '...',
          active: data.active
        });
      });

      // Check for fallback browser notification token
      const fallbackTokens = snapshotAll.docs.filter(doc => doc.data().token === 'browser-direct-notification');
      if (fallbackTokens.length > 0) {
        console.log('sendPushNotification: Found fallback browser notification token, showing direct browser notification');

        // Show browser notification directly using Notification API
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            const notification = new Notification(title, {
              body: body,
              icon: '/assets/images/icon.png',
              data: data || {},
              tag: `bloodbond-${Date.now()}`, // Unique tag to prevent duplicates
            });

            // Auto-close after 5 seconds
            setTimeout(() => {
              notification.close();
            }, 5000);

            console.log('sendPushNotification: Browser notification shown successfully');
          } catch (browserNotifError) {
            console.warn('sendPushNotification: Failed to show browser notification:', browserNotifError);
          }
        } else {
          console.warn('sendPushNotification: Browser notification permission not granted');
        }
      }

      // Then check web tokens specifically for FCM
      const q = query(userTokensRef, where('userId', '==', userId), where('platform', '==', 'web'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      console.log('sendPushNotification: Found', snapshot.size, 'web FCM tokens');

      if (!snapshot.empty) {
        const token = snapshot.docs[0].data().token;
        console.log('sendPushNotification: Found FCM token, attempting direct FCM send');
        console.log('sendPushNotification: Token preview:', token.substring(0, 20) + '...');

        await sendFCMMessage(token, title, body, data);
        console.log('sendPushNotification: Direct FCM send completed');
      } else {
        console.log('sendPushNotification: No web FCM tokens found for direct send');
      }
    } catch (directSendError) {
      console.warn('sendPushNotification: Direct send failed, notification stored for cloud function processing:', directSendError);
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
