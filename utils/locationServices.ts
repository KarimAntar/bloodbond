import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface BloodRequestLocation extends LocationData {
  city: string;
  hospital: string;
  address?: string;
}

// Request location permissions
export const requestLocationPermissions = async (): Promise<boolean> => {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus === 'granted') {
      // Also request background permissions for notifications
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      return backgroundStatus === 'granted';
    }
    
    return false;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
};

// Check if location permissions are granted
export const checkLocationPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking location permissions:', error);
    return false;
  }
};

// Get current location
export const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    const hasPermission = await checkLocationPermissions();
    if (!hasPermission) {
      const granted = await requestLocationPermissions();
      if (!granted) {
        return null;
      }
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: true,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || undefined,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
};

// Calculate distance between two points using Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

// Convert degrees to radians
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

// Check if a location is within a specified radius of another location
export const isWithinRadius = (
  userLocation: LocationData,
  requestLocation: LocationData,
  radiusKm: number = 10 // Default 10km radius
): boolean => {
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    requestLocation.latitude,
    requestLocation.longitude
  );
  
  return distance <= radiusKm;
};

// Get address from coordinates (reverse geocoding)
export const getAddressFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  try {
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (addresses && addresses.length > 0) {
      const address = addresses[0];
      const addressParts = [
        address.street,
        address.district,
        address.city,
        address.region,
      ].filter(Boolean);
      
      return addressParts.join(', ');
    }
    
    return null;
  } catch (error) {
    console.error('Error getting address from coordinates:', error);
    return null;
  }
};

// Get coordinates from address (geocoding)
export const getCoordinatesFromAddress = async (
  address: string
): Promise<LocationData | null> => {
  try {
    const locations = await Location.geocodeAsync(address);
    
    if (locations && locations.length > 0) {
      const location = locations[0];
      return {
        latitude: location.latitude,
        longitude: location.longitude,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting coordinates from address:', error);
    return null;
  }
};

// Format distance for display
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km away`;
  } else {
    return `${Math.round(distanceKm)}km away`;
  }
};

// City coordinates mapping for Egypt (approximate centers)
export const CITY_COORDINATES: Record<string, LocationData> = {
  'Cairo': { latitude: 30.0444, longitude: 31.2357 },
  'Alexandria': { latitude: 31.2001, longitude: 29.9187 },
  'Giza': { latitude: 30.0131, longitude: 31.2089 },
  'Shubra El Kheima': { latitude: 30.1288, longitude: 31.2444 },
  'Port Said': { latitude: 31.2653, longitude: 32.3019 },
  'Suez': { latitude: 29.9668, longitude: 32.5498 },
  'Luxor': { latitude: 25.6872, longitude: 32.6396 },
  'Aswan': { latitude: 24.0889, longitude: 32.8998 },
  'Asyut': { latitude: 27.1809, longitude: 31.1837 },
  'Ismailia': { latitude: 30.5965, longitude: 32.2715 },
  'Faiyum': { latitude: 29.3084, longitude: 30.8428 },
  'Zagazig': { latitude: 30.5947, longitude: 31.5582 },
  'Ashmoun': { latitude: 30.2975, longitude: 30.9772 },
  'Minya': { latitude: 28.0871, longitude: 30.7618 },
  'Damanhur': { latitude: 31.0341, longitude: 30.4682 },
  'Beni Suef': { latitude: 29.0661, longitude: 31.0994 },
  'Hurghada': { latitude: 27.2574, longitude: 33.8129 },
  'Qena': { latitude: 26.1551, longitude: 32.7160 },
  'Sohag': { latitude: 26.5569, longitude: 31.6948 },
  'Shibin El Kom': { latitude: 30.5594, longitude: 31.0118 },
};

// Get coordinates for a city
export const getCityCoordinates = (city: string): LocationData | null => {
  return CITY_COORDINATES[city] || null;
};
