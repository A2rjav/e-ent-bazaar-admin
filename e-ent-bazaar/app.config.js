export default {
  expo: {
    name: "E-Ent Bazaar",
    slug: "bhatta-mitra",
    version: "1.2.20",
    orientation: "portrait",
    scheme: "bhattamitra",
    userInterfaceStyle: "automatic",
    icon: "./assets/images/icon.png",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.eent.bazaar",
      buildNumber: "1.2.20",
      infoPlist: {
        NSCameraUsageDescription:
          "This app requires camera access to upload product images.",
        NSPhotoLibraryUsageDescription:
          "This app requires access to your photo library to select product images.",
        NSLocationWhenInUseUsageDescription:
          "This app requires your location to show nearby manufacturers and calculate distances.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "This app requires your location to show nearby manufacturers and calculate distances.",
      },
    },
    android: {
      package: "com.eent.bazaar",
      versionCode: 40,
      compileSdkVersion: 35,
      targetSdkVersion: 35,
      minSdkVersion: 23,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_MEDIA_IMAGES",
        "READ_EXTERNAL_STORAGE",
      ],
      edgeToEdgeEnabled: true,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    experiments: {
      typedRoutes: true,
    },
    owner: "adnan-mi",
    extra: {
      eas: {
        projectId: "cec466a6-4277-45cd-8f69-4e0be240162c",
      },
      // Configuration values - these are fallbacks for development
      // In production, use environment variables instead
      SUPABASE_URL: "https://fuctxlhyxjdkyazzimot.supabase.co",
      SUPABASE_ANON_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y3R4bGh5eGpka3lhenppbW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NjY1MzMsImV4cCI6MjA2MTA0MjUzM30.wO67-jJCHly_q2eKRYdEHbic3ynhD90cCIY_u3ZWj3A",
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY:
        "AIzaSyDrcPEKfZtOwLGOmm3wLu9Kk5MPPXiS-hQ",
    },
  },
};
