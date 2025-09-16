import { db } from './firebaseConfig';
import { collection, addDoc, Timestamp, query, where, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
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

// Global debouncing for token registration to prevent duplicates
let isRegisteringToken = false;

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
      const platform = typeof navigator !== 'undefined' ? navigator.platform : '';

      // Improved browser detection
      const isEdge = userAgent.includes('Edg') || userAgent.includes('Edge');
      const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edg') && !userAgent.includes('CriOS');
      const isFirefox = userAgent.includes('Firefox');
      const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome') && !userAgent.includes('Edg') && !userAgent.includes('CriOS');

      // Improved iOS detection
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) ||
                   (platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                   userAgent.includes('Mac OS X') && 'ontouchend' in document;

      // More accurate iOS browser detection
      const isIOSChrome = isIOS && (userAgent.includes('CriOS') || userAgent.includes('Chrome'));
      const isIOSSafari = isIOS && !userAgent.includes('CriOS') && !userAgent.includes('Chrome') && userAgent.includes('Safari');

      // Additional iOS detection for newer versions
      const isIOSDevice = isIOS || userAgent.includes('iPad') || userAgent.includes('iPhone') || userAgent.includes('iPod');

      console.log('getPushToken: browser detection - Edge:', isEdge, 'Chrome:', isChrome, 'Firefox:', isFirefox, 'Safari:', isSafari);
      console.log('getPushToken: iOS detection - iOS:', isIOS, 'iOS Chrome:', isIOSChrome, 'iOS Safari:', isIOSSafari, 'iOS Device:', isIOSDevice);
      console.log('getPushToken: user agent details:', {
        userAgent: userAgent.substring(0, 100) + '...',
        platform,
        isIOS,
        isIOSChrome,
        isIOSSafari
      });

      // STRATEGY 1: For Edge/Chrome, use minimal Firebase interaction with enhanced protection
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

        // Use a single, carefully controlled getToken call with timeout protection
        try {
          console.log('getPushToken: making single controlled getToken call...');

          // Create fresh messaging instance to minimize state issues
          const freshMessaging = getMessaging();

          // Add timeout protection for getToken call
          const tokenPromise = getToken(freshMessaging, {
            vapidKey: FCM_VAPID_KEY,
            serviceWorkerRegistration: registration,
          });

          // Race against a timeout to prevent hanging
          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('getToken timeout')), 10000)
          );

          const token = await Promise.race([tokenPromise, timeoutPromise]);

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

      } else if (isFirefox) {
        // STRATEGY 2: Firefox-specific handling
        console.log('getPushToken: using Firefox-specific token retrieval strategy');

        const preTokenPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
        console.log('getPushToken: permission before getToken call:', preTokenPerm);

        if (preTokenPerm !== 'granted') {
          console.warn('getPushToken: permission revoked before token retrieval, aborting');
          return null;
        }

        // Firefox sometimes needs a delay before getToken
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
          console.log('getPushToken: attempting getToken for Firefox...');
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

      } else if (isIOSSafari) {
        // STRATEGY 3: iOS Safari specific handling - AGGRESSIVE FALLBACK
        console.log('getPushToken: iOS Safari detected - using aggressive fallback strategy');

        // iOS Safari has very strict requirements for push notifications
        // Check if we're in a secure context (required for iOS)
        const isSecureContext = (typeof window !== 'undefined') ? (window as any).isSecureContext : false;
        console.log('getPushToken: iOS Safari secure context:', isSecureContext);

        const preTokenPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
        console.log('getPushToken: iOS Safari permission check:', preTokenPerm);

        if (preTokenPerm !== 'granted') {
          console.warn('getPushToken: iOS Safari permission not granted');
          return null;
        }

        // For iOS Safari, skip FCM entirely and go straight to browser notifications
        // iOS Safari FCM support is unreliable and often fails
        console.log('getPushToken: iOS Safari - skipping FCM, using browser notification fallback');
        return 'ios-safari-fallback';

      } else if (isIOSChrome) {
        // STRATEGY 4: iOS Chrome specific handling
        console.log('getPushToken: using iOS Chrome-specific token retrieval strategy');

        const preTokenPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
        console.log('getPushToken: permission before getToken call:', preTokenPerm);

        if (preTokenPerm !== 'granted') {
          console.warn('getPushToken: permission revoked before token retrieval, aborting');
          return null;
        }

        // iOS Chrome behaves more like mobile Chrome than Safari
        try {
          console.log('getPushToken: iOS Chrome attempting getToken...');
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

          console.log('getPushToken: iOS Chrome getToken succeeded:', !!fcmToken);
          return fcmToken || null;
        } catch (tokenErr: any) {
          console.warn('getPushToken: iOS Chrome getToken failed:', tokenErr);

          // Check if Firebase revoked permission during the failed call
          const postFailurePerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
          if (postFailurePerm !== 'granted') {
            console.warn('getPushToken: Firebase revoked permission during failed call');
            return null;
          }

          return null;
        }

      } else {
        // STRATEGY 5: For other browsers, use the enhanced protection
        console.log('getPushToken: using standard enhanced protection for other browsers');

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
export const ensureAndRegisterPushToken = async (userId: string, platform?: string, deviceId?: string) => {
  // Determine platform if not provided
  if (!platform) {
    platform = isWeb ? 'web' : 'native';
  }

  // Prevent duplicate simultaneous calls
  if (isRegisteringToken) {
    console.log('ensureAndRegisterPushToken: Already registering token, skipping duplicate call');
    return { success: true, reason: 'already-registering' };
  }

  isRegisteringToken = true;

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
        await registerPushToken(userId, 'browser-direct-notification', platform, deviceId);
        console.log('ensureAndRegisterPushToken: registered fallback token for browser notifications');

        return {
          success: true,
          token: 'browser-direct-notification',
          reason: 'permission-granted-fallback-mode',
          fallbackMode: true
        };
      }
    }

    // Handle iOS Safari fallback token
    if (token === 'ios-safari-fallback') {
      console.log('ensureAndRegisterPushToken: iOS Safari fallback token detected, registering fallback mode');

      // Register the iOS Safari fallback token
      await registerPushToken(userId, 'ios-safari-fallback', platform, deviceId);
      console.log('ensureAndRegisterPushToken: registered iOS Safari fallback token');

      return {
        success: true,
        token: 'ios-safari-fallback',
        reason: 'ios-safari-fallback-mode',
        fallbackMode: true,
        platformNotes: 'iOS Safari detected - using browser notification fallback due to platform limitations'
      };
    }

    if (!token) {
      // Check if permission is still granted for fallback handling
      const finalPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';

      // Check if permission was revoked by Firebase (common Firebase bug)
      if (finalPerm === 'default') {
        console.warn('ensureAndRegisterPushToken: permission was revoked to "default" - likely Firebase bug');
        console.warn('This is a known issue with Firebase Cloud Messaging in some browsers');
        console.warn('WORKAROUND: Since permission was revoked by Firebase, we cannot re-enable it programmatically');
        console.warn('The user will need to manually re-enable notifications in site settings');

        // Provide user-friendly guidance
        const userGuidance = {
          title: 'Notification Permission Issue',
          message: 'Due to a known issue with Firebase Cloud Messaging, your notification permission was temporarily revoked. To re-enable notifications:',
          steps: [
            '1. Click the lock/info icon in your browser address bar',
            '2. Find the notification permission setting',
            '3. Change it from "Block" to "Allow"',
            '4. Refresh this page and try enabling notifications again'
          ],
          alternative: 'Alternatively, you can enable notifications through your browser settings menu.'
        };

        console.log('USER GUIDANCE:', userGuidance);

        return {
          success: false,
          reason: 'firebase-permission-revocation',
          userGuidance,
          requiresManualIntervention: true
        };
      }

      return { success: false, reason: 'no-token' };
    }

    console.log('ensureAndRegisterPushToken: registering token in Firestore...');
    // Register token in Firestore
    await registerPushToken(userId, token, platform, deviceId);
    console.log('ensureAndRegisterPushToken: token registered successfully!');
    return { success: true, token };
  } catch (error) {
    console.error('ensureAndRegisterPushToken error:', error);
    return { success: false, reason: 'error', error };
  } finally {
    // Always reset the debouncing flag
    isRegisteringToken = false;
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

/**
 * Get user-friendly notification status information
 * Returns an object with status details and recommendations
 */
export const getNotificationStatus = async () => {
  try {
    if (!isWeb) {
      return {
        platform: 'native',
        status: 'native-platform',
        message: 'Native platform - notifications handled by Expo'
      };
    }

    const permission = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';
    const isSecureContext = (typeof window !== 'undefined') ? (window as any).isSecureContext : false;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edg');
    const isEdge = userAgent.includes('Edg') || userAgent.includes('Edge');
    const isFirefox = userAgent.includes('Firefox');

    let status = 'unknown';
    let message = '';
    let recommendations: string[] = [];
    let canEnable = false;

    if (permission === 'unsupported') {
      status = 'unsupported';
      message = 'Notifications are not supported in this browser';
      recommendations = ['Try using a modern browser like Chrome, Firefox, or Edge'];
    } else if (permission === 'denied') {
      status = 'blocked';
      message = 'Notifications are blocked by the browser';
      recommendations = [
        'Click the lock/info icon in the address bar',
        'Change notification permission to "Allow"',
        'Refresh the page and try again'
      ];
    } else if (permission === 'default') {
      status = 'not-requested';
      message = 'Notification permission has not been requested yet';
      canEnable = true;
      recommendations = ['Click "Enable Notifications" to allow push notifications'];
    } else if (permission === 'granted') {
      status = 'granted';
      message = 'Notifications are enabled';

      // Check for potential Firebase issues
      if (isChrome || isEdge) {
        message += ' (Note: Chrome/Edge may have Firebase compatibility issues)';
        recommendations = [
          'If notifications don\'t work, try refreshing the page',
          'Some Firebase features may be limited in Chrome/Edge'
        ];
      } else if (isFirefox) {
        message += ' (Firefox detected - generally good Firebase compatibility)';
      }
    }

    // Check service worker status
    let serviceWorkerStatus = 'unknown';
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        serviceWorkerStatus = registration ? 'registered' : 'not-registered';
      } catch (e) {
        serviceWorkerStatus = 'error';
      }
    } else {
      serviceWorkerStatus = 'not-supported';
    }

    return {
      platform: 'web',
      status,
      message,
      permission,
      isSecureContext,
      serviceWorkerStatus,
      browser: {
        isChrome,
        isEdge,
        isFirefox,
        userAgent: userAgent.substring(0, 100) + '...'
      },
      recommendations,
      canEnable,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('getNotificationStatus error:', error);
    return {
      platform: 'web',
      status: 'error',
      message: 'Unable to determine notification status',
      error: String(error)
    };
  }
};

