import { db } from '../firebase/firebaseConfig';
import { collection, addDoc, Timestamp, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { sendPushNotification } from '../firebase/pushNotifications';
import { getCurrentLocation, isWithinRadius, formatDistance, LocationData } from './locationServices';

// Default notification radius in kilometers
const DEFAULT_RADIUS_KM = 10;

// Interface for blood request with location
interface BloodRequestWithLocation {
  id: string;
  userId: string;
  fullName: string;
  bloodType: string;
  city: string;
  hospital: string;
  urgent: boolean;
  location?: LocationData;
  createdAt: any;
  status: string;
}

// Interface for user with location preferences
interface UserLocationPreferences {
  userId: string;
  enableLocationNotifications: boolean;
  notificationRadius: number;
  location?: LocationData;
  lastLocationUpdate?: any;
}

// Check for nearby blood requests for a specific user
export const checkNearbyBloodRequests = async (
  userId: string,
  userLocation: LocationData,
  radiusKm: number = DEFAULT_RADIUS_KM
): Promise<BloodRequestWithLocation[]> => {
  try {
    // Query active blood requests from other users
    const requestsQuery = query(
      collection(db, 'requests'),
      where('status', '==', 'active'),
      where('userId', '!=', userId) // Don't notify about own requests
    );

    const requestsSnapshot = await getDocs(requestsQuery);
    const nearbyRequests: BloodRequestWithLocation[] = [];

    requestsSnapshot.forEach((doc) => {
      const requestData = doc.data() as BloodRequestWithLocation;
      const request = { ...requestData, id: doc.id };

      // Check if request has location data
      if (request.location) {
        const isNearby = isWithinRadius(
          userLocation,
          request.location,
          radiusKm
        );

        if (isNearby) {
          nearbyRequests.push(request);
        }
      }
    });

    return nearbyRequests;
  } catch (error) {
    console.error('Error checking nearby blood requests:', error);
    return [];
  }
};

// Send notification for a nearby blood request
export const sendNearbyBloodRequestNotification = async (
  userId: string,
  request: BloodRequestWithLocation,
  userLocation: LocationData
): Promise<boolean> => {
  try {
    if (!request.location) return false;

    const distance = formatDistance(
      Math.sqrt(
        Math.pow(userLocation.latitude - request.location.latitude, 2) +
        Math.pow(userLocation.longitude - request.location.longitude, 2)
      ) * 111 // Rough conversion to kilometers
    );

    const title = `Blood Request Near You 🩸`;
    const body = `${request.bloodType} blood needed ${distance} - ${request.hospital}, ${request.city}${request.urgent ? ' (URGENT)' : ''}`;

    // Send push notification
    await sendPushNotification(userId, title, body, {
      type: 'nearby_blood_request',
      requestId: request.id,
      bloodType: request.bloodType,
      urgent: request.urgent,
      distance: distance,
      hospital: request.hospital,
      city: request.city,
    });

    // Create notification record in database
    await addDoc(collection(db, 'notifications'), {
      userId,
      type: 'nearby_blood_request',
      title,
      message: body,
      timestamp: Timestamp.now(),
      read: false,
      data: {
        requestId: request.id,
        bloodType: request.bloodType,
        urgent: request.urgent,
        distance: distance,
        hospital: request.hospital,
        city: request.city,
      },
    });

    return true;
  } catch (error) {
    console.error('Error sending nearby blood request notification:', error);
    return false;
  }
};

// Update user's location for proximity notifications
export const updateUserLocationForNotifications = async (
  userId: string,
  location: LocationData,
  enableNotifications: boolean = true,
  radiusKm: number = DEFAULT_RADIUS_KM
): Promise<void> => {
  try {
    const userLocationData: UserLocationPreferences = {
      userId,
      enableLocationNotifications: enableNotifications,
      notificationRadius: radiusKm,
      location,
      lastLocationUpdate: Timestamp.now(),
    };

    // Store user location preferences
    await addDoc(collection(db, 'userLocationPreferences'), userLocationData);

    // If notifications are enabled, check for nearby requests immediately
    if (enableNotifications) {
      const nearbyRequests = await checkNearbyBloodRequests(userId, location, radiusKm);
      
      // Send notifications for any nearby requests
      for (const request of nearbyRequests) {
        await sendNearbyBloodRequestNotification(userId, request, location);
      }
    }
  } catch (error) {
    console.error('Error updating user location for notifications:', error);
  }
};

// Listen for new blood requests and notify nearby users
export const startProximityNotificationListener = () => {
  try {
    const requestsQuery = query(
      collection(db, 'requests'),
      where('status', '==', 'active')
    );

    return onSnapshot(requestsQuery, async (snapshot) => {
      // Check for new requests
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const request = { 
            ...change.doc.data() as BloodRequestWithLocation, 
            id: change.doc.id 
          };

          // If the request has location data, find nearby users
          if (request.location) {
            await notifyNearbyUsers(request);
          }
        }
      });
    });
  } catch (error) {
    console.error('Error starting proximity notification listener:', error);
    return null;
  }
};

