import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Switch,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getCustomerOrdersWithDetails, OrderWithDetails } from '../../lib/orderService';
import { getProductsWithManufacturer, ProductWithManufacturer } from '../../lib/productService';
import { haversineDistance } from '../../utils/haversine';
import {
  getStates,
  getDistrictsByState,
  extractCitiesFromManufacturers,
  extractStatesFromManufacturers,
  extractDistrictsFromManufacturers,
  getAvailableStates,
  getAvailableDistricts
} from '../../lib/locationData';
import { detectUserCountry, getCountryAwareLocationData, storeUserCountry, debugStoredValues, clearStoredCountry } from '../../lib/countryDetection';
import { IconSymbol } from '@/components/ui/IconSymbol';
import MarketplaceScreen from './marketplace';
import { getAddressFromCoordinates } from '../../utils/geocode';
import i18n from '../../lib/i18n';
import { getAllActiveContent, MobileContent } from '../../lib/mobileContentService';
import ContentCarousel from '../../components/ContentCarousel';


interface Manufacturer {
  id: string;
  name: string;
  company_name: string;
  city: string;
  state: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  products: ProductWithManufacturer[];
  country?: string; // Add country property for Nepal support
}

interface FilterState {
  maxDistance: number;
  priceRange: [number, number];
  selectedProductTypes: string[];
  selectedState: string;
  selectedDistrict: string;
  selectedCity: string;
  selectedPincode: string;
  nearMeActive: boolean;
}