/**
 * Attempt to reset notification permission (useful for testing Firebase bug recovery)
 * Note: This is experimental and may not work in all browsers
 */
export const resetNotificationPermission = async () => {
  try {
    if (!isWeb || typeof Notification === 'undefined') {
      return { success: false, reason: 'not-web-platform' };
    }

    const currentPermission = Notification.permission;
    console.log('resetNotificationPermission: current permission =', currentPermission);

    // If already default, nothing to reset
    if (currentPermission === 'default') {
      return { success: true, message: 'Permission already in default state' };
    }

    // Try to reset by unregistering service worker and clearing any cached permissions
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          if (registration.scope.includes(window.location.origin)) {
            console.log('resetNotificationPermission: unregistering SW:', registration.scope);
            await registration.unregister();
          }
        }
      } catch (swError) {
        console.warn('resetNotificationPermission: error unregistering SW:', swError);
      }
    }

    // Clear any local storage related to notifications
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('notification') || key.includes('firebase') || key.includes('fcm')) {
          localStorage.removeItem(key);
          console.log('resetNotificationPermission: cleared localStorage key:', key);
        }
      });
    } catch (storageError) {
      console.warn('resetNotificationPermission: error clearing localStorage:', storageError);
    }

    return {
      success: true,
      message: 'Reset attempt completed. Refresh the page to see if permission was reset to default.',
      requiresRefresh: true
    };
  } catch (error) {
    console.error('resetNotificationPermission error:', error);
    return { success: false, reason: 'error', error: String(error) };
  }
};

