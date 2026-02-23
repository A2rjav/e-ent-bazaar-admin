import React, { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, Animated, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '../lib/i18n'; // Initialize i18n

import { useColorScheme } from '@/hooks/useColorScheme';
import { Stack as ExpoStack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as ExpoSplashScreen from 'expo-splash-screen';
import WelcomeScreen from './welcome';
import ChooseLocationScreen from './choose-location';
import { useAuth } from '../contexts/AuthContext';
import { usePathname, useRouter } from 'expo-router';
import { LanguageProvider } from '../contexts/LanguageContext';
import { detectUserCountry } from '../lib/countryDetection';

// Keep the splash screen visible while we fetch resources
ExpoSplashScreen.preventAutoHideAsync();

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  country: string;
  flag: string;
  phoneCode: string;
}

const languageOptions: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    country: 'India',
    flag: '🇮🇳',
    phoneCode: '+91'
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    country: 'India',
    flag: '🇮🇳',
    phoneCode: '+91'
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    country: 'India',
    flag: '🇮🇳',
    phoneCode: '+91'
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    country: 'India',
    flag: '🇮🇳',
    phoneCode: '+91'
  },
  {
    code: 'ne',
    name: 'Nepali',
    nativeName: 'नेपाली',
    country: 'Nepal',
    flag: '🇳🇵',
    phoneCode: '+977'
  }
];



export default function RootLayout() {
  const { i18n } = useTranslation();
  const [isAppReady, setIsAppReady] = useState(false);
  const [isLanguageLoading, setIsLanguageLoading] = useState(false);
  const router = useRouter();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    async function prepareInitialLoad() {
      try {
        // No AsyncStorage or persistent check for language selection here
      } catch (e) {
        console.warn(e);
      } finally {
        setIsAppReady(true);
        await ExpoSplashScreen.hideAsync();
      }
    }
    prepareInitialLoad();
  }, [i18n, loaded]);

  const handleLanguageSelect = async (language: LanguageOption, isAuthenticated: boolean) => {
    try {
      setIsLanguageLoading(true); // Start loading
      await i18n.changeLanguage(language.code);

      // Store selected language for country detection
      await AsyncStorage.setItem('selectedLanguage', JSON.stringify(language));

      // If not authenticated, remove settings.lang so language is not persisted
      if (!isAuthenticated) {
        await AsyncStorage.removeItem('settings.lang');
      }

      // Re-detect country after language change
      try {
        const country = await detectUserCountry();
        console.log('App Layout: Country re-detected after language change:', country);
      } catch (error) {
        console.error('Error re-detecting country after language change:', error);
      }

      // Wait for 4 seconds
      await new Promise(resolve => setTimeout(resolve, 4000));
      router.replace('/welcome'); // Navigate to welcome screen after language selection
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsLanguageLoading(false); // Stop loading
    }
  };

  // Show loading spinner while checking auth
  if (!isAppReady || !loaded) {
    return null; // Keep native splash screen visible
  }

  return (
    <LanguageProvider>
      <AuthProvider>
        <RootLayoutContent
          isLanguageLoading={isLanguageLoading}
          handleLanguageSelect={handleLanguageSelect}
        />
      </AuthProvider>
    </LanguageProvider>
  );
}

function RootLayoutContent({ isLanguageLoading, handleLanguageSelect }: {
  isLanguageLoading: boolean;
  handleLanguageSelect: (language: LanguageOption, isAuthenticated: boolean) => void;
}) {
  const { isAuthenticated, isGuest, guestLocation, isLoading } = useAuth();
  const { i18n } = useTranslation();

  // Apply selectedLanguage for authenticated users on mount
  useEffect(() => {
    async function applyPersistedLanguage() {
      if (isAuthenticated) {
        const selectedLanguage = await AsyncStorage.getItem('selectedLanguage');
        if (selectedLanguage) {
          await i18n.changeLanguage(selectedLanguage);
        }
      }
    }
    applyPersistedLanguage();
  }, [isAuthenticated, i18n]);

  if (isLoading) {
    return null;
  }

  if (isLanguageLoading) {
    return <LoadingScreen />;
  }

  // Show MainStack if authenticated OR guest (with or without location)
  if (isAuthenticated || isGuest) {
    return <MainStack />;
  }

  // Otherwise, show AuthStack (welcome, choose-location, login, etc)
  return <AuthStack />;
}

// // Guest stack: Welcome and ChooseLocation
// function GuestStack({ isGuest, guestLocation }: { isGuest: boolean, guestLocation: any }) {
//   if (!isGuest) {
//     return <WelcomeScreen />;
//   }
//   if (isGuest && !guestLocation) {
//     return <ChooseLocationScreen />;
//   }
//   return null;
// }

// Auth stack: Login, OTP, Register
function AuthStack() {
  return (
    <>
      <StatusBar style="auto" />
      <ExpoStack>
        <ExpoStack.Screen name="language-select" options={{ title: '', headerShown: false }} />
        <ExpoStack.Screen name="welcome" options={{ title: '', headerShown: false }} />
        <ExpoStack.Screen name="select-brick-type" options={{ title: '', headerShown: false }} />
        <ExpoStack.Screen name="choose-location" options={{ title: '', headerShown: false }} />
        <ExpoStack.Screen name="auth/phone" options={{ title: 'Login', headerShown: false }} />
        <ExpoStack.Screen name="auth/otp" options={{ title: 'Verify OTP', headerShown: false }} />
        <ExpoStack.Screen name="auth/register" options={{ title: 'Register', headerShown: false }} />
      </ExpoStack>
    </>
  );
}


function MainStack() {
  return (
    <>
      <StatusBar style="auto" />
      <ExpoStack>
        <ExpoStack.Screen name="(tabs)" options={{ headerShown: false }} />
        <ExpoStack.Screen name="product-detail" options={{ headerShown: false }} />
        <ExpoStack.Screen name="+not-found" />
        <ExpoStack.Screen name="profile" options={{ title: 'Profile', headerShown: false }} />
        <ExpoStack.Screen name="edit-profile" options={{ title: 'Edit Profile', headerShown: false }} />
        <ExpoStack.Screen name="order-details" options={{ title: 'Edit Profile', headerShown: false }} />
        <ExpoStack.Screen name="my-history" options={{ title: 'My History', headerShown: false }} />
      </ExpoStack>
    </>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <StatusBar style="dark" />
      <Image
        source={{ uri: 'https://res.cloudinary.com/dq6jozzz7/image/upload/v1749677803/e-ent-bazaar_zaj2v7.png' }}
        style={styles.splashLogo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#fff" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#af4b0e',
    marginBottom: 5,
  },
  logoSubtext: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  languageList: {
    flex: 1,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 28,
    marginRight: 16,
  },
  languageDetails: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  languageEnglish: {
    fontSize: 14,
    color: '#666',
  },
  countryInfo: {
    fontSize: 14,
    color: '#666',
  },
  selectArrow: {
    fontSize: 22,
    color: '#600018',
    fontWeight: 'bold',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#af4b0e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#af4b0e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  splashLogo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  splashSubtitle: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 40,
  },
  languageContainer: {
    flex: 1,
    backgroundColor: '#af4b0e',
  },
  languageHeader: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageLogo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  languageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  languageSubtitle: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
  },
  languageOptions: {
    flex: 1,
    padding: 20,
  },
  languageContentSheet: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  chooseLanguageText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