export default function HomeScreen() {
  const { user, isGuest, guestLocation, clearGuest } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const marketplaceRef = useRef<{ refresh: () => Promise<void> }>(null);
  const [recentOrders, setRecentOrders] = useState<OrderWithDetails[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [filteredManufacturers, setFilteredManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userLocationText, setUserLocationText] = useState('Mumbai, Maharashtra');
  const [isLocating, setIsLocating] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    maxDistance: 100,
    priceRange: [0, 1000],
    selectedProductTypes: [],
    selectedState: '__all__',
    selectedDistrict: '__all__',
    selectedCity: '__all__',
    selectedPincode: '',
    nearMeActive: false,
  });
  const [shouldLoginAfterGuest, setShouldLoginAfterGuest] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [languageLoading, setLanguageLoading] = useState(false);
  const [countryChanging, setCountryChanging] = useState(false);
  const [allContent, setAllContent] = useState<MobileContent[]>([]);

  // Country detection state
  const [userCountry, setUserCountry] = useState({ code: 'NP', name: 'Nepal', flag: '🇳🇵' });
  console.log("🚀 ~ HomeScreen ~ userCountry:", userCountry)
  const [isCountryDetecting, setIsCountryDetecting] = useState(true);
  const availableLanguages = [
    { code: 'en', label: 'English', name: 'English', nativeName: 'English', country: 'India', flag: '🇮🇳', phoneCode: '+91' },
    { code: 'hi', label: 'हिन्दी', name: 'Hindi', nativeName: 'हिंदी', country: 'India', flag: '🇮🇳', phoneCode: '+91' },
    { code: 'bn', label: 'বাংলা', name: 'Bengali', nativeName: 'বাংলা', country: 'India', flag: '🇮🇳', phoneCode: '+91' },
    { code: 'ne', label: 'नेपाली', name: 'Nepali', nativeName: 'नेपाली', country: 'Nepal', flag: '🇳🇵', phoneCode: '+977' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', country: 'India', flag: '🇮🇳', phoneCode: '+91' },
  ];

  // Detect user country on component mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        setIsCountryDetecting(true);

        // First check if we have a stored country
        const storedCountry = await AsyncStorage.getItem('userCountry');
        if (storedCountry) {
          const country = JSON.parse(storedCountry);
          setUserCountry(country);
        } else {
          // Fallback to detection if no stored country
          const country = await detectUserCountry();
          setUserCountry(country);
          await storeUserCountry(country);
        }
      } catch (error) {
        console.error('Error detecting country:', error);
        // Keep default India
      } finally {
        setIsCountryDetecting(false);
      }
    };

    detectCountry();
  }, []);

  // Comprehensive country change handler
  const handleCountryChange = useCallback(async () => {
    try {
      setLoading(true);
      setCountryChanging(true);

      // Reset all data first
      setManufacturers([]);
      setFilteredManufacturers([]);
      setRecentOrders([]);

      // Reset filters to default for new country
      const defaultFilters: FilterState = {
        maxDistance: 100,
        priceRange: [0, 1000],
        selectedProductTypes: [],
        selectedState: '__all__',
        selectedDistrict: '__all__',
        selectedCity: '__all__',
        selectedPincode: '',
        nearMeActive: false,
      };
      setFilters(defaultFilters);

      // Clear search
      setSearchQuery('');

      // Load fresh data for new country
      await loadData();

    } catch (error) {
    } finally {
      setLoading(false);
      setCountryChanging(false);
    }
  }, [userCountry.code]);

  // Reload data when country changes - with proper loading states
  useEffect(() => {
    if (!isCountryDetecting) {
      handleCountryChange();
    }
  }, [userCountry.code, isCountryDetecting, handleCountryChange]);

  // Get available states and districts for filters (country-aware)
  const availableStates = userCountry.code === 'NP'
    ? getAvailableStates('Nepal') // Use static Nepal provinces data
    : getAvailableStates('India'); // Use static India states data


  // Debug function to test country detection
  const debugCountryDetection = async () => {

    // Debug AsyncStorage values
    await debugStoredValues();

    const country = await detectUserCountry();


    // Force re-detect country and update state
    setUserCountry(country);
    await storeUserCountry(country);
  };

  // Debug function to clear stored country
  const debugClearCountry = async () => {
    await clearStoredCountry();

    // Force re-detection
    const country = await detectUserCountry();
    setUserCountry(country);
    await storeUserCountry(country);
  };

  const availableDistricts = filters.selectedState !== '__all__'
    ? getAvailableDistricts(userCountry.name, filters.selectedState)
    : [];

  const availableCities = extractCitiesFromManufacturers(manufacturers);

  // Extract product types from manufacturers
  const allProductTypes = Array.from(
    new Set(
      manufacturers.flatMap((m) =>
        m.products.map((p) => p.category || p.name.split(" ")[0])
      )
    )
  ).filter(Boolean);

  // Set user location text from user profile
  useEffect(() => {
    if (user) {
      const city = user.city || t('home.unknown');
      const state = user.state || t('home.unknown');
      setUserLocationText(`${city}, ${state}`);
      if (user.latitude && user.longitude) {
        setUserLocation({
          latitude: user.latitude,
          longitude: user.longitude
        });
      }
    } else if (isGuest && guestLocation) {
      setUserLocationText('Loading address...');
      setUserLocation({
        latitude: guestLocation.latitude,
        longitude: guestLocation.longitude
      });
      getAddressFromCoordinates(guestLocation.latitude, guestLocation.longitude)
        .then(address => {
          if (address) {
            const parts = address.split(',');
            let shortAddress = parts.slice(0, 2).join(',').trim();
            if (parts.length > 2) {
              shortAddress += '...';
            }
            setUserLocationText(shortAddress || 'Unknown location');
          } else {
            setUserLocationText('Unknown location');
          }
        })
        .catch(() => setUserLocationText('Unknown location'));
    } else if (isGuest && !guestLocation) {
      // For guest users without location, show "Location" text
      setUserLocationText('Location');
      setUserLocation(null);
    }
  }, [user, isGuest, guestLocation]);

  // Load content separately for faster loading
  const loadContent = async () => {
    try {
      setContentLoading(true);

      // Add timeout to prevent long loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Content loading timeout')), 5000);
      });

      const contentPromise = getAllActiveContent(isGuest ? 'guest' : 'user');

      const contentData = await Promise.race([contentPromise, timeoutPromise]) as MobileContent[];
      setAllContent(contentData);
    } catch (error) {
      console.error('Error loading content:', error);
      // Set empty array to prevent infinite loading
      setAllContent([]);
    } finally {
      setContentLoading(false);
    }
  };

  const getUserLocation = async () => {
    // This function now just shows the user's saved location
    if (user) {
      const city = user.city || t('home.unknown');
      const state = user.state || t('home.unknown');
      const newLocationText = `${city}, ${state}`;
      setUserLocationText(newLocationText);

      Alert.alert(
        t('home.location.title'),
        `${t('home.location.savedLocation')}: ${newLocationText}`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        t('home.location.title'),
        t('home.location.updateProfile'),
        [{ text: 'OK' }]
      );
    }
  };

  const loadData = async () => {
    try {
      // For guest users, only load products
      if (isGuest) {
        const productsData = await getProductsWithManufacturer();


        setRecentOrders([]); // No orders for guest users

        // Group products by manufacturer
        const manufacturerMap = new Map<string, Manufacturer>();

        productsData.forEach(product => {
          const manufacturerId = product.manufacturer_id;
          if (!manufacturerMap.has(manufacturerId)) {
            const manufacturerCountry = product.manufacturer_country; // Don't default to India
            manufacturerMap.set(manufacturerId, {
              id: manufacturerId,
              name: product.manufacturer_name,
              company_name: product.manufacturer_company_name || product.manufacturer_name,
              city: product.manufacturer_location?.split(',')[0]?.trim() || t('home.unknown'),
              state: product.manufacturer_location?.split(',')[1]?.trim() || t('home.unknown'),
              district: product.manufacturer_location?.split(',')[2]?.trim(),
              latitude: product.manufacturer_latitude,
              longitude: product.manufacturer_longitude,
              country: manufacturerCountry,
              distance: undefined,
              products: [],
            });
          }
          manufacturerMap.get(manufacturerId)!.products.push(product);
        });

        let manufacturersList = Array.from(manufacturerMap.values());

        // Filter manufacturers by country

        if (userCountry.code === 'NP') {
          // For Nepal: Only show manufacturers explicitly marked as Nepal
          manufacturersList = manufacturersList.filter(m => m.country === 'Nepal');
        } else if (userCountry.code === 'IN') {
          // For India: Show manufacturers marked as India OR with no country (fallback to India)
          manufacturersList = manufacturersList.filter(m => m.country === 'India' || !m.country);
        } else {
          // For other countries: Only show manufacturers explicitly marked for that country
          manufacturersList = manufacturersList.filter(m => m.country === userCountry.name);
        }

        // Calculate distances if user location is available
        if (userLocation) {
          manufacturersList.forEach(manufacturer => {
            if (manufacturer.latitude && manufacturer.longitude) {
              manufacturer.distance = haversineDistance(
                userLocation.latitude,
                userLocation.longitude,
                manufacturer.latitude,
                manufacturer.longitude
              );
            }
          });
        }

        setManufacturers(manufacturersList);
        setFilteredManufacturers(manufacturersList);
      } else {
        // For logged-in users, load orders and products
        const [orders, productsData] = await Promise.all([
          getCustomerOrdersWithDetails(user!.id),
          getProductsWithManufacturer()
        ]);

        setRecentOrders(orders.slice(0, 3)); // Show only 3 most recent orders

        // Group products by manufacturer
        const manufacturerMap = new Map<string, Manufacturer>();

        productsData.forEach(product => {
          const manufacturerId = product.manufacturer_id;
          if (!manufacturerMap.has(manufacturerId)) {
            const manufacturerCountry = product.manufacturer_country; // Don't default to India
            manufacturerMap.set(manufacturerId, {
              id: manufacturerId,
              name: product.manufacturer_name,
              company_name: product.manufacturer_company_name || product.manufacturer_name,
              city: product.manufacturer_location?.split(',')[0]?.trim() || t('home.unknown'),
              state: product.manufacturer_location?.split(',')[1]?.trim() || t('home.unknown'),
              district: product.manufacturer_location?.split(',')[2]?.trim(),
              latitude: product.manufacturer_latitude,
              longitude: product.manufacturer_longitude,
              country: manufacturerCountry,
              distance: undefined,
              products: [],
            });
          }
          manufacturerMap.get(manufacturerId)!.products.push(product);
        });

        let manufacturersList = Array.from(manufacturerMap.values());

        // Filter manufacturers by country

        if (userCountry.code === 'NP') {
          // For Nepal: Only show manufacturers explicitly marked as Nepal
          manufacturersList = manufacturersList.filter(m => m.country === 'Nepal');
        } else if (userCountry.code === 'IN') {
          // For India: Show manufacturers marked as India OR with no country (fallback to India)
          manufacturersList = manufacturersList.filter(m => m.country === 'India' || !m.country);
        } else {
          // For other countries: Only show manufacturers explicitly marked for that country
          manufacturersList = manufacturersList.filter(m => m.country === userCountry.name);
        }

        // Calculate distances if user location is available
        if (userLocation) {
          manufacturersList.forEach(manufacturer => {
            if (manufacturer.latitude && manufacturer.longitude) {
              manufacturer.distance = haversineDistance(
                userLocation.latitude,
                userLocation.longitude,
                manufacturer.latitude,
                manufacturer.longitude
              );
            }
          });
        }
        setManufacturers(manufacturersList);
        setFilteredManufacturers(manufacturersList);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {

      // Refresh both home data and marketplace data with current country
      await Promise.all([
        loadData(), // This will use the current userCountry.code
        loadContent(),
        marketplaceRef.current?.refresh() // This will also use current country
      ]);

    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  };

  // Load content immediately when component mounts or user type changes
  useEffect(() => {
    loadContent();
  }, [isGuest]);

  useEffect(() => {
    // Only load data if country detection is complete
    marketplaceRef.current?.refresh()
    if (!isCountryDetecting) {
      loadData();
      marketplaceRef.current?.refresh()
    }
  }, [user?.id, userLocation, isGuest, isCountryDetecting, userCountry.code]);

  // Apply filters
  useEffect(() => {
    let filtered = manufacturers;

    // Search filter
    if (searchQuery.trim() !== '') {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(manufacturer => {
        return (
          manufacturer.name.toLowerCase().includes(searchLower) ||
          manufacturer.company_name.toLowerCase().includes(searchLower) ||
          manufacturer.city.toLowerCase().includes(searchLower) ||
          manufacturer.state.toLowerCase().includes(searchLower) ||
          manufacturer.products.some(product =>
            product.name.toLowerCase().includes(searchLower) ||
            product.description?.toLowerCase().includes(searchLower)
          )
        );
      });
    }

    // Distance filter
    if (filters.maxDistance < 100 && userLocation) {
      filtered = filtered.filter(manufacturer =>
        manufacturer.distance && manufacturer.distance <= filters.maxDistance
      );
    }

    // State filter
    if (filters.selectedState !== '__all__') {
      filtered = filtered.filter(manufacturer =>
        manufacturer.state === filters.selectedState
      );
    }

    // District filter
    if (filters.selectedDistrict !== '__all__') {
      filtered = filtered.filter(manufacturer =>
        manufacturer.district === filters.selectedDistrict
      );
    }

    // City filter
    if (filters.selectedCity !== '__all__') {
      filtered = filtered.filter(manufacturer =>
        manufacturer.city === filters.selectedCity
      );
    }

    // Product type filter
    if (filters.selectedProductTypes.length > 0) {
      filtered = filtered.map(manufacturer => ({
        ...manufacturer,
        products: manufacturer.products.filter(product =>
          filters.selectedProductTypes.includes(product.category)
        )
      })).filter(manufacturer => manufacturer.products.length > 0);
    }

    // Price range filter
    filtered = filtered.map(manufacturer => ({
      ...manufacturer,
      products: manufacturer.products.filter(product =>
        product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
      )
    })).filter(manufacturer => manufacturer.products.length > 0);

    // Add E-Ent Bazaar as first option (always shown)
    const eentBazaar: Manufacturer = {
      id: 'eent-bazaar',
      name: 'E-Ent Bazaar',
      company_name: 'E-Ent Bazaar Digital Store',
      city: t('home.digitalStore'),
      state: 'Online',
      district: 'Digital',
      latitude: undefined,
      longitude: undefined,
      distance: 0,
      country: undefined, // No specific country - show for all
      products: [
        {
          id: 'eent-bazaar-product',
          manufacturer_id: 'eent-bazaar',
          name: 'Bulk Building Materials',
          description: 'Complete range of building materials available for bulk orders',
          price: 0,
          image_url: undefined,
          category: 'Building Materials',
          is_available: true,
          specifications: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          manufacturer_name: 'E-Ent Bazaar',
          manufacturer_company_name: 'E-Ent Bazaar Digital Store',
          manufacturer_location: 'Digital Store, Online',
          manufacturer_latitude: undefined,
          manufacturer_longitude: undefined,
        }
      ],
    };

    // Always show E-Ent Bazaar first, then other manufacturers
    const finalManufacturers = [eentBazaar, ...filtered];
    setFilteredManufacturers(finalManufacturers);
  }, [manufacturers, searchQuery, filters, userLocation]);

  const handleNearMe = async () => {
    if (!userLocation) {
      if (isGuest) {
        Alert.alert(
          'Location Required',
          'To use "Near Me" feature, please allow location access.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Allow Location',
              onPress: () => {
                // Navigate to location permission screen for guest users
                router.push('/choose-location');
              }
            }
          ]
        );
      } else {
        Alert.alert(
          t('home.location.required'),
          t('home.location.nearMeFeature'),
          [{ text: 'OK' }]
        );
      }
      return;
    }

    setFilters(prev => ({
      ...prev,
      nearMeActive: true,
      selectedPincode: '',
    }));

    Alert.alert(
      t('home.nearMe.applied'),
      t('home.nearMe.appliedMessage', { location: userLocationText }),
      [{ text: 'OK' }]
    );
  };

  const handleClearNearMe = () => {
    setUserLocation(null);
    setFilters(prev => ({
      ...prev,
      nearMeActive: false,
      selectedPincode: '',
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      maxDistance: 100,
      priceRange: [0, 1000],
      selectedProductTypes: [],
      selectedState: '__all__',
      selectedDistrict: '__all__',
      selectedCity: '__all__',
      selectedPincode: '',
      nearMeActive: false,
    });
    setUserLocation(null);
  };

  const getActiveFiltersCount = () => {
    const activeFilters = [];
    if (filters.maxDistance < 100) activeFilters.push(`Distance: ${filters.maxDistance}km`);
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) activeFilters.push(`Price: ₹${filters.priceRange[0]}-${filters.priceRange[1]}`);
    if (filters.selectedProductTypes.length > 0) activeFilters.push(`Types: ${filters.selectedProductTypes.length}`);
    if (filters.selectedState !== '__all__') activeFilters.push(`State: ${filters.selectedState}`);
    if (filters.selectedDistrict !== '__all__') activeFilters.push(`District: ${filters.selectedDistrict}`);
    if (filters.selectedCity !== '__all__') activeFilters.push(`City: ${filters.selectedCity}`);
    if (filters.selectedPincode) activeFilters.push(`Pin Code: ${filters.selectedPincode}`);
    if (filters.nearMeActive) activeFilters.push('Near Me Active');
    return activeFilters.length;
  };

  const handleBulkInquiry = () => {
    if (isGuest) {
      Alert.alert(t('home.guestTitle'), t('home.guestBulkInquiry'));
      return;
    }
    if (!user) {
      Alert.alert(t('home.loginRequired'), t('home.loginToSendBulkInquiry'));
      return;
    }
    Alert.alert(
      'Bulk Inquiry - E-Ent Bazaar',
      'Your bulk inquiry will be sent directly to E-Ent Bazaar admin team. They will contact you with the best offers for your requirements.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Bulk Inquiry',
          onPress: () => {
            Alert.alert(
              'Bulk Inquiry Sent!',
              'Your bulk inquiry has been sent to E-Ent Bazaar admin team. They will contact you within 24 hours with the best offers.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    router.push('/(tabs)/inquiries');
                  }
                }
              ]
            );
          }
        },
      ]
    );
  };

  const renderProduct = ({ item: product }: { item: ProductWithManufacturer }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/product-detail?id=${product.id}`)}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productDescription}>{product.description || 'No description available'}</Text>
        <Text style={styles.productPrice}>₹{product.price.toLocaleString()}</Text>
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.quoteButton]}
          onPress={(e) => {
            e.stopPropagation();
            router.push('/(tabs)/quotations');
          }}
        >
          <Text style={styles.quoteButtonText}>Request Quote</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.orderButton]}
          onPress={(e) => {
            e.stopPropagation();
            router.push('/(tabs)/orders');
          }}
        >
          <Text style={styles.orderButtonText}>Place Order</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderManufacturer = ({ item: manufacturer }: { item: Manufacturer }) => {
    const isEentBazaar = manufacturer.id === 'eent-bazaar';

    return (
      <View style={[
        styles.manufacturerCard,
        isEentBazaar && styles.eentBazaarCard
      ]}>
        <View style={styles.manufacturerHeader}>
          <View style={styles.manufacturerInfo}>
            <Text style={[
              styles.manufacturerName,
              isEentBazaar && styles.eentBazaarName
            ]}>
              {manufacturer.name}
              {isEentBazaar && ' 🏆'}
            </Text>
            <Text style={[
              styles.manufacturerLocation,
              isEentBazaar && styles.eentBazaarLocation
            ]}>
              {manufacturer.city}{manufacturer.district ? `, ${manufacturer.district}, ` : ', '}{manufacturer.state}
            </Text>
            {manufacturer.distance && !isEentBazaar && (
              <Text style={styles.manufacturerDistance}>{manufacturer.distance.toFixed(1)} km away</Text>
            )}
          </View>
          {isEentBazaar && (
            <Text style={styles.eentBazaarBadge}>Digital Store</Text>
          )}
        </View>

        {isEentBazaar ? (
          <View style={styles.eentBazaarActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.bulkInquiryButton]}
              onPress={handleBulkInquiry}
            >
              <Text style={styles.bulkInquiryButtonText}>
                📞 Bulk Inquiry
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.contactAdminButton]}
              onPress={() => {
                if (isGuest) {
                  Alert.alert(t('home.guestTitle'), t('home.guestContactAdmin'));
                  return;
                }
                Alert.alert(
                  'Contact E-Ent Bazaar',
                  'Call: +91-8008007954\nEmail: admin@eentbazaar.com\n\nOur team will assist you with all your building material needs.',
                  [
                    { text: 'OK', style: 'default' }
                  ]
                );
              }}
            >
              <Text style={styles.contactAdminButtonText}>
                💬 Contact Admin
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.manufacturerActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.inquiryButton]}
              onPress={() => {
                if (isGuest) {
                  Alert.alert(t('home.guestTitle'), t('home.guestSendInquiry'));
                  return;
                }
                router.push('/(tabs)/inquiries');
              }}
            >
              <Text style={styles.inquiryButtonText}>
                Send Inquiry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.productsTitle}>Available Products:</Text>
        <FlatList
          data={manufacturer.products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </View>
    );
  };

  const renderFiltersModal = () => (
    <Modal
      visible={filtersVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setFiltersVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('home.filters.title')}</Text>
            <TouchableOpacity onPress={() => setFiltersVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContent}>
            {/* Distance Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>{t('home.filters.maxDistance', { distance: filters.maxDistance })}</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>0</Text>
                <View style={styles.sliderTrack}>
                  <View
                    style={[
                      styles.sliderFill,
                      { width: `${(filters.maxDistance / 100) * 100}%` }
                    ]}
                  />
                  <View
                    style={[
                      styles.sliderThumb,
                      { left: `${(filters.maxDistance / 100) * 100}%` }
                    ]}
                  />
                </View>
                <Text style={styles.sliderValue}>100</Text>
              </View>
            </View>

            {/* Price Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>
                {t('home.filters.priceRange', { min: filters.priceRange[0], max: filters.priceRange[1] })}
              </Text>
              <View style={styles.priceInputs}>
                <TextInput
                  style={styles.priceInput}
                  value={filters.priceRange[0].toString()}
                  onChangeText={(text) => setFilters(prev => ({
                    ...prev,
                    priceRange: [parseInt(text) || 0, prev.priceRange[1]]
                  }))}
                  keyboardType="numeric"
                  placeholder={t('home.filters.min')}
                />
                <Text style={styles.priceSeparator}>-</Text>
                <TextInput
                  style={styles.priceInput}
                  value={filters.priceRange[1].toString()}
                  onChangeText={(text) => setFilters(prev => ({
                    ...prev,
                    priceRange: [prev.priceRange[0], parseInt(text) || 1000]
                  }))}
                  keyboardType="numeric"
                  placeholder={t('home.filters.max')}
                />
              </View>
            </View>

            {/* State Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>
                {userCountry.code === 'NP' ? t('home.filters.province') : t('home.filters.state')}
              </Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => {
                  const stateOptions = [
                    userCountry.code === 'NP' ? t('home.filters.allProvinces') : t('home.filters.allStates'),
                    ...availableStates
                  ];
                  Alert.alert(
                    userCountry.code === 'NP' ? t('home.filters.selectProvince') : t('home.filters.selectState'),
                    userCountry.code === 'NP' ? t('home.filters.chooseProvince') : t('home.filters.chooseState'),
                    [
                      ...stateOptions.map(state => ({
                        text: state,
                        onPress: () => setFilters(prev => ({
                          ...prev,
                          selectedState: (state === t('home.filters.allStates') || state === t('home.filters.allProvinces')) ? '__all__' : state,
                          selectedDistrict: '__all__',
                          selectedCity: '__all__'
                        }))
                      })),
                      { text: t('home.filters.cancel'), style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={styles.selectButtonText}>
                  {filters.selectedState === '__all__'
                    ? (userCountry.code === 'NP' ? t('home.filters.allProvinces') : t('home.filters.allStates'))
                    : filters.selectedState
                  }
                </Text>
              </TouchableOpacity>
            </View>

            {/* District Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>{t('home.filters.district')}</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => {
                  const districtOptions = [t('home.filters.allDistricts'), ...availableDistricts];
                  Alert.alert(
                    t('home.filters.selectDistrict'),
                    t('home.filters.chooseDistrict'),
                    [
                      ...districtOptions.map(district => ({
                        text: district,
                        onPress: () => setFilters(prev => ({
                          ...prev,
                          selectedDistrict: district === t('home.filters.allDistricts') ? '__all__' : district,
                          selectedCity: '__all__'
                        }))
                      })),
                      { text: t('home.filters.cancel'), style: 'cancel' },
                    ]
                  );
                }}
                disabled={filters.selectedState === '__all__'}
              >
                <Text style={[styles.selectButtonText, filters.selectedState === '__all__' && styles.disabledText]}>
                  {filters.selectedDistrict === '__all__' ? t('home.filters.allDistricts') : filters.selectedDistrict}
                </Text>
              </TouchableOpacity>
            </View>

            {/* City Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>{t('home.filters.city')}</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => {
                  const cityOptions = [t('home.filters.allCities'), ...availableCities];
                  Alert.alert(
                    t('home.filters.selectCity'),
                    t('home.filters.chooseCity'),
                    [
                      ...cityOptions.map(city => ({
                        text: city,
                        onPress: () => setFilters(prev => ({ ...prev, selectedCity: city === t('home.filters.allCities') ? '__all__' : city }))
                      })),
                      { text: t('home.filters.cancel'), style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={styles.selectButtonText}>
                  {filters.selectedCity === '__all__' ? t('home.filters.allCities') : filters.selectedCity}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Pin Code Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>{t('home.filters.pinCode')}</Text>
              <TextInput
                style={styles.textInput}
                value={filters.selectedPincode}
                onChangeText={(text) => setFilters(prev => ({ ...prev, selectedPincode: text }))}
                placeholder={t('home.filters.enterPinCode')}
                keyboardType="numeric"
              />
            </View>

            {/* Product Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>{t('home.filters.productTypes')}</Text>
              {allProductTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.checkboxRow}
                  onPress={() => {
                    setFilters(prev => ({
                      ...prev,
                      selectedProductTypes: prev.selectedProductTypes.includes(type)
                        ? prev.selectedProductTypes.filter(t => t !== type)
                        : [...prev.selectedProductTypes, type]
                    }));
                  }}
                >
                  <View style={[
                    styles.checkbox,
                    filters.selectedProductTypes.includes(type) && styles.checkboxChecked
                  ]}>
                    {filters.selectedProductTypes.includes(type) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={handleClearFilters}>
              <Text style={styles.resetButtonText}>{t('home.filters.reset')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setFiltersVisible(false)}
            >
              <Text style={styles.applyButtonText}>{t('home.filters.apply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'processing':
        return '#3b82f6';
      case 'shipped':
        return '#8b5cf6';
      case 'delivered':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  useEffect(() => {
    if (!isGuest && shouldLoginAfterGuest) {
      router.push('/auth/phone');
      setShouldLoginAfterGuest(false);
    }
  }, [isGuest, shouldLoginAfterGuest, router]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="white" animated={true} barStyle="dark-content" />
      {/* Fixed Header with Notification and Profile */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.locationContainer}
          >
            <IconSymbol size={16} name="location.fill" color="#af4b0e" />
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.locationText}>{userLocationText}</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            {isGuest && (
              <TouchableOpacity style={styles.notificationButton} onPress={() => setLanguageModalVisible(true)}>
                <IconSymbol size={24} name="globe" color="#1a1a1a" />
              </TouchableOpacity>
            )}
            {isGuest ? (
              <TouchableOpacity
                style={[styles.profileButton, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#af4b0e', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 }]}
                onPress={() => {
                  clearGuest();
                  setTimeout(() => {
                    router.replace('/auth/phone');
                  }, 100);
                }}
              >
                <Text style={{ color: '#af4b0e', fontWeight: 'bold', fontSize: 14 }}>{t('buttons.login')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => {
                  router.push('/profile');
                }}
              >
                <View style={styles.profileAvatar}>
                  <IconSymbol size={20} name="person.fill" color="#fff" />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Scrollable Content Area */}
      <ScrollView
        style={styles.scrollableContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#af4b0e']}
            tintColor="#af4b0e"
          />
        }
      >
        {/* Welcome Text Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            {t('home.welcome.title', { name: user?.name || (isGuest ? 'Guest' : t('home.welcome.guest')) })} 👋
          </Text>
          <Text style={styles.subtitle}>
            {t('home.welcome.subtitle')}
          </Text>

          {filters.nearMeActive && (
            <View style={styles.nearMeBanner}>
              <Text style={styles.nearMeText}>
                {t('home.nearMe.banner', { location: userLocationText })}
              </Text>
            </View>
          )}

          {countryChanging && (
            <View style={styles.countryChangeBanner}>
              <ActivityIndicator size="small" color="#af4b0e" />
              <Text style={styles.countryChangeText}>
                Switching to {userCountry.name}
              </Text>
            </View>
          )}
        </View>

        {/* Content Carousel Section */}
        {contentLoading ? (
          <View style={styles.bannerSection}>
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonContent}>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonSubtitle} />
                <View style={styles.skeletonDescription} />
                <View style={styles.skeletonButton} />
              </View>
            </View>
          </View>
        ) : allContent.length > 0 ? (
          <View style={styles.bannerSection}>
            <ContentCarousel
              content={allContent}
              autoPlay={true}
              autoPlayInterval={5000}
              showIndicators={true}
              showNavigation={true}
            />
          </View>
        ) : null}

        {/* Marketplace Section */}
        <MarketplaceScreen userCountry={userCountry} ref={marketplaceRef} />
      </ScrollView>

      {/* Filter Modal */}
      {renderFiltersModal()}

      {/* Language Modal for Guest Users */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('home.language.selectLanguage')}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {availableLanguages.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                  onPress={async () => {
                    setLanguageLoading(true);

                    try {
                      // Change language
                      await i18n.changeLanguage(lang.code);

                      // Store the selected language for country detection
                      await AsyncStorage.setItem('selectedLanguage', JSON.stringify(lang));

                      setLanguageModalVisible(false);

                      // Directly set country based on language selection
                      const country = {
                        code: lang.country === 'Nepal' ? 'NP' : 'IN',
                        name: lang.country,
                        flag: lang.flag
                      };

                      setUserCountry(country);

                      // Store the new country in AsyncStorage for persistence
                      await storeUserCountry(country);

                      // The useEffect will automatically trigger handleCountryChange()
                      // No need to manually call loadData here

                    } catch (error) {
                    } finally {
                      setLanguageLoading(false);
                    }
                  }}
                >
                  <Text style={{ fontSize: 18, textAlign: 'center' }}>{lang.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 220,
  },
  locationText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 4,
    marginRight: 4,
    flex: 1,
    textOverflow: 'truncate',
    overflow: 'hidden',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    backgroundColor: '#af4b0e',
    borderRadius: 4,
  },
  profileButton: {
    marginLeft: 8,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#af4b0e',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    // marginBottom: 20,
  },
  searchContainer: {
    // marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    // marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#af4b0e',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  nearMeBanner: {
    backgroundColor: '#af4b0e',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    marginHorizontal: 20,
  },
  nearMeText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  countryChangeBanner: {
    backgroundColor: '#fcfcfc',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryChangeText: {
    fontSize: 14,
    color: '#808080',
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  viewAllText: {
    fontSize: 14,
    color: '#af4b0e',
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  orderProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderManufacturerName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#af4b0e',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  manufacturerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  manufacturerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  manufacturerInfo: {
    flex: 1,
  },
  manufacturerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  manufacturerLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  manufacturerDistance: {
    fontSize: 12,
    color: '#666',
  },
  eentBazaarCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eentBazaarName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#af4b0e',
  },
  eentBazaarLocation: {
    fontSize: 14,
    color: '#af4b0e',
  },
  eentBazaarBadge: {
    fontSize: 12,
    color: '#af4b0e',
    fontWeight: '600',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eentBazaarActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  manufacturerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  bulkInquiryButton: {
    backgroundColor: '#af4b0e',
    padding: 8,
    borderRadius: 8,
  },
  bulkInquiryButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  contactAdminButton: {
    backgroundColor: '#af4b0e',
    padding: 8,
    borderRadius: 8,
  },
  contactAdminButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  productsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#af4b0e',
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  quoteButton: {
    backgroundColor: '#af4b0e',
  },
  quoteButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  orderButton: {
    backgroundColor: '#af4b0e',
  },
  orderButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  inquiryButton: {
    backgroundColor: '#af4b0e',
  },
  inquiryButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  modalOverlay: {
    height: 700,
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    minHeight: 320,
    maxHeight: 400,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#af4b0e',
  },
  filtersContent: {
    flex: 1,
    marginBottom: 20,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#af4b0e',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    backgroundColor: '#af4b0e',
    borderRadius: 8,
    marginLeft: -8,
  },
  sliderValue: {
    fontSize: 12,
    color: '#666',
    minWidth: 20,
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  priceSeparator: {
    fontSize: 16,
    color: '#666',
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  selectButtonText: {
    fontSize: 14,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#af4b0e',
    borderColor: '#af4b0e',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#af4b0e',
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  disabledText: {
    color: '#ccc',
  },
  clearSearchButton: {
    padding: 8,
    borderRadius: 8,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#af4b0e',
    fontWeight: '600',
  },
  filterIconContainer: {
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#af4b0e',
    borderRadius: 12,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  filterBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  bannerSection: {
    backgroundColor: '#fff',
    marginVertical: 10,
    paddingHorizontal: 0,
  },
  skeletonCard: {
    width: '100%',
    height: 180,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginHorizontal: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  skeletonContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  skeletonTitle: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: '80%',
  },
  skeletonSubtitle: {
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: '60%',
  },
  skeletonDescription: {
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 12,
    width: '90%',
  },
  skeletonButton: {
    height: 32,
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    width: 100,
  },
  scrollableContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
});