/**
 * Test notification functionality with a simple test notification
 */
export const testNotification = async () => {
  try {
    if (!isWeb) {
      return { success: false, reason: 'not-web-platform' };
    }

    const permission = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';

    if (permission !== 'granted') {
      return {
        success: false,
        reason: 'permission-not-granted',
        message: 'Notification permission not granted. Please enable notifications first.'
      };
    }

    // Create a test notification
    const testNotification = new Notification('BloodBond Test', {
      body: 'This is a test notification to verify your setup is working.',
      icon: '/favicon.png',
      tag: 'bloodbond-test',
      requireInteraction: false
    });

    // Auto-close after 3 seconds
    setTimeout(() => {
      testNotification.close();
    }, 3000);

    return {
      success: true,
      message: 'Test notification sent successfully',
      details: {
        title: 'BloodBond Test',
        body: 'This is a test notification to verify your setup is working.',
        autoClose: '3 seconds'
      }
    };
  } catch (error) {
    console.error('testNotification error:', error);
    return {
      success: false,
      reason: 'error',
      message: 'Failed to send test notification',
      error: String(error)
    };
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

/**
 * Register or upsert a push token for a user.
 * - If a doc exists with same deviceId for the user, update it.
 * - Otherwise if a doc exists with same token, update it.
 * - Otherwise create a new doc.
 *
 * Accepts optional deviceId to dedupe multiple tokens from the same device.
 */
export const registerPushToken = async (userId: string, token: string, platform = 'web', deviceId?: string) => {
  try {
    if (!userId || !token) {
      console.warn('registerPushToken: missing userId or token');
      return;
    }

    console.log('registerPushToken: Starting registration for user:', userId, 'platform:', platform, 'deviceId:', deviceId);

    const userTokensRef = collection(db, 'userTokens');

    // Generate a consistent deviceId for Android if not provided
    let finalDeviceId = deviceId;
    if (!finalDeviceId && isWeb && /Android/i.test(navigator.userAgent)) {
      // Generate a consistent deviceId for Android browsers
      const userAgent = navigator.userAgent;
      const screenInfo = `${screen.width}x${screen.height}`;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      finalDeviceId = btoa(`${userAgent}-${screenInfo}-${timezone}`).substring(0, 32);
      console.log('registerPushToken: Generated Android deviceId:', finalDeviceId);
    }

    // Detect device type and browser
    let deviceType = 'desktop';
    let browserName = 'unknown';

    if (isWeb) {
      const userAgent = navigator.userAgent.toLowerCase();

      // Detect device type
      if (/android/i.test(userAgent)) {
        deviceType = 'mobile';
      } else if (/ipad|iphone|ipod/i.test(userAgent)) {
        deviceType = 'mobile';
      } else if (/tablet/i.test(userAgent) || (/android/i.test(userAgent) && !/mobile/i.test(userAgent))) {
        deviceType = 'tablet';
      } else {
        deviceType = 'desktop';
      }

      // Detect browser
      if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
        browserName = 'chrome';
      } else if (userAgent.includes('firefox')) {
        browserName = 'firefox';
      } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
        browserName = 'safari';
      } else if (userAgent.includes('edg')) {
        browserName = 'edge';
      } else if (userAgent.includes('opera')) {
        browserName = 'opera';
      } else {
        browserName = 'unknown';
      }

      console.log('registerPushToken: Detected device:', deviceType, 'browser:', browserName);
    }

    // First, try to find any existing token for this user/device combination
    let existingDoc = null;
    let updateReason = '';

    // 1. Prefer matching by deviceId when provided (keeps one record per physical device)
    if (finalDeviceId) {
      try {
        console.log('registerPushToken: Searching by deviceId:', finalDeviceId);
        const qByDevice = query(userTokensRef, where('userId', '==', userId), where('deviceId', '==', finalDeviceId));
        const snap = await getDocs(qByDevice);
        if (!snap.empty) {
          existingDoc = snap.docs[0];
          updateReason = 'deviceId';
          console.log('registerPushToken: found existing token by deviceId', existingDoc.id);
        }
      } catch (e) {
        console.warn('registerPushToken: deviceId lookup failed, continuing', e);
      }
    }

    // 2. If no deviceId match, try matching by token to avoid duplicate entries
    if (!existingDoc) {
      try {
        console.log('registerPushToken: Searching by token:', token.substring(0, 20) + '...');
        const qByToken = query(userTokensRef, where('token', '==', token));
        const snapToken = await getDocs(qByToken);
        if (!snapToken.empty) {
          existingDoc = snapToken.docs[0];
          updateReason = 'token';
          console.log('registerPushToken: found existing token by token', existingDoc.id);

          // If we found by token but have a deviceId, update the deviceId
          if (finalDeviceId && !existingDoc.data().deviceId) {
            console.log('registerPushToken: updating deviceId for existing token');
          }
        }
      } catch (e) {
        console.warn('registerPushToken: token lookup failed, continuing', e);
      }
    }

    // 3. If we found an existing document, update it
    if (existingDoc) {
      try {
        const updateData: any = {
          userId,
          token,
          platform,
          active: true,
          updatedAt: Timestamp.now(),
          device: deviceType,
          browser: browserName,
        };

        // Only update deviceId if we have one and it's different
        if (finalDeviceId) {
          updateData.deviceId = finalDeviceId;
        }

        await updateDoc(doc(db, 'userTokens', existingDoc.id), updateData);
        console.log(`registerPushToken: updated existing token doc by ${updateReason}`, existingDoc.id);
        return; // Successfully updated, exit function
      } catch (updateError) {
        console.warn('registerPushToken: failed to update existing doc, will try to create new', updateError);
        // Continue to create new doc if update fails
      }
    }

    // 4. Create new token document only if no existing doc found or update failed
    // But first, do one more check to prevent race conditions
    try {
      console.log('registerPushToken: No existing doc found, checking for race conditions...');

      // Double-check if a document was created by another process
      const finalCheckQuery = finalDeviceId
        ? query(userTokensRef, where('userId', '==', userId), where('deviceId', '==', finalDeviceId))
        : query(userTokensRef, where('token', '==', token));

      const finalCheckSnap = await getDocs(finalCheckQuery);

      if (!finalCheckSnap.empty) {
        // Another process created the document, update it instead
        const existingFinalDoc = finalCheckSnap.docs[0];
        console.log('registerPushToken: Race condition detected, updating existing doc:', existingFinalDoc.id);

        const updateData: any = {
          userId,
          token,
          platform,
          active: true,
          updatedAt: Timestamp.now(),
          device: deviceType,
          browser: browserName,
        };

        if (finalDeviceId) {
          updateData.deviceId = finalDeviceId;
        }

        await updateDoc(doc(db, 'userTokens', existingFinalDoc.id), updateData);
        console.log('registerPushToken: updated document created by another process', existingFinalDoc.id);
        return;
      }

      // No existing document found, create new one
      console.log('registerPushToken: Creating new token document...');
      const newDocData: any = {
        userId,
        token,
        platform,
        createdAt: Timestamp.now(),
        active: true,
        device: deviceType,
        browser: browserName,
      };

      if (finalDeviceId) {
        newDocData.deviceId = finalDeviceId;
      }

      await addDoc(userTokensRef, newDocData);
      console.log('registerPushToken: created new token doc for user', userId, 'device:', deviceType, 'browser:', browserName);
    } catch (createError) {
      console.error('registerPushToken: failed to create new token doc', createError);
      throw createError;
    }

  } catch (error) {
    console.error('Error registering push token:', error);
    throw error;
  }
};