// Notify users near a new blood request
const notifyNearbyUsers = async (request: BloodRequestWithLocation): Promise<void> => {
  try {
    if (!request.location) return;

    // Get all users with location preferences enabled
    const usersQuery = query(
      collection(db, 'userLocationPreferences'),
      where('enableLocationNotifications', '==', true),
      where('userId', '!=', request.userId) // Don't notify the request creator
    );

    const usersSnapshot = await getDocs(usersQuery);

    // Check each user's proximity to the request
    usersSnapshot.forEach(async (userDoc) => {
      const userData = userDoc.data() as UserLocationPreferences;

      if (userData.location && request.location) {
        const isNearby = isWithinRadius(
          userData.location,
          request.location,
          userData.notificationRadius
        );

        if (isNearby) {
          await sendNearbyBloodRequestNotification(
            userData.userId,
            request,
            userData.location
          );
        }
      }
    });
  } catch (error) {
    console.error('Error notifying nearby users:', error);
  }
};

// Initialize proximity notifications for a user
export const initializeProximityNotifications = async (userId: string): Promise<void> => {
  try {
    // Get user's current location
    const location = await getCurrentLocation();
    
    if (location) {
      // Update user location and enable notifications
      await updateUserLocationForNotifications(userId, location);
      
      console.log('Proximity notifications initialized for user:', userId);
    } else {
      console.log('Could not initialize proximity notifications - location unavailable');
    }
  } catch (error) {
    console.error('Error initializing proximity notifications:', error);
  }
};

// Disable proximity notifications for a user
export const disableProximityNotifications = async (userId: string): Promise<void> => {
  try {
    // Update user preferences to disable notifications
    await addDoc(collection(db, 'userLocationPreferences'), {
      userId,
      enableLocationNotifications: false,
      lastLocationUpdate: Timestamp.now(),
    });

    console.log('Proximity notifications disabled for user:', userId);
  } catch (error) {
    console.error('Error disabling proximity notifications:', error);
  }
};

// Get user's current proximity notification settings
export const getProximityNotificationSettings = async (
  userId: string
): Promise<UserLocationPreferences | null> => {
  try {
    const settingsQuery = query(
      collection(db, 'userLocationPreferences'),
      where('userId', '==', userId)
    );

    const settingsSnapshot = await getDocs(settingsQuery);

    if (!settingsSnapshot.empty) {
      // Get the most recent settings
      const settings = settingsSnapshot.docs
        .map(doc => doc.data() as UserLocationPreferences)
        .sort((a, b) => b.lastLocationUpdate?.toMillis() - a.lastLocationUpdate?.toMillis());

      return settings[0];
    }

    return null;
  } catch (error) {
    console.error('Error getting proximity notification settings:', error);
    return null;
  }
};
