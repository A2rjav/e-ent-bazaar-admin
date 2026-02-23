import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
}

/**
 * Stores user's country in AsyncStorage for persistence
 */
export const storeUserCountry = async (country: CountryInfo): Promise<void> => {
  try {
    await AsyncStorage.setItem('userCountry', JSON.stringify(country));
    console.log('💾 Country stored in AsyncStorage:', country);
  } catch (error) {
    console.error('❌ Error storing country:', error);
  }
};

/**
 * Clears stored country from AsyncStorage
 */
export const clearStoredCountry = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('userCountry');
    console.log('🗑️ Country cleared from AsyncStorage');
  } catch (error) {
    console.error('❌ Error clearing country:', error);
  }
};

/**
 * Debug function to check all stored values
 */
export const debugStoredValues = async (): Promise<void> => {
  try {
    const selectedLanguage = await AsyncStorage.getItem('selectedLanguage');
    const storedCountry = await AsyncStorage.getItem('userCountry');
    
    console.log('🔍 DEBUG: AsyncStorage values:');
    console.log('🔍 DEBUG: selectedLanguage:', selectedLanguage);
    console.log('🔍 DEBUG: storedCountry:', storedCountry);
    
    if (selectedLanguage) {
      const languageData = JSON.parse(selectedLanguage);
      console.log('🔍 DEBUG: parsed languageData:', languageData);
    }
    
    if (storedCountry) {
      const countryData = JSON.parse(storedCountry);
      console.log('🔍 DEBUG: parsed countryData:', countryData);
    }
  } catch (error) {
    console.error('❌ Error debugging stored values:', error);
  }
};

/**
 * Detects user's country based on multiple factors:
 * 1. Selected language (Nepali = Nepal)
 * 2. Phone number prefix (+977 = Nepal, +91 = India)
 * 3. Stored country preference
 * 
 * @returns Promise<CountryInfo> - User's country information
 */
export const detectUserCountry = async (): Promise<CountryInfo> => {
  try {
    // 0. First check if country is directly stored
    const storedCountry = await AsyncStorage.getItem('userCountry');
    if (storedCountry) {
      const countryData = JSON.parse(storedCountry);
      console.log('✅ Country loaded from direct storage:', countryData);
      return countryData;
    }

    // 1. Check selected language first
    const selectedLanguage = await AsyncStorage.getItem('selectedLanguage');
    console.log('🔍 DEBUG: selectedLanguage from AsyncStorage:', selectedLanguage);
    
    if (selectedLanguage) {
      const languageData = JSON.parse(selectedLanguage);
      console.log('🔍 DEBUG: parsed languageData:', languageData);
      
      // Check if language object has country property
      if (languageData.country) {
        if (languageData.country === 'Nepal') {
          console.log('✅ Country detected from language.country: Nepal');
          return {
            code: 'NP',
            name: 'Nepal',
            flag: '🇳🇵'
          };
        } else if (languageData.country === 'India') {
          console.log('✅ Country detected from language.country: India');
          return {
            code: 'IN',
            name: 'India',
            flag: '🇮🇳'
          };
        }
      }
      
      // Fallback: If Nepali language code is selected, return Nepal
      if (languageData.code === 'ne') {
        console.log('✅ Country detected from language code: Nepal');
        return {
          code: 'NP',
          name: 'Nepal',
          flag: '🇳🇵'
        };
      }
    }
    
    // Also check i18n language directly
    const currentI18nLanguage = await AsyncStorage.getItem('i18nextLng');
    console.log('🔍 DEBUG: i18nextLng from AsyncStorage:', currentI18nLanguage);
    
    if (currentI18nLanguage === 'ne') {
      console.log('✅ Country detected from i18n language: Nepal');
      return {
        code: 'NP',
        name: 'Nepal',
        flag: '🇳🇵'
      };
    }

    // 2. Check phone number prefix
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.phone) {
        if (user.phone.startsWith('+977')) {
          console.log('Country detected from phone: Nepal');
          return {
            code: 'NP',
            name: 'Nepal',
            flag: '🇳🇵'
          };
        } else if (user.phone.startsWith('+91')) {
          console.log('Country detected from phone: India');
          return {
            code: 'IN',
            name: 'India',
            flag: '🇮🇳'
          };
        }
      }
    }

    // 3. Check stored country preference
    const selectedCountry = await AsyncStorage.getItem('selectedCountry');
    if (selectedCountry) {
      if (selectedCountry === 'NP') {
        console.log('Country detected from preference: Nepal');
        return {
          code: 'NP',
          name: 'Nepal',
          flag: '🇳🇵'
        };
      } else if (selectedCountry === 'IN') {
        console.log('Country detected from preference: India');
        return {
          code: 'IN',
          name: 'India',
          flag: '🇮🇳'
        };
      }
    }

    // 4. Default to India
    console.log('Country defaulted to: India');
    return {
      code: 'IN',
      name: 'India',
      flag: '🇮🇳'
    };
  } catch (error) {
    console.error('Error detecting user country:', error);
    // Default to India on error
    return {
      code: 'IN',
      name: 'India',
      flag: '🇮🇳'
    };
  }
};

/**
 * Gets country-aware location data based on user's country
 */
export const getCountryAwareLocationData = async () => {
  const country = await detectUserCountry();
  
  if (country.code === 'NP') {
    // Import Nepal data
    const { getNepalProvinces, getNepalDistrictsByProvince } = await import('./locationData');
    return {
      country,
      states: getNepalProvinces(),
      getDistricts: getNepalDistrictsByProvince
    };
  } else {
    // Import India data (default)
    const { getStates, getDistrictsByState } = await import('./locationData');
    return {
      country,
      states: getStates(),
      getDistricts: getDistrictsByState
    };
  }
};