export const unregisterPushToken = async (userId: string, token?: string, deviceId?: string) => {
  try {
    if (!userId || (!token && !deviceId)) {
      console.warn('unregisterPushToken: missing userId or (token|deviceId)');
      return;
    }

    const userTokensRef = collection(db, 'userTokens');

    // Build modular query: prefer deviceId if provided, otherwise token
    let q = query(userTokensRef, where('userId', '==', userId));
    if (deviceId) {
      q = query(userTokensRef, where('userId', '==', userId), where('deviceId', '==', deviceId));
    } else if (token) {
      q = query(userTokensRef, where('userId', '==', userId), where('token', '==', token));
    }

    const snap = await getDocs(q);
    if (snap.empty) {
      console.log('unregisterPushToken: no matching token docs found');
      return;
    }

    for (const d of snap.docs) {
      try {
        await updateDoc(doc(db, 'userTokens', d.id), {
          active: false,
          deactivatedAt: Timestamp.now(),
        });
        console.log('unregisterPushToken: deactivated token doc', d.id);
      } catch (e) {
        console.warn('unregisterPushToken: failed to deactivate token doc', d.id, e);
      }
    }
  } catch (error) {
    console.error('unregisterPushToken error:', error);
  }
};

// Get OAuth 2.0 access token for FCM HTTP v1 API
const getFCMAccessToken = async () => {
  try {
    // For client-side usage, we'll use a simplified approach
    // In production, this should be done server-side with proper service account credentials

    // Check if we have service account credentials in environment
    const serviceAccountKey = process.env.EXPO_PUBLIC_FCM_SERVICE_ACCOUNT_KEY ||
                             process.env.FCM_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
      console.warn('FCM service account key not found, falling back to browser notifications');
      return null;
    }

    // Parse the service account JSON
    const serviceAccount = JSON.parse(serviceAccountKey);

    // Create JWT for OAuth 2.0
    const jwtHeader = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600, // 1 hour
      iat: now
    };

    // Note: In a real implementation, you'd need to sign this JWT with the private key
    // For now, we'll use a simplified approach for testing
    console.log('FCM OAuth token generation would happen here');

    return null; // Return null to trigger fallback
  } catch (error) {
    console.error('Error getting FCM access token:', error);
    return null;
  }
};

