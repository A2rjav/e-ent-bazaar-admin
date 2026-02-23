# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## 🔒 Secure Configuration

This app uses environment variables for secure configuration. API keys are **NOT** hardcoded in the source code.

### Quick Setup

1. **Set up environment structure:**
   ```bash
   node setup-env.js
   ```

2. **Add your API keys:**
   ```bash
   node add-keys.js
   ```
   
   Or manually edit the `.env` file with your actual API keys.

### Manual Setup

1. Create a `.env` file in the root directory
2. Add your API keys:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Maps API Key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

3. Ensure `.env` is in your `.gitignore`

### Security Features

✅ **Development**: Uses `.env` file for local development  
✅ **Production**: Uses environment variables for builds  
✅ **Git Safe**: API keys are never committed to repository  
✅ **Build Compatible**: Works with Expo builds and EAS  

For detailed configuration information, see [SECURE_CONFIGURATION.md](./SECURE_CONFIGURATION.md).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Set up environment (if not done already)

   ```bash
   node setup-env.js
   node add-keys.js
   ```

3. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
