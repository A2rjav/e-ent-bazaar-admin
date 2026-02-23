import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isGuest, isLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isGuest) {
      router.replace('/language-select');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return null; // Show loading screen
  }

  if (!isAuthenticated && !isGuest) {
    return null; // Will redirect to auth or welcome
  }

  // Render Tabs for both authenticated and guest users
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#af4b0e', // Use our hotRed color
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: [
          Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
            },
            default: {},
          }),
          isGuest && { display: 'none' },
        ],
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: isGuest ? '' : t('tabs.home'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          // This will hide the tab from the tab bar
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="quotations"
        options={{
          title: isGuest ? '' : t('tabs.quotations'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="inquiries"
        options={{
          title: isGuest ? '' : t('tabs.inquiries'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="message" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="sample-orders"
        options={{
          title: isGuest ? '' : 'Samples',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="cube.box.fill" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: isGuest ? '' : t('tabs.orders'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
          headerShown: false,
        }}
      />

    </Tabs>
  );
}