// Send FCM message using HTTP v1 API (modern approach)
const sendFCMMessage = async (token: string, title: string, body: string, data?: any) => {
  try {
    console.log('Attempting to send FCM message to token:', token.substring(0, 20) + '...');

    // Try to get OAuth access token first (modern approach)
    const accessToken = await getFCMAccessToken();

    if (accessToken) {
      // Use FCM HTTP v1 API (modern)
      const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'bloodbond-892f7';
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

      const messagePayload = {
        message: {
          token: token,
          notification: {
            title,
            body,
          },
          webpush: {
            headers: {
              Urgency: 'high'
            },
            notification: {
              icon: '/favicon.png',
              badge: '/favicon.png',
              requireInteraction: true,
            }
          },
          data: data || {}
        }
      };

      console.log('Sending FCM HTTP v1 message with payload:', {
        to: token.substring(0, 20) + '...',
        title,
        body,
        hasData: !!data
      });

      const response = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      const responseData = await response.json();
      console.log('FCM HTTP v1 response:', {
        status: response.status,
        success: response.ok,
        name: responseData?.name,
        error: responseData?.error
      });

      if (response.ok) {
        console.log('FCM HTTP v1 message sent successfully');
        return { success: true, messageId: responseData?.name };
      } else {
        console.error('FCM HTTP v1 send failed:', responseData);
        return { success: false, error: responseData };
      }
    } else {
      // Fallback: Use legacy API if available (deprecated but still works)
      const serverKey = process.env.EXPO_PUBLIC_FCM_SERVER_KEY || process.env.FCM_SERVER_KEY;

      if (serverKey) {
        console.log('Using legacy FCM API as fallback');

        const fcmUrl = 'https://fcm.googleapis.com/fcm/send';
        const messagePayload = {
          to: token,
          notification: {
            title,
            body,
            icon: '/favicon.png',
            // Prefer explicit SEND_ORIGIN env var for production builds (EXPO_PUBLIC_SEND_ORIGIN supported).
            click_action: (typeof process !== 'undefined' && (process.env.SEND_ORIGIN || (process.env as any).EXPO_PUBLIC_SEND_ORIGIN))
              ? (process.env.SEND_ORIGIN || (process.env as any).EXPO_PUBLIC_SEND_ORIGIN)
              : 'https://bloodbond.app',
          },
          data: data || {},
          webpush: {
            headers: {
              Urgency: 'high'
            },
            notification: {
              icon: '/favicon.png',
              badge: '/favicon.png',
              requireInteraction: true,
            }
          }
        };

        const response = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `key=${serverKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messagePayload),
        });

        const responseData = await response.json();
        console.log('FCM Legacy response:', {
          status: response.status,
          success: response.ok,
          messageId: responseData?.results?.[0]?.message_id,
          error: responseData?.results?.[0]?.error
        });

        if (response.ok) {
          console.log('FCM Legacy message sent successfully');
          return { success: true, messageId: responseData?.results?.[0]?.message_id };
        }
      }

      // Final fallback: Browser notification
      console.log('Falling back to browser notification');

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, {
            body: body,
            icon: '/favicon.png',
            data: data || {},
            tag: `bloodbond-${Date.now()}`,
          });

          setTimeout(() => {
            notification.close();
          }, 5000);

          console.log('Browser notification shown as final fallback');
          return { success: true, method: 'browser-fallback' };
        } catch (browserError) {
          console.warn('Browser notification fallback failed:', browserError);
          return { success: false, error: browserError };
        }
      }

      return { success: false, error: 'No FCM credentials available and browser notifications not permitted' };
    }
  } catch (error) {
    console.error('Error sending FCM message:', error);
    return { success: false, error };
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

    // Check user's tokens to determine notification strategy
    const userTokensRef = collection(db, 'userTokens');
    const qAll = query(userTokensRef, where('userId', '==', userId), where('active', '==', true), orderBy('createdAt', 'desc'));
    const snapshotAll = await getDocs(qAll);

    const realTokens = snapshotAll.docs.filter(doc => {
      const token = doc.data().token;
      return token !== 'browser-direct-notification' && token !== 'ios-safari-fallback';
    });

    const fallbackTokens = snapshotAll.docs.filter(doc =>
      doc.data().token === 'browser-direct-notification' ||
      doc.data().token === 'ios-safari-fallback'
    );

    console.log('sendPushNotification: Token analysis - Real tokens:', realTokens.length, 'Fallback tokens:', fallbackTokens.length);

    // Determine notification strategy to prevent duplicates
    let notificationSent = false;

    // Strategy 1: If user has real FCM tokens, use server API ONLY
    if (realTokens.length > 0 && !notificationSent) {
      try {
        // Prefer explicit SEND_ORIGIN env var (EXPO_PUBLIC_SEND_ORIGIN supported).
        // Never rely on window.location.origin to avoid using a local dev origin (localhost).
        const envSendOrigin = (typeof process !== 'undefined' && (process.env.SEND_ORIGIN || (process.env as any).EXPO_PUBLIC_SEND_ORIGIN))
          ? (process.env.SEND_ORIGIN || (process.env as any).EXPO_PUBLIC_SEND_ORIGIN)
          : null;
        const apiOrigin = envSendOrigin || 'https://bloodbond.app';

        console.log('sendPushNotification: Sending via FCM API to real tokens only');
        const response = await fetch(`${apiOrigin}/api/sendNotification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'user',
            userId,
            title,
            body,
            data: data || {},
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('sendPushNotification: FCM API send successful:', result);
          notificationSent = true; // Mark as sent to prevent duplicates

          // Add Android-specific delay to prevent race conditions
          if (isWeb && /Android/i.test(navigator.userAgent)) {
            console.log('sendPushNotification: Android detected, adding delay to prevent duplicates');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay for Android
          }
        } else {
          console.warn('sendPushNotification: FCM API send failed with status:', response.status);
          const errorText = await response.text();
          console.warn('sendPushNotification: FCM API error response:', errorText);
        }
      } catch (apiError) {
        console.warn('sendPushNotification: FCM API send failed with exception:', apiError);
        // Don't fall back to browser notification here - let it try other strategies
      }
    }

    // Strategy 2: If FCM API failed or no real tokens, try fallback tokens
    if (!notificationSent && fallbackTokens.length > 0) {
      console.log('sendPushNotification: Using fallback tokens for browser notification');
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, {
            body: body,
            icon: '/favicon.png',
            data: data || {},
            tag: `bloodbond-${Date.now()}`,
          });
          setTimeout(() => notification.close(), 5000);
          console.log('sendPushNotification: Browser notification shown for fallback tokens');
          notificationSent = true; // Mark as sent
        } catch (browserError) {
          console.warn('sendPushNotification: Browser notification failed:', browserError);
        }
      } else {
        console.warn('sendPushNotification: Browser notification permission not granted for fallback tokens');
      }
    }

    // Strategy 3: If still not sent and we have permission, show browser notification as last resort
    if (!notificationSent && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        console.log('sendPushNotification: Last resort - showing browser notification');
        const notification = new Notification(title, {
          body: body,
          icon: '/favicon.png',
          data: data || {},
          tag: `bloodbond-${Date.now()}`,
        });
        setTimeout(() => notification.close(), 5000);
        console.log('sendPushNotification: Browser notification shown as last resort');
        notificationSent = true;
      } catch (browserError) {
        console.warn('sendPushNotification: Last resort browser notification also failed:', browserError);
      }
    }

    // Strategy 4: No notification could be sent
    if (!notificationSent) {
      console.log('sendPushNotification: No notification method available - notification stored but cannot be delivered');
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

      // Test service worker communication
      try {
        console.log('initializeNotifications: Testing service worker communication...');
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration('/');
          if (registration) {
            console.log('initializeNotifications: Service worker registration found:', registration.scope);

            // Test communication with service worker
            const channel = new MessageChannel();
            channel.port1.onmessage = (event) => {
              console.log('initializeNotifications: Service worker responded:', event.data);
            };

            registration.active?.postMessage({ type: 'ping' }, [channel.port2]);
            console.log('initializeNotifications: Ping sent to service worker');
          } else {
            console.warn('initializeNotifications: No service worker registration found');
          }
        }
      } catch (swTestError) {
        console.warn('initializeNotifications: Service worker test failed:', swTestError);
      }

      // Following Firebase docs: Initialize messaging first, then set up message handler
      const messaging = getMessaging();

      try {
        // Set up foreground message handler as per Firebase documentation
        onMessage(messaging, (payload) => {
          console.log('FCM message received in foreground:', payload);
          try {
            // For web platforms, all FCM messages should be handled by the service worker to avoid duplicates
            // The foreground handler should not show notifications for web messages
            console.log('initializeNotifications: foreground message received, but letting service worker handle all web notifications');

            // Add fallback: If service worker doesn't handle the message within 3 seconds, show it ourselves
            setTimeout(async () => {
              console.log('initializeNotifications: Checking if service worker handled the message...');

              // Check if we can show a fallback notification
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                try {
                  // Extract notification data
                  const notif = payload.notification || null;
                  const data = payload.data || {};

                  let title = 'BloodBond';
                  let body = '';

                  if (notif) {
                    title = notif.title || 'BloodBond';
                    body = notif.body || '';
                  } else {
                    title = data._title || data.title || 'BloodBond';
                    body = data._body || data.body || '';
                  }

                  console.log('initializeNotifications: Service worker may have failed, showing fallback notification');

                  // Extract image from payload data
                  const imageUrl = data.image || notif?.image;

                  const notificationOptions: any = {
                    body: body,
                    icon: '/favicon.png',
                    data: data,
                    tag: `bloodbond-fallback-${Date.now()}`,
                    requireInteraction: true
                  };

                  // Add image if available
                  if (imageUrl) {
                    notificationOptions.image = imageUrl;
                    console.log('initializeNotifications: Adding image to fallback notification:', imageUrl);
                  }

                  const fallbackNotification = new Notification(title, notificationOptions);

                  // Auto-close after 10 seconds
                  setTimeout(() => {
                    fallbackNotification.close();
                  }, 10000);

                  console.log('initializeNotifications: Fallback notification shown successfully');
                } catch (fallbackError) {
                  console.error('initializeNotifications: Fallback notification failed:', fallbackError);
                }
              } else {
                console.log('initializeNotifications: Cannot show fallback - permission not granted');
              }
            }, 3000); // Wait 3 seconds for service worker to handle

            return; // Always let service worker handle notifications for web platform
          } catch (e) {
            console.error('initializeNotifications: onMessage handler error', e);
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
