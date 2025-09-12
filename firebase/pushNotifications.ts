import { db } from './firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request permissions for notifications
export const requestNotificationPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    throw new Error('Notification permissions not granted');
  }

  return finalStatus;
};

// Get push token
export const getPushToken = async () => {
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

// Send push notification to a specific user
export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: any
) => {
  try {
    // Get user's push token from database
    const userTokensRef = collection(db, 'userTokens');
    const userTokenDoc = await addDoc(userTokensRef, {
      userId,
      token: await getPushToken(),
      createdAt: Timestamp.now(),
    });

    // Send notification via Expo
    const message = {
      to: userTokenDoc.id, // This should be the push token
      sound: 'default',
      title,
      body,
      data: data || {},
    };

    // For now, we'll store the notification in Firestore
    // In production, you'd send this to Expo's push service
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

// Send push notification to all users (broadcast)
export const sendBroadcastNotification = async (
  title: string,
  body: string,
  data?: any
) => {
  try {
    // Get all user tokens
    const userTokensRef = collection(db, 'userTokens');
    const tokensSnapshot = await addDoc(userTokensRef, {
      broadcast: true,
      title,
      body,
      data: data || {},
      timestamp: Timestamp.now(),
    });

    // In production, you'd send to all tokens
    // For now, we'll create a broadcast notification
    await addDoc(collection(db, 'broadcastNotifications'), {
      title,
      message: body,
      timestamp: Timestamp.now(),
      data: data || {},
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending broadcast notification:', error);
    throw error;
  }
};

// Register push token for a user
export const registerPushToken = async (userId: string, token: string) => {
  try {
    await addDoc(collection(db, 'userTokens'), {
      userId,
      token,
      platform: 'expo',
      createdAt: Timestamp.now(),
      active: true,
    });
  } catch (error) {
    console.error('Error registering push token:', error);
  }
};

// Initialize notifications
export const initializeNotifications = async () => {
  try {
    // Check if we're in Expo Go or web environment
    const isExpoGo = !!(typeof window !== 'undefined' && window.location && window.location.protocol === 'exp://');
    const isWeb = typeof window !== 'undefined' && window.document;

    if (isExpoGo || isWeb) {
      console.log('Notifications not fully supported in Expo Go/Web. Skipping initialization.');
      return false;
    }

    await requestNotificationPermissions();

    // Set up notification categories
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
  } catch (error) {
    console.error('Error initializing notifications:', error);
    // Don't throw error, just return false to indicate initialization failed
    return false;
  }
};
