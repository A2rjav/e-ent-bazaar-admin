import * as Location from 'expo-location';
import APP_CONFIG, { isGoogleMapsConfigured } from '../lib/config';

// Note: This requires Google Maps API key to be configured
// For mobile app, we'll use expo-location for GPS and Google Maps API for geocoding

export async function geocodeAddress(address: string): Promise<{ latitude: number, longitude: number } | null> {
  try {
    // Use Google Maps Geocoding API
    const apiKey = APP_CONFIG.GOOGLE_MAPS_API_KEY;
    if (!isGoogleMapsConfigured()) {
      console.warn('Google Maps API key not configured in config file');
      return null;
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error in geocodeAddress:", error);
    return null;
  }
}

// Get current location using device GPS
export async function getCurrentLocation(): Promise<{ latitude: number, longitude: number } | null> {
  try {
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('Location permission denied');
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error("Error getting current location:", error);
    return null;
  }
}

// Get location from coordinates (reverse geocoding)
export async function getAddressFromCoordinates(
  latitude: number, 
  longitude: number
): Promise<string | null> {
  try {
    const apiKey = APP_CONFIG.GOOGLE_MAPS_API_KEY;
    if (!isGoogleMapsConfigured()) {
      console.warn('Google Maps API key not configured in config file');
      return null;
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    
    return null;
  } catch (error) {
    console.error("Error in getAddressFromCoordinates:", error);
    return null;
  }
} 