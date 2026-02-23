import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import APP_CONFIG, { isSupabaseConfigured } from './config';

// You may want to define your Database type if you have it
// import type { Database } from '../types/supabase';

// Prioritize config file values, fallback to app.config.js
const supabaseUrl = APP_CONFIG.SUPABASE_URL || Constants.expoConfig?.extra?.SUPABASE_URL;
const supabaseAnonKey = APP_CONFIG.SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.SUPABASE_ANON_KEY;

// Check if we have valid credentials
if (!isSupabaseConfigured()) {
  console.warn('⚠️ Supabase credentials not configured. Please update the config file with your actual Supabase credentials.');
}

console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Supabase Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...');

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'supabase.auth.token',
    },
    global: {
      headers: {
        "Content-Type": "application/json",
      },
    },
  }
);

// Helper function to check if Supabase connection is working
export const checkSupabaseConnection = async (
  table: string = "endcustomers",
): Promise<boolean> => {
  try {
    // Check configuration first
    if (!isSupabaseConfigured()) {
      console.error("Supabase configuration not set up properly");
      return false;
    }

    console.log('🔍 Testing Supabase connection...');
    const { data, error } = await supabase.from(table).select("id").limit(1);
    if (error) {
      console.error(
        `Supabase connection check failed for table ${table}:`,
        error,
      );
      return false;
    }
    console.log(`✅ Supabase connection successful for table ${table}`);
    return true;
  } catch (err) {
    console.error(
      `❌ Supabase connection check exception for table ${table}:`,
      err,
    );
    return false;
  }
};

// Test database connection on module load
checkSupabaseConnection().then((isConnected) => {
  if (isConnected) {
    console.log("✅ Supabase connection verified");
  } else {
    console.warn("⚠️ Supabase connection failed - check your configuration");
  }
}); 