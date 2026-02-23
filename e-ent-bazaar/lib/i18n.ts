import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import enTranslation from '../locales/en.json';
import hiTranslation from '../locales/hi.json';
import paTranslation from '../locales/pa.json';
import bnTranslation from '../locales/bn.json';
import neTranslation from '../locales/ne.json';

const STORE_LANGUAGE_KEY = 'settings.lang';

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    const savedData = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);
    const lng = savedData || 'en';
    console.log('Language detector detected:', lng);
    callback(lng);
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    await AsyncStorage.setItem(STORE_LANGUAGE_KEY, lng);
    console.log('Language cached:', lng);
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      hi: { translation: hiTranslation },
      pa: { translation: paTranslation },
      bn: { translation: bnTranslation },
      ne: { translation: neTranslation },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
    debug: __DEV__,
    react: {
      useSuspense: false,
    },
    keySeparator: '.',
    nsSeparator: ':',
  });

// Debug: Log available resources
console.log('i18n resources loaded:', Object.keys(i18n.options.resources || {}));
console.log('English quotations keys:', enTranslation.quotations ? Object.keys(enTranslation.quotations) : 'No quotations found');

// Ensure language change events are properly triggered
const originalChangeLanguage = i18n.changeLanguage;
i18n.changeLanguage = async (lng: string) => {
  console.log('Changing language to:', lng);
  const result = await originalChangeLanguage.call(i18n, lng);
  console.log('Language changed to:', lng);
  return result;
};

export default i18n; 