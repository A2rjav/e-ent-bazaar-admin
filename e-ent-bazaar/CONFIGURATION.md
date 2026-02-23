# App Configuration Guide

## Overview
This app now uses a centralized configuration file instead of environment variables for better build compatibility and easier management.

## Configuration File
All configuration is now managed in `lib/config.ts`. This file contains all the necessary API keys, URLs, and app settings.

## Required Configuration

### 1. Supabase Configuration ✅ CONFIGURED
These values are already configured in `lib/config.ts`:

```typescript
SUPABASE_URL: "https://your-project.supabase.co",
SUPABASE_ANON_KEY: "your-actual-supabase-anon-key",
```

### 2. Google Maps API Configuration ✅ CONFIGURED
This value is already configured in `lib/config.ts`:

```typescript
GOOGLE_MAPS_API_KEY: "your-actual-google-maps-api-key",
```

### 3. App Configuration ✅ CONFIGURED
These values are already set:

```typescript
APP_NAME: "Bhatta Mitra",
APP_VERSION: "1.0.1",
APP_SCHEME: "bhattamitra",
```

## Current Status

✅ **Supabase**: Configured and ready to use  
✅ **Google Maps**: Configured and ready to use  
✅ **App Settings**: Configured and ready to use  

## Benefits of This Approach

1. **Build Compatibility**: Configuration is included in the app bundle, so it works in production builds
2. **No Environment Variables**: No need to manage `.env` files or environment variables
3. **Type Safety**: Full TypeScript support for configuration values
4. **Centralized Management**: All configuration in one place
5. **Easy Updates**: Just update the config file and rebuild

## Security Notes

⚠️ **Important**: Since these values are now in the source code, they will be visible in the app bundle. For production apps, consider:

1. Using different API keys for development and production
2. Implementing proper API key restrictions in your service providers
3. Using server-side authentication where possible

## Migration from Environment Variables

If you were previously using environment variables, you can now remove:
- `.env` files
- `EXPO_PUBLIC_*` environment variables
- References to `process.env` in your code

## Helper Functions

The config file includes helper functions:

```typescript
import { isSupabaseConfigured, isGoogleMapsConfigured } from './lib/config';

// Check if services are properly configured
if (!isSupabaseConfigured()) {
  console.warn('Supabase not configured');
}

if (!isGoogleMapsConfigured()) {
  console.warn('Google Maps not configured');
}
```

## Build Process

When building your Expo app:
1. ✅ Configuration values are already set in `lib/config.ts`
2. Run your build command
3. The configuration will be included in the app bundle

No additional environment variable setup is required!

## Testing Configuration

You can test if your configuration is working by checking the console logs when the app starts. You should see:
- "✅ Supabase connection verified" if Supabase is working
- No warnings about missing API keys 