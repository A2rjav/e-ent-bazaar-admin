// App Configuration
// This file contains all the configuration constants for the app
// For production, use environment variables or build-time configuration

// Get environment variables (these will be undefined in development builds)
const getEnvVar = (key: string): string | undefined => {
  // In Expo, we can access environment variables through Constants
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

const APP_CONFIG = {
  // Supabase Configuration
  // In production, these should come from environment variables
  SUPABASE_URL: "https://fuctxlhyxjdkyazzimot.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y3R4bGh5eGpka3lhenppbW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NjY1MzMsImV4cCI6MjA2MTA0MjUzM30.wO67-jJCHly_q2eKRYdEHbic3ynhD90cCIY_u3ZWj3A",
  
  // Google Maps API Configuration
  // In production, this should come from environment variables
  GOOGLE_MAPS_API_KEY: "AIzaSyDrcPEKfZtOwLGOmm3wLu9Kk5MPPXiS-hQ",
  
  // App Configuration
  APP_NAME: "E-Ent Bazaar",
  APP_VERSION: "1.0.1",
  APP_SCHEME: "bhattamitra",

  // Demo Login Configuration
  DEMO_LOGIN_PHONE: getEnvVar('DEMO_LOGIN_PHONE') || '9876543210',
  DEMO_LOGIN_OTP: getEnvVar('DEMO_LOGIN_OTP') || '123456',
  DEMO_CUSTOMER_ID: getEnvVar('DEMO_CUSTOMER_ID') || '',
  
  // Development Configuration
  IS_DEVELOPMENT: __DEV__,
  DEBUG_MODE: __DEV__,
};

export default APP_CONFIG;

// Helper function to get config value with fallback
export const getConfig = (key: keyof typeof APP_CONFIG, fallback?: string): string | boolean => {
  return APP_CONFIG[key] || fallback || '';
};

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  const isConfigured = APP_CONFIG.SUPABASE_URL !== "https://your-project.supabase.co" && 
         APP_CONFIG.SUPABASE_ANON_KEY !== "your-anon-key";
  
  if (__DEV__) {
    console.log('🔧 Config check - Supabase URL:', APP_CONFIG.SUPABASE_URL);
    console.log('🔧 Config check - Supabase Key (first 20 chars):', APP_CONFIG.SUPABASE_ANON_KEY?.substring(0, 20) + '...');
    console.log('🔧 Config check - isSupabaseConfigured:', isConfigured);
  }
  
  return isConfigured;
};

// Helper function to check if Google Maps is configured
export const isGoogleMapsConfigured = (): boolean => {
  return APP_CONFIG.GOOGLE_MAPS_API_KEY !== "your-google-maps-api-key";
}; 