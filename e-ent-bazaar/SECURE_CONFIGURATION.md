# Secure Configuration Guide

## 🔒 Security Overview

This app now supports secure configuration for both development and production environments. API keys are no longer hardcoded in the source code.

## 🛡️ How It Works

### Development Environment
- Uses fallback values from `lib/config.ts` for quick development
- These values are **NOT** secure and should only be used for development

### Production Environment
- Uses environment variables for all sensitive data
- Environment variables are injected at build time
- No sensitive data in source code

## 📁 File Structure

```
bhatta-mitra/
├── .env                    # ⚠️ NEVER commit this file (contains real keys)
├── .env.example           # ✅ Safe to commit (contains example values)
├── lib/config.ts          # ✅ Safe to commit (contains fallbacks only)
└── app.config.js          # ✅ Safe to commit (contains fallbacks only)
```

## 🚀 Setup Instructions

### 1. Create Environment File

Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env

# Or create manually
touch .env
```

### 2. Add Your Real API Keys

Edit `.env` with your actual values:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-supabase-anon-key

# Google Maps API Key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-actual-google-maps-api-key
```

### 3. Verify .gitignore

Make sure `.env` is in your `.gitignore`:

```gitignore
# local env files
.env
.env*.local
```

## 🔧 Build Configuration

### Development Build
```bash
npx expo start
# Uses .env file if available, otherwise uses fallbacks
```

### Production Build
```bash
# Set environment variables before building
export EXPO_PUBLIC_SUPABASE_URL="your-production-url"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="your-production-key"
export EXPO_PUBLIC_GOOGLE_MAPS_API_KEY="your-production-key"

# Build the app
eas build --platform all
```

### EAS Build (Recommended)
For EAS builds, you can set environment variables in your `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "your-production-url",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-production-key",
        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "your-production-key"
      }
    }
  }
}
```

## 🔍 Verification

### Check Configuration
The app will log configuration status in development:

```
🔧 Config check - isSupabaseConfigured: true
🔧 Supabase URL: https://your-project.supabase.co
✅ Supabase connection verified
```

### Test Environment Variables
You can test if environment variables are working:

```typescript
import { getConfig } from './lib/config';

console.log('Supabase URL:', getConfig('SUPABASE_URL'));
```

## 🚨 Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] `.env` file contains real API keys
- [ ] `.env.example` contains placeholder values only
- [ ] No API keys in `lib/config.ts` (only fallbacks)
- [ ] No API keys in `app.config.js` (only fallbacks)
- [ ] Environment variables set for production builds

## 🔄 Migration from Hardcoded Keys

If you previously had hardcoded keys:

1. **Remove hardcoded keys** from `lib/config.ts`
2. **Create `.env` file** with real values
3. **Update `.gitignore`** to exclude `.env`
4. **Test the app** to ensure it works
5. **Commit the changes** (without `.env`)

## 🆘 Troubleshooting

### "API key not found" error
- Check if `.env` file exists
- Verify environment variable names start with `EXPO_PUBLIC_`
- Restart the development server after creating `.env`

### Build fails in production
- Ensure environment variables are set before building
- Check EAS build configuration
- Verify variable names match exactly

### Development works but production doesn't
- Production builds require environment variables
- Development can use fallback values
- Set up EAS build environment variables

## 📞 Support

If you need help with configuration:
1. Check this guide first
2. Verify your `.env` file format
3. Test with a simple environment variable
4. Check Expo documentation for environment variables 