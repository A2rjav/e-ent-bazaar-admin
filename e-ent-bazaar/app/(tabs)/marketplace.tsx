import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    FlatList,
    Alert,
    Modal,
    ActivityIndicator,
    RefreshControl,
    Linking,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
    getProductsWithManufacturer,
    getProductsByCategory,
    searchProducts,
    getProductCategories,
    ProductWithManufacturer
} from '../../lib/productService';
import { createOrder } from '../../lib/orderService';
import { createQuotation } from '../../lib/quotationService';
import { createInquiry } from '../../lib/inquiryService';
import { getCurrentLocation } from '../../utils/geocode';
import { haversineDistance } from '../../utils/haversine';
import {
    getAvailableStates,
    getAvailableDistricts,
    extractCitiesFromManufacturers,
    extractStatesFromManufacturers,
    extractDistrictsFromManufacturers,
    getStates,
    getDistrictsByState,
} from '../../lib/locationData';
import { detectUserCountry, getCountryAwareLocationData, storeUserCountry } from '../../lib/countryDetection';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { saveManufacturerRating } from '../../lib/manufacturerService';
import i18next from 'i18next';
import { createSampleOrder } from '../../lib/sampleOrderService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    pincode?: string;
    products: ProductWithManufacturer[];
    is_featured?: boolean;
    is_handmade_bricks_featured?: boolean;
    is_verified?: boolean;
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

// Static product types for filter
const allProductTypesStatic = [
    'Handmade Bricks',
    'Machine Clay Products',
    'Clay Bricks',
    'AAC Blocks',
    'Fly Ash Bricks',
    'Red Bricks',
    'Cement Bricks',
    'Blocks',
    'Other',
];

interface MarketplaceProps {
    userCountry?: { code: string; name: string; flag: string };
}

// Sanitize pincode values entered in filter modal to keep them numeric and capped at 6 digits
const sanitizePincodeInput = (value: string) => value.replace(/\D/g, '').slice(0, 6);

// Sanitize phone inputs to digits-only capped at 10 characters
const sanitizePhoneInput = (value: string) => value.replace(/\D/g, '').slice(0, 10);

const MarketplaceScreen = forwardRef<{ refresh: () => Promise<void> }, MarketplaceProps>((props, ref) => {
    const userCountry = props.userCountry;
    const { user, isGuest } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();
    const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
    const [filteredManufacturers, setFilteredManufacturers] = useState<Manufacturer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [orderModalVisible, setOrderModalVisible] = useState(false);
    const [quoteModalVisible, setQuoteModalVisible] = useState(false);
    const [inquiryModalVisible, setInquiryModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<ProductWithManufacturer | null>(null);
    const [selectedManufacturer, setSelectedManufacturer] = useState<Manufacturer | null>(null);
    const [orderDetails, setOrderDetails] = useState({
        quantity: '',
        deliveryAddress: '',
        contactNumber: '',
    });
    const [quoteDetails, setQuoteDetails] = useState({
        quantity: '',
        quotedPrice: '',
        message: '',
    });
    const [inquiryDetails, setInquiryDetails] = useState({
        subject: '',
        message: '',
    });
    const [placingOrder, setPlacingOrder] = useState(false);
    const [sendingQuote, setSendingQuote] = useState(false);
    const [sendingInquiry, setSendingInquiry] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [filters, setFilters] = useState<FilterState>({
        maxDistance: 0, // 0 means 'no filter'
        priceRange: [0, 20],
        selectedProductTypes: [],
        selectedState: '__all__',
        selectedDistrict: '__all__',
        selectedCity: '__all__',
        selectedPincode: '',
        nearMeActive: false,
    });
    const [profileLocation, setProfileLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [nearMeLocation, setNearMeLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [nearMeActive, setNearMeActive] = useState(false);
    const [ratingModalVisible, setRatingModalVisible] = useState(false);
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingComment, setRatingComment] = useState('');
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    const [selectedRatingManufacturer, setSelectedRatingManufacturer] = useState<Manufacturer | null>(null);
    // Add distanceFilterApplied state
    const [distanceFilterApplied, setDistanceFilterApplied] = useState(false);
    const [languageModalVisible, setLanguageModalVisible] = useState(false);
    const availableLanguages = [
        { code: 'en', label: 'English', name: 'English', nativeName: 'English', country: 'India', flag: '🇮🇳', phoneCode: '+91' },
        { code: 'hi', label: 'हिन्दी', name: 'Hindi', nativeName: 'हिंदी', country: 'India', flag: '🇮🇳', phoneCode: '+91' },
        { code: 'bn', label: 'বাংলা', name: 'Bengali', nativeName: 'বাংলা', country: 'India', flag: '🇮🇳', phoneCode: '+91' },
        { code: 'ne', label: 'नेपाली', name: 'Nepali', nativeName: 'नेपाली', country: 'Nepal', flag: '🇳🇵', phoneCode: '+977' },
        { code: 'pa', label: 'ਪੰਜਾਬੀ', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', country: 'India', flag: '🇮🇳', phoneCode: '+91' },
    ];
    const [stateModalVisible, setStateModalVisible] = useState(false);
    const [districtModalVisible, setDistrictModalVisible] = useState(false);
    const [cityModalVisible, setCityModalVisible] = useState(false);
    const [sampleOrderModalVisible, setSampleOrderModalVisible] = useState(false);
    const [sampleOrderDetails, setSampleOrderDetails] = useState({
        quantity: '',
        deliveryAddress: '',
        contactNumber: '',
    });
    const [placingSampleOrder, setPlacingSampleOrder] = useState(false);
    const [selectedSampleProduct, setSelectedSampleProduct] = useState<ProductWithManufacturer | null>(null);
    const [selectedSampleManufacturer, setSelectedSampleManufacturer] = useState<Manufacturer | null>(null);

    // Country detection state
    // const [userCountry, setUserCountry] = useState(userCountryFromProps || { code: 'IN', name: 'India', flag: '🇮🇳' });
    const [isCountryDetecting, setIsCountryDetecting] = useState(true);

    // Comprehensive country change handler for marketplace
    const handleCountryChange = useCallback(async () => {
        try {
            setLoading(true);

            // Reset all data first
            setManufacturers([]);
            setFilteredManufacturers([]);

            // Reset filters to default for new country
            const defaultFilters: FilterState = {
                maxDistance: 0,
                priceRange: [0, 20],
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

            // Clear location-based filters
            setNearMeLocation(null);
            setNearMeActive(false);
            setDistanceFilterApplied(false);

            // Load fresh data for new country
            await loadProducts();

        } catch (error) {
        } finally {
            setLoading(false);
        }
    }, [userCountry?.code]);

    // Reload products when country changes - with proper loading states
    useEffect(() => {
        handleCountryChange();

    }, [userCountry?.code, handleCountryChange]);

    // Get available states and districts for filters (country-aware)
    const availableStates = userCountry?.code === 'NP'
        ? getAvailableStates('Nepal')
        : getAvailableStates('India');


    const availableDistricts = filters.selectedState !== '__all__'
        ? getAvailableDistricts(userCountry?.name || '', filters.selectedState)
        : [];

    const availableCities = extractCitiesFromManufacturers(manufacturers);

    // Extract product types from manufacturers
    const allProductTypes = allProductTypesStatic;

    const loadProducts = async () => {
        console.log("🚀 ~ loadProducts ~ userCountry?.code:", userCountry?.code)
        try {

            // Fetch manufacturers directly like web app
            // Add country-based filtering if user country is detected
            let query = supabase
                .from("manufacturers")
                .select("*, is_featured, is_verified")
                .in("status", ["approved", "waitlist"])
                .order("updated_at", { ascending: false }); // Add ordering to ensure fresh data

            if (userCountry?.code === 'NP') {
                // For Nepal: Only show manufacturers explicitly marked as Nepal
                query = query.eq("country", "Nepal");
            } else if (userCountry?.code === 'IN') {
                // For India: Show manufacturers marked as India OR with no country (fallback to India)
                query = query.or("country.eq.India,country.is.null");
            } else {
                // For other countries: Only show manufacturers explicitly marked for that country
                query = query.eq("country", userCountry?.name);
            }

            const { data: manufacturersData, error: manufacturersError } = await query;
            console.log("🚀 ~ loadProducts ~ manufacturersData:", manufacturersData)


            if (manufacturersError) {
                console.error("Error fetching approved manufacturers:", manufacturersError);
                throw manufacturersError;
            }

            // Use only approved and waitlist manufacturers
            let manufacturersToUse = manufacturersData || [];



            // Format manufacturers with their products
            const formattedManufacturersRaw = await Promise.all(
                manufacturersToUse.map(async (manufacturer) => {
                    let products = [];
                    try {
                        // Get products for this manufacturer
                        const { data: fetchedProducts, error } = await supabase
                            .from("products")
                            .select("*")
                            .eq("manufacturer_id", manufacturer.id)
                            .eq("is_available", true)
                            .order("created_at", { ascending: false });

                        if (!error && fetchedProducts) {
                            products = fetchedProducts.map(product => ({
                                ...product,
                                manufacturer_name: manufacturer.company_name || manufacturer.name,
                                manufacturer_company_name: manufacturer.company_name,
                                manufacturer_location: manufacturer.city && manufacturer.state
                                    ? `${manufacturer.city}${manufacturer.district ? `, ${manufacturer.district}, ` : ', '}${manufacturer.state}`
                                    : undefined,
                                manufacturer_latitude: manufacturer.latitude,
                                manufacturer_longitude: manufacturer.longitude,
                            }));
                        }
                    } catch (err) {
                        console.error("Error fetching products for manufacturer", manufacturer.id, err);
                    }

                    // Filter products based on verification status
                    let filteredProducts = products;

                    // If manufacturer is NOT verified, filter out Machine Clay Products
                    if (!manufacturer.is_verified) {
                        filteredProducts = products.filter(product =>
                            product.category !== 'Machine Clay Products'
                        );
                    }

                    // IMPORTANT: Don't filter out manufacturers completely
                    // Even if they have no products after filtering, they might have other products
                    // The filtering will be handled later in the product display logic

                    return {
                        id: manufacturer.id,
                        name: manufacturer.company_name || manufacturer.name || "Brick Manufacturer",
                        company_name: manufacturer.company_name || manufacturer.name,
                        city: manufacturer.city || "",
                        state: manufacturer.state || "",
                        district: manufacturer.district,
                        latitude: manufacturer.latitude || undefined,
                        longitude: manufacturer.longitude || undefined,
                        distance: 0,
                        pincode: manufacturer.pincode,
                        products: filteredProducts,
                        is_featured: manufacturer.is_featured || false,
                        is_verified: manufacturer.is_verified || false,
                    };
                })
            );

            // Use all manufacturers (no null filtering needed)
            const formattedManufacturers = formattedManufacturersRaw;


            // For handmade bricks filter, we'll handle this differently in the filter logic
            // For now, keep all manufacturers (we'll filter by products in the filter logic)
            const manufacturersWithProducts = formattedManufacturers;

            // Calculate distances if user location is available
            const userLat = user && user.latitude ? parseFloat(user.latitude as any) : null;
            const userLng = user && user.longitude ? parseFloat(user.longitude as any) : null;

            if (userLat !== null && userLng !== null) {
                manufacturersWithProducts.forEach(manufacturer => {
                    const manuLat = manufacturer.latitude !== undefined ? parseFloat(manufacturer.latitude as any) : null;
                    const manuLng = manufacturer.longitude !== undefined ? parseFloat(manufacturer.longitude as any) : null;
                    if (
                        manuLat !== null && manuLng !== null &&
                        !isNaN(manuLat) && !isNaN(manuLng) &&
                        !isNaN(userLat) && !isNaN(userLng)
                    ) {
                        manufacturer.distance = haversineDistance(userLat, userLng, manuLat, manuLng);
                    } else {
                        manufacturer.distance = 0;
                    }
                });
            } else {
                // fallback logic (Mumbai)
                const defaultLocation = { latitude: 19.0760, longitude: 72.8777 };
                manufacturersWithProducts.forEach(manufacturer => {
                    const manuLat = manufacturer.latitude !== undefined ? parseFloat(manufacturer.latitude as any) : null;
                    const manuLng = manufacturer.longitude !== undefined ? parseFloat(manufacturer.longitude as any) : null;
                    if (manuLat !== null && manuLng !== null && !isNaN(manuLat) && !isNaN(manuLng)) {
                        manufacturer.distance = haversineDistance(
                            defaultLocation.latitude,
                            defaultLocation.longitude,
                            manuLat,
                            manuLng
                        );
                    } else {
                        manufacturer.distance = 0;
                    }
                });
            }


            setManufacturers(manufacturersWithProducts);
            setFilteredManufacturers(manufacturersWithProducts);

        } catch (error) {
            console.error('Error loading manufacturers:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {

            // Load products with current country
            await loadProducts();

        } catch (error) {
        } finally {
            setRefreshing(false);
        }
    };


    // Expose refresh function to parent component
    useImperativeHandle(ref, () => ({
        refresh: async () => {
            await onRefresh();
        }
    }));

    useEffect(() => {

        loadProducts();

    }, [isCountryDetecting, userCountry?.code]);

    // Load user location from profile data and apply initial filters
    useEffect(() => {
        const loadUserLocation = async () => {
            if (user && user.latitude && user.longitude) {
                setUserLocation({
                    latitude: user.latitude,
                    longitude: user.longitude
                });
            } else {
            }

            // Apply initial filters based on user location like web app
            if (user && user.state) {

                setFilters(prev => ({
                    ...prev,
                    selectedState: user.state || '__all__',
                    selectedDistrict: user.district || '__all__',
                    selectedCity: user.city || '__all__',
                    selectedPincode: user.pin_code || ''
                    // Do NOT set maxDistance here!
                }));
            }
        };

        loadUserLocation();
    }, [user]);

    // Reload products when user location changes to recalculate distances
    useEffect(() => {
        if (userLocation) {
            loadProducts();
        }
    }, [userLocation]);

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

        // Near Me filter - this should be applied first and override other location filters
        if (filters.nearMeActive && nearMeLocation) {
            const beforeNearMe = filtered.length;
            filtered = filtered.filter(manufacturer => {
                // Skip E-Ent Bazaar for near me filter
                if (manufacturer.id === 'eent-bazaar') {
                    return true;
                }

                // Robust coordinate parsing
                let manuLat = manufacturer.latitude;
                let manuLng = manufacturer.longitude;
                if (typeof manuLat === 'string') manuLat = parseFloat(manuLat);
                if (typeof manuLng === 'string') manuLng = parseFloat(manuLng);

                // Debug log for coordinates


                if (
                    manuLat === undefined || manuLng === undefined ||
                    manuLat === null || manuLng === null ||
                    isNaN(manuLat) || isNaN(manuLng)
                ) {
                    return false;
                }

                // Calculate distance from current location
                const distance = haversineDistance(
                    nearMeLocation.latitude,
                    nearMeLocation.longitude,
                    manuLat,
                    manuLng
                );


                // Only show manufacturers within 100km
                return distance <= 100;
            });
        }

        // If no filters are applied, show all manufacturers that match the search
        const noFilters =
            filters.maxDistance === 100 &&
            filters.priceRange[0] === 0 &&
            filters.priceRange[1] === 20 &&
            filters.selectedProductTypes.length === 0 &&
            (filters.selectedState === '__all__' || !filters.selectedState) &&
            (filters.selectedDistrict === '__all__' || !filters.selectedDistrict) &&
            (filters.selectedCity === '__all__' || !filters.selectedCity) &&
            !filters.selectedPincode &&
            !filters.nearMeActive;



        if (noFilters) {
            // Just show filtered manufacturers from the database, sorted by is_featured
            filtered = [
                ...filtered.filter(m => m.is_featured),
                ...filtered.filter(m => !m.is_featured)
            ];
            setFilteredManufacturers(filtered);
            return;
        }

        // Distance filter (only apply if Near Me is not active)
        if (!filters.nearMeActive && distanceFilterApplied && filters.maxDistance > 0 && userLocation) {
            const beforeDistance = filtered.length;
            filtered = filtered.filter(manufacturer => {
                if (!manufacturer.distance || manufacturer.distance === 0) return false;
                return manufacturer.distance <= filters.maxDistance;
            });
        }

        // State filter (only apply if Near Me is not active)
        if (!filters.nearMeActive && filters.selectedState !== '__all__') {
            const beforeState = filtered.length;
            filtered = filtered.filter(manufacturer =>
                manufacturer.state === filters.selectedState
            );
        }

        // District filter (only apply if Near Me is not active)
        if (!filters.nearMeActive && filters.selectedDistrict !== '__all__') {
            const beforeDistrict = filtered.length;
            filtered = filtered.filter(manufacturer =>
                manufacturer.district === filters.selectedDistrict
            );
        }

        // City filter (only apply if Near Me is not active)
        if (!filters.nearMeActive && filters.selectedCity !== '__all__') {
            const beforeCity = filtered.length;
            filtered = filtered.filter(manufacturer =>
                manufacturer.city === filters.selectedCity
            );
        }

        // Pin code filter (only apply if Near Me is not active)
        if (!filters.nearMeActive && filters.selectedPincode.trim() !== '') {
            const beforePincode = filtered.length;
            filtered = filtered.filter(manufacturer => {
                const manufacturerPincode = (manufacturer.pincode || '').toString().trim();
                const filterPincode = filters.selectedPincode.toString().trim();
                return manufacturerPincode && filterPincode && manufacturerPincode === filterPincode;
            });
        }

        // Product type filter
        if (filters.selectedProductTypes.length > 0) {
            const beforeProductType = filtered.length;

            // Special handling for Handmade Bricks - respect location filters but include manufacturers with no products
            if (filters.selectedProductTypes.includes('Handmade Bricks')) {
                // Get manufacturers with handmade bricks in the current filtered location
                const handmadeManufacturers = filtered.filter(manufacturer =>
                    manufacturer.products.some(product => product.category === 'Handmade Bricks')
                );

                // Get manufacturers with NO products in the current filtered location
                const manufacturersWithNoProducts = filtered.filter(manufacturer =>
                    manufacturer.products.length === 0
                );

                // For other selected product types, apply normal location filtering
                const otherProductTypes = filters.selectedProductTypes.filter(type => type !== 'Handmade Bricks');
                let otherFiltered = filtered;

                if (otherProductTypes.length > 0) {
                    otherFiltered = filtered.map(manufacturer => ({
                        ...manufacturer,
                        products: manufacturer.products.filter(product =>
                            otherProductTypes.includes(product.category)
                        )
                    })).filter(manufacturer => manufacturer.products.length > 0);
                }

                // Combine: handmade manufacturers + manufacturers with no products + other filtered manufacturers
                const allHandmadeIds = new Set([
                    ...handmadeManufacturers.map(m => m.id),
                    ...manufacturersWithNoProducts.map(m => m.id)
                ]);
                const otherFilteredIds = new Set(otherFiltered.map(m => m.id));

                // Add handmade manufacturers and manufacturers with no products that aren't already in other filtered
                [...handmadeManufacturers, ...manufacturersWithNoProducts].forEach(manu => {
                    if (!otherFilteredIds.has(manu.id)) {
                        otherFiltered.push(manu);
                    }
                });

                filtered = otherFiltered;
            } else {
                // Normal product type filtering for non-handmade selections
                filtered = filtered.map(manufacturer => ({
                    ...manufacturer,
                    products: manufacturer.products.filter(product =>
                        filters.selectedProductTypes.includes(product.category)
                    )
                })).filter(manufacturer => manufacturer.products.length > 0);
            }

        }

        // Special logic: If 'Machine Clay Products' is selected, always include those manufacturers
        if (filters.selectedProductTypes.includes('Machine Clay Products')) {
            const machineClayManufacturers = manufacturers.filter(manu =>
                manu.products.some(product => product.category === 'Machine Clay Products')
            );
            // Merge, avoiding duplicates
            const filteredIds = new Set(filtered.map(m => m.id));
            machineClayManufacturers.forEach(manu => {
                if (!filteredIds.has(manu.id)) {
                    filtered.push(manu);
                }
            });
        }

        // Price range filter
        if (filters.priceRange[0] > 0 || filters.priceRange[1] < 20) {
            const beforePrice = filtered.length;
            filtered = filtered.map(manufacturer => ({
                ...manufacturer,
                products: manufacturer.products.filter(product =>
                    product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
                )
            })).filter(manufacturer => manufacturer.products.length > 0);
        }

        // After all filters are applied, ensure all is_featured manufacturers are at the top and always included
        const featured = manufacturers.filter(m => m.is_featured);
        // Remove any featured manufacturers from filtered (to avoid duplicates)
        const filteredNonFeatured = filtered.filter(m => !m.is_featured);

        // Final list: all featured (always at top, always included), then the rest
        let finalList = [...featured, ...filteredNonFeatured];

        // IMPORTANT: Filter logic for manufacturers with no products
        // Case 1: No filters selected - show all manufacturers (including those with no products)
        // Case 2: Handmade bricks selected - show manufacturers with no products + handmade products
        // Case 3: Other filters selected - only show manufacturers with products
        const noFiltersSelected =
            filters.selectedProductTypes.length === 0 &&
            filters.selectedState === '__all__' &&
            filters.selectedDistrict === '__all__' &&
            filters.selectedCity === '__all__' &&
            !filters.selectedPincode &&
            !filters.nearMeActive &&
            filters.maxDistance === 0 &&
            filters.priceRange[0] === 0 &&
            filters.priceRange[1] === 20;

        if (!noFiltersSelected && !filters.selectedProductTypes.includes('Handmade Bricks')) {
            // Filter out manufacturers with no products for non-handmade selections
            finalList = finalList.filter(manufacturer => manufacturer.products.length > 0);
        }

        // Special logic: If 'Machine Clay Products' is selected, always include those manufacturers (even with Near Me)
        if (filters.selectedProductTypes.includes('Machine Clay Products')) {
            const machineClayManufacturers = manufacturers.filter(manu =>
                manu.products.some(product => product.category === 'Machine Clay Products')
            );
            const finalIds = new Set(finalList.map(m => m.id));
            machineClayManufacturers.forEach(manu => {
                if (!finalIds.has(manu.id)) {
                    finalList.push(manu);
                }
            });
        }

        // Special logic: If 'Handmade Bricks' is selected, always show E-Ent Bazaar first with highlighted badge
        if (filters.selectedProductTypes.includes('Handmade Bricks')) {
            // Find E-Ent Bazaar manufacturer
            const eentBazaar = finalList.find(m =>
                m.name.toLowerCase().includes('e-ent') ||
                m.name.toLowerCase().includes('eent') ||
                m.company_name.toLowerCase().includes('e-ent') ||
                m.company_name.toLowerCase().includes('eent')
            );

            if (eentBazaar) {
                // Remove E-Ent Bazaar from current position
                const withoutEentBazaar = finalList.filter(m => m.id !== eentBazaar.id);
                // Add E-Ent Bazaar at the beginning with highlighted badge
                const eentBazaarWithBadge = {
                    ...eentBazaar,
                    is_featured: true, // This will show the highlighted badge
                    is_handmade_bricks_featured: true // Custom flag for handmade bricks
                };
                finalList.length = 0; // Clear the array
                finalList.push(eentBazaarWithBadge, ...withoutEentBazaar);
            }
        }

        setFilteredManufacturers(finalList);
        return;
    }, [manufacturers, searchQuery, filters, userLocation, nearMeLocation, t, distanceFilterApplied]);

    // Update active filters
    useEffect(() => {
        const newActiveFilters: string[] = [];

        if (distanceFilterApplied && filters.maxDistance > 0) {
            newActiveFilters.push(`Distance: ${filters.maxDistance}km`);
        }

        if (filters.priceRange[0] > 0 || filters.priceRange[1] < 20) {
            newActiveFilters.push(`Price: ₹${filters.priceRange[0]}-₹${filters.priceRange[1]}`);
        }

        if (filters.selectedProductTypes.length > 0) {
            newActiveFilters.push(`Types: ${filters.selectedProductTypes.length} selected`);
        }

        if (filters.selectedState !== '__all__') {
            newActiveFilters.push(`State: ${filters.selectedState}`);
        }

        if (filters.selectedDistrict !== '__all__') {
            newActiveFilters.push(`District: ${filters.selectedDistrict}`);
        }

        if (filters.selectedCity !== '__all__') {
            newActiveFilters.push(`City: ${filters.selectedCity}`);
        }

        if (filters.selectedPincode) {
            newActiveFilters.push(`Pin Code: ${filters.selectedPincode}`);
        }

        if (filters.nearMeActive) {
            newActiveFilters.push('Near Me Active');
        }

        setActiveFilters(newActiveFilters);
    }, [filters, distanceFilterApplied]);

    // On mount, set default product type filter from AsyncStorage
    useEffect(() => {
        (async () => {
            const brickType = await AsyncStorage.getItem('selectedBrickType');
            if (brickType && allProductTypesStatic.includes(brickType)) {
                setFilters(prev => ({
                    ...prev,
                    selectedProductTypes: [brickType],
                }));
            }
        })();
    }, [userCountry]);

    const handleRequestQuote = (product: ProductWithManufacturer, manufacturer: Manufacturer) => {
        if (isGuest) {
            Alert.alert(t('marketplace.guestTitle'), t('marketplace.guestRequestQuote'));
            return;
        }
        if (!user) {
            Alert.alert(t('marketplace.loginRequired'), t('marketplace.loginToRequestQuote'));
            return;
        }
        setSelectedProduct(product);
        setSelectedManufacturer(manufacturer);
        setQuoteModalVisible(true);
    };

    const handleRequestInquiry = (manufacturer: Manufacturer) => {
        if (isGuest) {
            Alert.alert(t('marketplace.guestTitle'), t('marketplace.guestSendInquiry'));
            return;
        }
        if (!user) {
            Alert.alert(t('marketplace.loginRequired'), t('marketplace.loginToSendInquiry'));
            return;
        }
        setSelectedManufacturer(manufacturer);
        setInquiryDetails({
            subject: '',
            message: '',
        });
        setInquiryModalVisible(true);
    };

    const handleSubmitQuote = async () => {
        const quantity = parseInt(quoteDetails.quantity);
        const quotedPrice = parseFloat(quoteDetails.quotedPrice);

        if (isNaN(quantity) || quantity <= 0) {
            Alert.alert(t('marketplace.error'), t('marketplace.validQuantity'));
            return;
        }

        if (isNaN(quotedPrice) || quotedPrice <= 0) {
            Alert.alert(t('marketplace.error'), t('marketplace.validQuotedPrice'));
            return;
        }

        if (!user?.id || !selectedProduct || !selectedManufacturer) {
            Alert.alert(t('marketplace.error'), t('marketplace.missingInfo'));
            return;
        }

        const totalAmount = quantity * quotedPrice;

        Alert.alert(
            t('marketplace.confirmQuote'),
            `${t('marketplace.quoteDetails')}:\n\n${t('marketplace.product')}: ${selectedProduct.name}\n${t('marketplace.manufacturer')}: ${selectedManufacturer.name}\n${t('marketplace.quantity')}: ${quantity}\n${t('marketplace.quotedPricePerUnit')}: ₹${quotedPrice}\n${t('marketplace.totalAmount')}: ₹${totalAmount.toLocaleString()}\n\n${t('marketplace.message')}: ${quoteDetails.message || t('marketplace.noMessage')}`,
            [
                { text: t('marketplace.cancel'), style: 'cancel' },
                {
                    text: t('marketplace.sendRequest'),
                    onPress: async () => {
                        try {
                            setQuoteModalVisible(false);
                            setSendingQuote(true);

                            const quotationData = {
                                customer_id: user.id,
                                manufacturer_id: selectedProduct.manufacturer_id,
                                product_id: selectedProduct.id,
                                quantity,
                                quoted_price: quotedPrice,
                                total_amount: totalAmount,
                                message: quoteDetails.message || undefined,
                            };

                            const newQuotation = await createQuotation(quotationData);

                            if (newQuotation) {
                                Alert.alert(
                                    t('marketplace.quoteSent'),
                                    t('marketplace.quoteSentMessage'),
                                    [
                                        {
                                            text: t('marketplace.viewQuotations'),
                                            onPress: () => router.push('/(tabs)/quotations')
                                        },
                                        {
                                            text: t('marketplace.continueShopping'),
                                            onPress: () => setQuoteModalVisible(false)
                                        }
                                    ]
                                );

                                // Reset form
                                setQuoteDetails({
                                    quantity: '',
                                    quotedPrice: '',
                                    message: '',
                                });
                            } else {
                                Alert.alert(t('marketplace.error'), t('marketplace.failedToSendQuote'));
                            }
                        } catch (error) {
                            console.error('Error sending quote request:', error);
                            Alert.alert(t('marketplace.error'), t('marketplace.failedToSendQuote'));
                        } finally {
                            setSendingQuote(false);
                        }
                    }
                },
            ]
        );
    };

    const handleSubmitInquiry = async () => {
        if (!inquiryDetails.subject.trim()) {
            Alert.alert(t('marketplace.error'), t('marketplace.enterSubject'));
            return;
        }

        if (!inquiryDetails.message.trim()) {
            Alert.alert(t('marketplace.error'), t('marketplace.enterMessage'));
            return;
        }

        if (!user?.id || !selectedManufacturer) {
            Alert.alert(t('marketplace.error'), t('marketplace.missingInfo'));
            return;
        }

        Alert.alert(
            t('marketplace.confirmInquiry'),
            `${t('marketplace.inquiryDetails')}:\n\n${t('marketplace.subject')}: ${inquiryDetails.subject}\n${t('marketplace.manufacturer')}: ${selectedManufacturer.name}\n\n${t('marketplace.message')}: ${inquiryDetails.message}`,
            [
                { text: t('marketplace.cancel'), style: 'cancel' },
                {
                    text: t('marketplace.sendInquiry'),
                    onPress: async () => {
                        try {
                            setInquiryModalVisible(false);
                            setSendingInquiry(true);

                            const inquiryData = {
                                customer_id: user.id,
                                manufacturer_id: selectedManufacturer.id,
                                subject: inquiryDetails.subject,
                                message: inquiryDetails.message,
                                status: 'pending',
                            };

                            const newInquiry = await createInquiry(inquiryData);

                            if (newInquiry) {
                                Alert.alert(
                                    t('marketplace.inquirySent'),
                                    t('marketplace.inquirySentMessage', { manufacturer: selectedManufacturer.name }),
                                    [
                                        {
                                            text: t('marketplace.viewInquiries'),
                                            onPress: () => router.push('/(tabs)/inquiries')
                                        },
                                        {
                                            text: t('marketplace.continueShopping'),
                                            onPress: () => setInquiryModalVisible(false)
                                        }
                                    ]
                                );

                                // Reset form
                                setInquiryDetails({
                                    subject: '',
                                    message: '',
                                });
                            } else {
                                Alert.alert(t('marketplace.error'), t('marketplace.failedToSendInquiry'));
                            }
                        } catch (error) {
                            console.error('Error sending inquiry:', error);
                            Alert.alert(t('marketplace.error'), t('marketplace.failedToSendInquiry'));
                        } finally {
                            setSendingInquiry(false);
                        }
                    }
                },
            ]
        );
    };

    const handlePlaceOrder = (product: ProductWithManufacturer, manufacturer: Manufacturer) => {
        if (isGuest) {
            Alert.alert(t('marketplace.guestTitle'), t('marketplace.guestPlaceOrder'));
            return;
        }
        if (!user) {
            Alert.alert(t('marketplace.loginRequired'), t('marketplace.loginToPlaceOrder'));
            return;
        }
        setSelectedProduct(product);
        setSelectedManufacturer(manufacturer);
        setOrderDetails({
            quantity: '',
            deliveryAddress: '',
            contactNumber: '',
        });
        setOrderModalVisible(true);
    };

    const handleConfirmOrder = async () => {
        if (!selectedProduct || !selectedManufacturer || !user) return;

        const quantity = parseInt(orderDetails.quantity);
        if (isNaN(quantity) || quantity <= 0) {
            Alert.alert(t('marketplace.error'), t('marketplace.validQuantity'));
            return;
        }

        if (!orderDetails.deliveryAddress.trim()) {
            Alert.alert(t('marketplace.error'), t('marketplace.enterDeliveryAddress'));
            return;
        }

        if (!orderDetails.contactNumber.trim()) {
            Alert.alert(t('marketplace.error'), t('marketplace.enterContactNumber'));
            return;
        }

        if (orderDetails.contactNumber.trim().length !== 10) {
            Alert.alert(t('marketplace.error'), t('marketplace.contactNumberMustBe10Digits'));
            return;
        }

        try {
            setPlacingOrder(true);

            const orderData = {
                customer_id: user.id,
                manufacturer_id: selectedManufacturer.id,
                product_id: selectedProduct.id,
                quantity,
                price: selectedProduct.price,
                delivery_address: orderDetails.deliveryAddress,
                contact_number: orderDetails.contactNumber,
            };

            const newOrder = await createOrder(orderData);

            if (newOrder) {
                setOrderModalVisible(false);
                Alert.alert(
                    t('marketplace.orderPlaced'),
                    t('marketplace.orderPlacedMessage', { orderId: newOrder.id, totalAmount: newOrder.total_amount.toLocaleString() }),
                    [
                        {
                            text: t('marketplace.viewOrders'),
                            onPress: () => router.push('/(tabs)/orders')
                        },
                        {
                            text: t('marketplace.continueShopping'),
                            style: 'cancel'
                        }
                    ]
                );

                // Reset form
                setOrderDetails({
                    quantity: '',
                    deliveryAddress: '',
                    contactNumber: '',
                });
                setSelectedProduct(null);
                setSelectedManufacturer(null);
            } else {
                Alert.alert(t('marketplace.error'), t('marketplace.failedToPlaceOrder'));
            }
        } catch (error) {
            console.error('Error placing order:', error);
            Alert.alert(t('marketplace.error'), t('marketplace.failedToPlaceOrder'));
        } finally {
            setPlacingOrder(false);
        }
    };

    const handleProductPress = (product: ProductWithManufacturer) => {
        if (isGuest) return; // Prevent navigation for E-Ent Bazaar
        router.push(`/product-detail?id=${product.id}`);
    };

    const handleNearMe = async () => {
        setIsLocating(true);
        try {
            const location = await getCurrentLocation();
            if (location) {
                setNearMeLocation(location);
                setFilters(prev => ({
                    ...prev,
                    nearMeActive: true,
                    maxDistance: 100,
                    selectedState: '__all__',
                    selectedDistrict: '__all__',
                    selectedCity: '__all__',
                    selectedPincode: '',
                    // PRESERVE user's category and price filters
                    selectedProductTypes: prev.selectedProductTypes,
                    priceRange: prev.priceRange
                }));
                Alert.alert(t('marketplace.locationFound'), t('marketplace.nearMeApplied'));
            } else {
                Alert.alert(t('marketplace.locationError'), t('marketplace.locationPermissionError'));
            }
        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert(t('marketplace.locationError'), t('marketplace.locationTryAgain'));
        } finally {
            setIsLocating(false);
        }
    };

    const handleClearNearMe = () => {
        setNearMeLocation(null);
        setFilters(prev => ({
            ...prev,
            nearMeActive: false,
            maxDistance: 0, // Reset range filter to 0
            selectedState: '__all__',
            selectedDistrict: '__all__',
            selectedCity: '__all__',
            selectedPincode: '',
            // PRESERVE user's category and price filters
            selectedProductTypes: prev.selectedProductTypes,
            priceRange: prev.priceRange
        }));
        setDistanceFilterApplied(false); // Also reset distance filter applied
    };

    const handleClearFilters = () => {
        setFilters({
            maxDistance: 0,
            priceRange: [0, 20],
            selectedProductTypes: [],
            selectedState: '__all__',
            selectedDistrict: '__all__',
            selectedCity: '__all__',
            selectedPincode: '',
            nearMeActive: false,
        });
        setSearchQuery('');
        setDistanceFilterApplied(false);
        setFiltersVisible(false)
    };

    const getActiveFiltersCount = () => {
        return activeFilters.length;
    };

    const handleBulkInquiry = () => {
        if (isGuest) {
            Alert.alert(t('marketplace.guestTitle'), t('marketplace.guestBulkInquiry'));
            return;
        }
        if (!user) {
            Alert.alert(t('marketplace.loginRequired'), t('marketplace.loginToSendBulkInquiry'));
            return;
        }
        Alert.alert(
            t('marketplace.bulkInquiryTitle'),
            t('marketplace.bulkInquiryMessage'),
            [
                { text: t('marketplace.cancel'), style: 'cancel' },
                {
                    text: t('marketplace.sendBulkInquiry'),
                    onPress: () => {
                        Alert.alert(
                            t('marketplace.bulkInquirySent'),
                            t('marketplace.bulkInquirySentMessage'),
                            [
                                {
                                    text: t('marketplace.ok'),
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

    const handleRequestSample = (product: ProductWithManufacturer, manufacturer: Manufacturer) => {
        if (isGuest) {
            Alert.alert(t('marketplace.guestTitle'), 'Please login to request a sample.');
            return;
        }
        if (!user) {
            Alert.alert(t('marketplace.loginRequired'), 'Please login to request a sample.');
            return;
        }
        setSelectedSampleProduct(product);
        setSelectedSampleManufacturer(manufacturer);
        setSampleOrderDetails({
            quantity: '',
            deliveryAddress: '',
            contactNumber: '',
        });
        setSampleOrderModalVisible(true);
    };

    const handleConfirmSampleOrder = async () => {
        if (!selectedSampleProduct || !selectedSampleManufacturer || !user) return;
        const quantity = parseInt(sampleOrderDetails.quantity);
        if (isNaN(quantity) || quantity <= 0) {
            Alert.alert(t('marketplace.error'), 'Please enter a valid quantity.');
            return;
        }
        if (!sampleOrderDetails.deliveryAddress.trim()) {
            Alert.alert(t('marketplace.error'), 'Please enter a delivery address.');
            return;
        }
        if (!sampleOrderDetails.contactNumber.trim()) {
            Alert.alert(t('marketplace.error'), 'Please enter a contact number.');
            return;
        }
        if (sampleOrderDetails.contactNumber.trim().length !== 10) {
            Alert.alert(t('marketplace.error'), t('marketplace.contactNumberMustBe10Digits'));
            return;
        }
        try {
            setPlacingSampleOrder(true);
            const orderData = {
                customer_id: user.id,
                manufacturer_id: selectedSampleManufacturer.id,
                product_id: selectedSampleProduct.id,
                quantity,
                delivery_address: sampleOrderDetails.deliveryAddress,
                contact_number: sampleOrderDetails.contactNumber,
            };
            const newSampleOrder = await createSampleOrder(orderData);
            if (newSampleOrder) {
                setSampleOrderModalVisible(false);
                Alert.alert(
                    'Sample Request Placed',
                    'Your sample order has been placed successfully.',
                    [
                        {
                            text: 'OK',
                            onPress: () => { },
                        },
                    ]
                );
                setSampleOrderDetails({
                    quantity: '',
                    deliveryAddress: '',
                    contactNumber: '',
                });
                setSelectedSampleProduct(null);
                setSelectedSampleManufacturer(null);
            } else {
                Alert.alert('Error', 'Failed to place sample order.');
            }
        } catch (error) {
            console.error('Error placing sample order:', error);
            Alert.alert('Error', 'Failed to place sample order.');
        } finally {
            setPlacingSampleOrder(false);
        }
    };

    const handleWhatsAppOrder = async (product: ProductWithManufacturer, manufacturer: Manufacturer) => {
        const phoneNumber = '+918008007954'; // Admin WhatsApp number for ordering
        const message = `Hello! I want to place an order for ${product.name} from ${manufacturer.name}.\n\nProduct: ${product.name}\nPrice: ₹${product.price}/unit\nManufacturer: ${manufacturer.name}\nLocation: ${manufacturer.city}${manufacturer.district ? `, ${manufacturer.district}, ` : ', '}${manufacturer.state}\n\nPlease provide order details and payment information.`;

        // WhatsApp wa.me URLs require phone number in format: country code + number (without + sign)
        // Example: +918008007954 → 918008007954 (91 = India, 8008007954 = number)
        const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhoneNumber}?text=${encodeURIComponent(message)}`;

        try {
            // Use https://wa.me/ which works on both iOS and Android
            // If WhatsApp is installed, it will open WhatsApp; otherwise opens in browser
            const supported = await Linking.canOpenURL(whatsappUrl);
            if (supported) {
                await Linking.openURL(whatsappUrl);
            } else {
                // Fallback: try opening anyway (wa.me URLs work even if canOpenURL returns false on some iOS versions)
                await Linking.openURL(whatsappUrl);
            }
        } catch (err) {
            console.error('Error opening WhatsApp:', err);
            // Final fallback: try opening the URL directly
            try {
                await Linking.openURL(whatsappUrl);
            } catch (fallbackErr) {
                Alert.alert('Error', 'Could not open WhatsApp. Please make sure WhatsApp is installed.');
            }
        }
    };

    const renderProduct = ({ item: product }: { item: ProductWithManufacturer }) => {
        const manufacturer = manufacturers.find(m => m.products.includes(product));
        return (
            <TouchableOpacity
                style={styles.productCard}
                onPress={() => handleProductPress(product)}
            >
                <View style={styles.productHeader}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productPrice}>₹{product.price}/unit</Text>
                </View>
                {product.description && (
                    <Text style={styles.productDescription}>{product.description || t('marketplace.noDescription')}</Text>
                )}
                {/* Button Bar */}
                <View style={styles.productButtonBar}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.quoteButton, styles.productButtonBarButton]}
                        onPress={e => {
                            e.stopPropagation();
                            const manufacturer = manufacturers.find(m => m.products.includes(product));
                            if (manufacturer) {
                                handleRequestQuote(product, manufacturer);
                            }
                        }}
                    >
                        <Text style={styles.quoteButtonText}>{t('marketplace.requestQuote')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.sampleButton, styles.productButtonBarButton]}
                        onPress={e => {
                            e.stopPropagation();
                            const manufacturer = manufacturers.find(m => m.products.includes(product));
                            if (manufacturer) {
                                handleRequestSample(product, manufacturer);
                            }
                        }}
                    >
                        <Text style={styles.sampleButtonText}>{t('marketplace.requestSample', 'Request Sample')}</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.sampleDeliveryText}>{t('marketplace.sampleDeliveryCharges')}</Text>
                <TouchableOpacity
                    style={[styles.actionButton, styles.orderButton, styles.productButtonBarButton]}
                    onPress={e => {
                        e.stopPropagation();
                        const manufacturer = manufacturers.find(m => m.products.includes(product));
                        if (manufacturer) {
                            handlePlaceOrder(product, manufacturer);
                        }
                    }}
                >
                    <Text style={styles.orderButtonText}>{t('marketplace.placeOrder')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.whatsappOrderButton, styles.productButtonBarButton]}
                    onPress={e => {
                        e.stopPropagation();
                        const manufacturer = manufacturers.find(m => m.products.includes(product));
                        if (manufacturer) {
                            handleWhatsAppOrder(product, manufacturer);
                        }
                    }}
                >
                    <View style={styles.whatsappButtonContent}>
                        <Image
                            source={require('../../assets/images/whatsapp.png')}
                            style={styles.whatsappIcon}
                        />
                        <Text style={styles.whatsappOrderButtonText}>{t('marketplace.whatsappOrder')}</Text>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const renderManufacturer = ({ item: manufacturer }: { item: Manufacturer }) => {
        // Remove isEentBazaar logic
        // Always calculate distance for display using the current reference point
        let displayDistance: number | undefined = undefined;
        let refLocation = filters.nearMeActive && nearMeLocation
            ? nearMeLocation
            : userLocation;

        if (refLocation) {
            const manuLat = typeof manufacturer.latitude === 'string'
                ? parseFloat(manufacturer.latitude)
                : manufacturer.latitude;
            const manuLng = typeof manufacturer.longitude === 'string'
                ? parseFloat(manufacturer.longitude)
                : manufacturer.longitude;

            if (
                manuLat !== undefined && manuLng !== undefined &&
                manuLat !== null && manuLng !== null &&
                !isNaN(manuLat) && !isNaN(manuLng)
            ) {
                displayDistance = haversineDistance(
                    refLocation.latitude,
                    refLocation.longitude,
                    manuLat,
                    manuLng
                );
            }
        }

        return (
            <View style={{ position: 'relative', zIndex: 20, marginBottom: 16 }}>
                {/* Badge behind the card */}
                {manufacturer.is_featured && (
                    <View style={styles.featuredBadgeTabBehind}>
                        <Text style={styles.featuredBadgeTabText}>{t('marketplace.mostPopular', '⭐ Most Popular')}</Text>
                    </View>
                )}
                <View style={styles.manufacturerCard}>
                    <View style={styles.manufacturerHeader}>
                        <View style={styles.manufacturerHeaderTop}>
                            <Text style={styles.manufacturerName}>
                                {manufacturer.name}
                            </Text>
                            <View style={styles.badgeContainer}>
                                {displayDistance && displayDistance > 0 && (
                                    <View style={styles.distanceBadge}>
                                        <Text style={styles.distanceBadgeText}>
                                            {'📍 '}{displayDistance.toFixed(1)} km
                                        </Text>
                                    </View>
                                )}
                                {/* Machine Clay Products Badge */}
                                {manufacturer.products.some(product => product.category === 'Machine Clay Products') && (
                                    <TouchableOpacity
                                        style={styles.machineClayBadge}
                                        onPress={() => {
                                            Alert.alert(
                                                'Machine Made Clay Products',
                                                'This manufacturer specializes in machine-made clay products, ensuring consistent quality and standardized production.',
                                                [{ text: 'OK' }]
                                            );
                                        }}
                                    >
                                        <MaterialIcons name="verified" size={20} color="#10b981" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                        <Text style={styles.manufacturerLocation}>
                            {manufacturer.city}{manufacturer.district ? `, ${manufacturer.district}` : ''}{manufacturer.state ? `, ${manufacturer.state}` : ''}
                        </Text>
                    </View>
                    <View style={styles.manufacturerActions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.inquiryButton]}
                            onPress={() => {
                                handleRequestInquiry(manufacturer)
                            }}
                        >
                            <Text style={styles.inquiryButtonText}>{t('marketplace.sendInquiry')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, { borderColor: '#af4b0e', borderWidth: 1, backgroundColor: '#fff', marginLeft: 8 }]}
                            onPress={() => {
                                if (isGuest) {
                                    Alert.alert(t('marketplace.guestTitle'), t('marketplace.guestRate'));
                                    return;
                                }
                                setSelectedRatingManufacturer(manufacturer);
                                setRatingValue(5);
                                setRatingComment('');
                                setRatingModalVisible(true);
                            }}
                        >
                            <Text style={{ color: '#af4b0e', fontWeight: '600' }}>{t('marketplace.rate')}</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.productsTitle}>{t('marketplace.availableProducts')}:</Text>
                    <FlatList
                        data={manufacturer.products}
                        renderItem={renderProduct}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                    />
                </View>
            </View>
        );
    };

    const renderOrderModal = () => (
        <Modal
            visible={orderModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setOrderModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('marketplace.placeOrder')}</Text>
                        <TouchableOpacity onPress={() => setOrderModalVisible(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.orderForm}>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.product')}</Text>
                                <Text style={styles.formValue}>{selectedProduct?.name}</Text>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.manufacturer')}</Text>
                                <Text style={styles.formValue}>{selectedManufacturer?.name}</Text>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.pricePerUnit')}</Text>
                                <Text style={styles.formValue}>₹{selectedProduct?.price}</Text>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.quantity')} *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={orderDetails.quantity}
                                    onChangeText={(text) => setOrderDetails(prev => ({ ...prev, quantity: text }))}
                                    placeholder={t('marketplace.enterQuantity')}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.deliveryAddress')} *</Text>
                                <TextInput
                                    style={[styles.formInput, styles.textArea]}
                                    value={orderDetails.deliveryAddress}
                                    onChangeText={(text) => setOrderDetails(prev => ({ ...prev, deliveryAddress: text }))}
                                    placeholder={t('marketplace.enterDeliveryAddress')}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.contactNumber')} *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={orderDetails.contactNumber}
                                    onChangeText={(text) => setOrderDetails(prev => ({
                                        ...prev,
                                        contactNumber: sanitizePhoneInput(text),
                                    }))}
                                    placeholder={t('marketplace.enterContactNumber')}
                                    keyboardType="number-pad"
                                    maxLength={10}
                                />
                            </View>

                            {orderDetails.quantity && (
                                <View style={styles.totalSection}>
                                    <Text style={styles.totalLabel}>{t('marketplace.totalAmount')}:</Text>
                                    <Text style={styles.totalAmount}>
                                        ₹{(parseInt(orderDetails.quantity) || 0) * (selectedProduct?.price || 0)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setOrderModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>{t('marketplace.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={handleConfirmOrder}
                            disabled={placingOrder}
                        >
                            {placingOrder ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.confirmButtonText}>{t('marketplace.placeOrder')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderQuoteModal = () => (
        <Modal
            visible={quoteModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setQuoteModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('marketplace.requestQuote')}</Text>
                        <TouchableOpacity onPress={() => setQuoteModalVisible(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.quoteForm}>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.product')}</Text>
                                <Text style={styles.formValue}>{selectedProduct?.name}</Text>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.manufacturer')}</Text>
                                <Text style={styles.formValue}>{selectedManufacturer?.name}</Text>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.quantity')} *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={quoteDetails.quantity}
                                    onChangeText={(text) => setQuoteDetails(prev => ({ ...prev, quantity: text }))}
                                    placeholder={t('marketplace.enterQuantity')}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.quotedPricePerUnit')} *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={quoteDetails.quotedPrice}
                                    onChangeText={(text) => setQuoteDetails(prev => ({ ...prev, quotedPrice: text }))}
                                    placeholder={t('marketplace.enterQuotedPrice')}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.message')}</Text>
                                <TextInput
                                    style={[styles.formInput, styles.textArea]}
                                    value={quoteDetails.message}
                                    onChangeText={(text) => setQuoteDetails(prev => ({ ...prev, message: text }))}
                                    placeholder={t('marketplace.enterMessageOptional')}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            {quoteDetails.quantity && quoteDetails.quotedPrice && (
                                <View style={styles.totalSection}>
                                    <Text style={styles.totalLabel}>{t('marketplace.totalAmount')}:</Text>
                                    <Text style={styles.totalAmount}>
                                        ₹{(parseInt(quoteDetails.quantity) || 0) * (parseFloat(quoteDetails.quotedPrice) || 0)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setQuoteModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>{t('marketplace.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={handleSubmitQuote}
                            disabled={sendingQuote}
                        >
                            {sendingQuote ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.confirmButtonText}>{t('marketplace.requestQuote')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderInquiryModal = () => (
        <Modal
            visible={inquiryModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setInquiryModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('marketplace.sendInquiry')}</Text>
                        <TouchableOpacity onPress={() => setInquiryModalVisible(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.inquiryForm}>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.subject')} *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={inquiryDetails.subject}
                                    onChangeText={(text) => setInquiryDetails(prev => ({ ...prev, subject: text }))}
                                    placeholder={t('marketplace.enterSubject')}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.message')} *</Text>
                                <TextInput
                                    style={[styles.formInput, styles.textArea]}
                                    value={inquiryDetails.message}
                                    onChangeText={(text) => setInquiryDetails(prev => ({ ...prev, message: text }))}
                                    placeholder={t('marketplace.enterMessage')}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setInquiryModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>{t('marketplace.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={handleSubmitInquiry}
                            disabled={sendingInquiry}
                        >
                            {sendingInquiry ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.confirmButtonText}>{t('marketplace.sendInquiry')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

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
                        <Text style={styles.modalTitle}>{t('marketplace.filters')}</Text>
                        <TouchableOpacity onPress={() => setFiltersVisible(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.filtersContent}>
                        {/* Distance Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>
                                {distanceFilterApplied && filters.maxDistance > 0
                                    ? `${t('home.filters.maxDistance', { distance: filters.maxDistance })}`
                                    : t('home.filters.maxDistanceNoValue')}
                            </Text>
                            <View style={styles.sliderContainer}>
                                <Text style={styles.sliderValue}>0</Text>
                                <TouchableOpacity
                                    style={styles.sliderTrack}
                                    onPress={(event) => {
                                        const { locationX } = event.nativeEvent;
                                        const trackWidth = 250; // Better approximation
                                        const percentage = Math.max(0, Math.min(1, locationX / trackWidth));
                                        const newDistance = Math.round(percentage * 100);
                                        setFilters(prev => ({ ...prev, maxDistance: newDistance }));
                                        setDistanceFilterApplied(newDistance > 0);
                                    }}
                                    activeOpacity={0.8}
                                >
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
                                </TouchableOpacity>
                                <Text style={styles.sliderValue}>100</Text>
                            </View>
                        </View>

                        {/* Price Range Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>{t('home.filters.priceRange', { min: filters.priceRange[0], max: filters.priceRange[1] })}</Text>
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
                                        priceRange: [prev.priceRange[0], parseInt(text) || 20]
                                    }))}
                                    keyboardType="numeric"
                                    placeholder={t('home.filters.max')}
                                />
                            </View>
                        </View>

                        {/* State/Province Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>
                                {userCountry?.code === 'NP' ? t('home.filters.province') : t('home.filters.state')}
                            </Text>
                            <TouchableOpacity
                                style={styles.selectButton}
                                onPress={() => { setStateModalVisible(true); setFiltersVisible(false) }}
                            >
                                <Text style={styles.selectButtonText}>
                                    {filters.selectedState === '__all__'
                                        ? (userCountry?.code === 'NP' ? t('home.filters.allProvinces') : t('home.filters.allStates'))
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
                                onPress={() => { setDistrictModalVisible(true); setFiltersVisible(false); }}
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
                                onPress={() => { setCityModalVisible(true); setFiltersVisible(false); }}
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
                                onChangeText={(text) => {
                                    const sanitized = sanitizePincodeInput(text);
                                    setFilters(prev => ({
                                        ...prev,
                                        selectedPincode: sanitized,
                                    }));
                                }}
                                placeholder={t('home.filters.enterPinCode')}
                                keyboardType="numeric"
                                maxLength={6}
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

    const renderRatingModal = () => (
        <Modal
            visible={ratingModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setRatingModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Rate Manufacturer</Text>
                        <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody}>
                        <Text style={{ fontSize: 16, marginBottom: 10 }}>
                            Rate your experience with {selectedRatingManufacturer?.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => setRatingValue(star)}
                                    style={{ marginHorizontal: 2 }}
                                >
                                    <Text style={{ fontSize: 32, color: star <= ratingValue ? '#FFD700' : '#ccc' }}>★</Text>
                                </TouchableOpacity>
                            ))}
                            <Text style={{ marginLeft: 8, fontSize: 16, color: '#666' }}>{ratingValue} out of 5</Text>
                        </View>
                        <TextInput
                            style={[styles.formInput, styles.textArea]}
                            value={ratingComment}
                            onChangeText={setRatingComment}
                            placeholder="Share your experience (optional)"
                            multiline
                            numberOfLines={3}
                        />
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setRatingModalVisible(false)}
                            disabled={ratingSubmitting}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={async () => {
                                if (!selectedRatingManufacturer || !user) return;
                                setRatingSubmitting(true);
                                try {
                                    await saveManufacturerRating({
                                        customer_id: user.id,
                                        manufacturer_id: selectedRatingManufacturer.id,
                                        rating: ratingValue,
                                        comment: ratingComment,
                                    });
                                    Alert.alert('Thank you!', 'Your rating has been submitted.');
                                    setRatingModalVisible(false);
                                } catch (error) {
                                    Alert.alert('Error', 'Failed to submit rating. Please try again.');
                                } finally {
                                    setRatingSubmitting(false);
                                }
                            }}
                            disabled={ratingSubmitting}
                        >
                            <Text style={styles.confirmButtonText}>{ratingSubmitting ? 'Submitting...' : 'Submit Rating'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderLanguageModal = () => (
        <Modal
            visible={languageModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setLanguageModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('marketplace.selectLanguage', 'Select Language')}</Text>
                        <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody}>
                        {availableLanguages.map(lang => (
                            <TouchableOpacity
                                key={lang.code}
                                style={{ paddingVertical: 16, alignItems: 'center' }}
                                onPress={async () => {
                                    try {
                                        // Change language
                                        await i18next.changeLanguage(lang.code);

                                        // Store the selected language for country detection
                                        await AsyncStorage.setItem('selectedLanguage', JSON.stringify(lang));

                                        setLanguageModalVisible(false);

                                        // Check if user logged in with Nepali phone number
                                        const userPhone = user?.phone || '';
                                        const isNepaliPhoneUser = userPhone.startsWith('+977');

                                        if (isNepaliPhoneUser) {
                                            // For Nepali phone users, always keep Nepal country regardless of language
                                            const nepalCountry = {
                                                code: 'NP',
                                                name: 'Nepal',
                                                flag: '🇳🇵'
                                            };
                                            await storeUserCountry(nepalCountry);
                                            console.log('🇳🇵 User with Nepali phone number - keeping Nepal country regardless of language selection');
                                        } else {
                                            // For non-Nepali users, change country based on language selection
                                            const country = {
                                                code: lang.country === 'Nepal' ? 'NP' : 'IN',
                                                name: lang.country,
                                                flag: lang.flag
                                            };
                                            await storeUserCountry(country);
                                            console.log('🌍 Non-Nepali user - changing country based on language selection');
                                        }

                                        // The useEffect will automatically trigger handleCountryChange()
                                        // No need to manually call loadProducts here

                                    } catch (error) {
                                        console.error('Error changing language:', error);
                                    }
                                }}
                            >
                                <Text style={{ fontSize: 18, color: '#af4b0e', fontWeight: '600' }}>{lang.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderStateModal = () => (
        <Modal
            visible={stateModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setStateModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {userCountry?.code === 'NP' ? t('home.filters.selectProvince') : t('home.filters.selectState')}
                        </Text>
                        <TouchableOpacity onPress={() => setStateModalVisible(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody}>
                        {([userCountry?.code === 'NP' ? t('home.filters.allProvinces') : t('home.filters.allStates'), ...availableStates]).map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={{ paddingVertical: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' }}
                                onPress={() => {
                                    setFilters(prev => ({
                                        ...prev,
                                        selectedState: item === (userCountry?.code === 'NP' ? t('home.filters.allProvinces') : t('home.filters.allStates')) ? '__all__' : item,
                                        selectedDistrict: '__all__',
                                        selectedCity: '__all__',
                                    }));
                                    setFiltersVisible(true)
                                    setStateModalVisible(false);
                                }}
                            >
                                <Text style={{ fontSize: 16, color: '#1a1a1a' }}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setStateModalVisible(false)}>
                            <Text style={styles.cancelButtonText}>{t('home.filters.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderDistrictModal = () => (
        <Modal
            visible={districtModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setDistrictModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('home.filters.selectDistrict')}</Text>
                        <TouchableOpacity onPress={() => setDistrictModalVisible(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody}>
                        {([t('home.filters.allDistricts'), ...availableDistricts]).map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={{ paddingVertical: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' }}
                                onPress={() => {
                                    setFilters(prev => ({
                                        ...prev,
                                        selectedDistrict: item === t('home.filters.allDistricts') ? '__all__' : item,
                                        selectedCity: '__all__',
                                    }));
                                    setFiltersVisible(true);
                                    setDistrictModalVisible(false);
                                }}
                            >
                                <Text style={{ fontSize: 16, color: '#1a1a1a' }}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setDistrictModalVisible(false)}>
                            <Text style={styles.cancelButtonText}>{t('home.filters.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderCityModal = () => (
        <Modal
            visible={cityModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setCityModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('home.filters.selectCity')}</Text>
                        <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody}>
                        {([t('home.filters.allCities'), ...availableCities]).map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={{ paddingVertical: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' }}
                                onPress={() => {
                                    setFilters(prev => ({
                                        ...prev,
                                        selectedCity: item === t('home.filters.allCities') ? '__all__' : item,
                                    }));
                                    setFiltersVisible(true);
                                    setCityModalVisible(false);
                                }}
                            >
                                <Text style={{ fontSize: 16, color: '#1a1a1a' }}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setCityModalVisible(false)}>
                            <Text style={styles.cancelButtonText}>{t('home.filters.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderSampleOrderModal = () => (
        <Modal
            visible={sampleOrderModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setSampleOrderModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalTitleContainer}>
                            <Text style={styles.modalTitle}>{t('marketplace.requestSample', 'Request Sample')}</Text>
                            <Text style={styles.modalSubtitle}>{t('marketplace.sampleDeliveryCharges')}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setSampleOrderModalVisible(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody}>
                        <View style={styles.orderForm}>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.product', 'Product')}</Text>
                                <Text style={styles.formValue}>{selectedSampleProduct?.name}</Text>
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.manufacturer', 'Manufacturer')}</Text>
                                <Text style={styles.formValue}>{selectedSampleManufacturer?.name}</Text>
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.quantity', 'Quantity')} *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={sampleOrderDetails.quantity}
                                    onChangeText={text => setSampleOrderDetails(prev => ({ ...prev, quantity: text }))}
                                    placeholder={t('marketplace.enterQuantity', 'Enter quantity')}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.deliveryAddress', 'Delivery Address')} *</Text>
                                <TextInput
                                    style={[styles.formInput, styles.textArea]}
                                    value={sampleOrderDetails.deliveryAddress}
                                    onChangeText={text => setSampleOrderDetails(prev => ({ ...prev, deliveryAddress: text }))}
                                    placeholder={t('marketplace.enterDeliveryAddress', 'Enter delivery address')}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>{t('marketplace.contactNumber', 'Contact Number')} *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={sampleOrderDetails.contactNumber}
                                    onChangeText={text => setSampleOrderDetails(prev => ({
                                        ...prev,
                                        contactNumber: sanitizePhoneInput(text),
                                    }))}
                                    placeholder={t('marketplace.enterContactNumber', 'Enter contact number')}
                                    keyboardType="number-pad"
                                    maxLength={10}
                                />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setSampleOrderModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>{t('marketplace.cancel', 'Cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={handleConfirmSampleOrder}
                            disabled={placingSampleOrder}
                        >
                            {placingSampleOrder ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.confirmButtonText}>{t('marketplace.requestSample', 'Request Sample')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#af4b0e" />
                    <Text style={styles.loadingText}>{t('marketplace.loadingMarketplace')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            {/* Main UI and other modals */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <IconSymbol size={25} name="magnifyingglass" color="#6b7280" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('marketplace.searchPlaceholder')}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#9ca3af"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearSearchButton}
                            onPress={() => setSearchQuery('')}
                        >
                            <IconSymbol size={16} name="xmark.circle.fill" color="#6b7280" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setFiltersVisible(true)}
                    >
                        <View style={styles.filterIconContainer}>
                            <IconSymbol size={20} name="slider.horizontal.3" color="#6b7280" />
                            {getActiveFiltersCount() > 0 && (
                                <View style={styles.filterBadge}>
                                    <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('marketplace.manufacturers')}</Text>
                    <TouchableOpacity
                        style={[styles.filterButton, filters.nearMeActive && styles.filterButtonActive]}
                        onPress={filters.nearMeActive ? handleClearNearMe : handleNearMe}
                    >
                        <Text style={[styles.filterButtonText, filters.nearMeActive && styles.filterButtonTextActive]}>
                            {filters.nearMeActive ? t('marketplace.clearNearMe') : t('marketplace.nearMe')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
            {/* Active Filters Display */}
            {filters.nearMeActive && (
                <View style={styles.nearMeBanner}>
                    <Text style={styles.nearMeText}>
                        {t('marketplace.nearMeFilterApplied')}
                    </Text>
                </View>
            )}
            <FlatList
                data={filteredManufacturers}
                renderItem={renderManufacturer}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#af4b0e']}
                        tintColor="#af4b0e"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>{t('marketplace.noManufacturersFound')}</Text>
                    </View>
                }
            />
            {renderOrderModal()}
            {renderQuoteModal()}
            {renderInquiryModal()}
            {renderFiltersModal()}
            {renderRatingModal()}
            {/* {renderLanguageModal()} */}
            {renderStateModal()}
            {renderDistrictModal()}
            {renderCityModal()}
            {renderSampleOrderModal()}
        </View>
    );
});

export default MarketplaceScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#af4b0e',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        backgroundColor: '#fff',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a1a',
        marginLeft: 4,
    },
    filterButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        // marginRight: 8,
    },
    filterButtons: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    section: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 20,
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
    // filterButton: {
    //     flex: 1,
    //     paddingVertical: 12,
    //     paddingHorizontal: 16,
    //     borderRadius: 8,
    //     marginHorizontal: 4,
    //     alignItems: 'center',
    // },
    filterButtonActive: {
        backgroundColor: '#af4b0e',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    filterButtonTextActive: {
        color: '#fff',
    },
    nearMeBanner: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginHorizontal: 20,
        marginTop: 10,
        borderRadius: 8,
    },
    nearMeText: {
        fontSize: 14,
        color: '#1e40af',
        textAlign: 'center',
        fontWeight: '500',
    },
    listContainer: {
        padding: 20,
    },
    manufacturerCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 6,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    manufacturerHeader: {
        marginBottom: 16,
    },
    manufacturerHeaderTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    manufacturerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    manufacturerLocation: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    manufacturerDistance: {
        fontSize: 12,
        color: '#af4b0e',
        fontWeight: '600',
    },
    distanceBadge: {
        backgroundColor: '#af4b0e',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#af4b0e',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    distanceBadgeText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '700',
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    machineClayBadge: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    machineClayBadgeText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '700',
    },
    manufacturerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    inquiryButton: {
        backgroundColor: '#af4b0e',
    },
    inquiryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    productsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    productCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    productHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    productPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#af4b0e',
    },
    productDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    productActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 2,
        borderRadius: 6,
        alignItems: 'center',
    },
    quoteButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#af4b0e',
    },
    quoteButtonText: {
        color: '#af4b0e',
        fontSize: 14,
        fontWeight: '600',
    },
    orderButton: {
        marginTop: 10,
        backgroundColor: '#af4b0e',
    },
    orderButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
    // Order Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        fontSize: 20,
        color: '#666',
    },
    modalBody: {
        padding: 20,
    },
    orderForm: {
        flex: 1,
        paddingBottom: 30,
    },
    formGroup: {
        marginBottom: 20,
    },
    formLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    formValue: {
        fontSize: 14,
        color: '#666',
        paddingVertical: 8,
    },
    formInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    totalSection: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        marginTop: 10,
    },
    totalLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#af4b0e',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#af4b0e',
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    // Quote Modal Styles
    quoteForm: {
        flex: 1,
    },
    quoteFormGroup: {
        marginBottom: 20,
    },
    quoteFormLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    quoteFormInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    quoteTextArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    quoteTotalSection: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        marginTop: 10,
    },
    quoteTotalLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    quoteTotalAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#af4b0e',
    },
    quoteModalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    quoteCancelButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        alignItems: 'center',
    },
    quoteCancelButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    quoteConfirmButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#af4b0e',
        borderRadius: 8,
        alignItems: 'center',
    },
    quoteConfirmButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    // Filter Modal Styles
    filtersContent: {
        padding: 20,
    },
    filterSection: {
        marginBottom: 20,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sliderTrack: {
        flex: 1,
        height: 6,
        backgroundColor: '#e2e8f0',
        borderRadius: 3,
        position: 'relative',
        justifyContent: 'center',
    },
    sliderFill: {
        height: '100%',
        backgroundColor: '#af4b0e',
        borderRadius: 3,
        position: 'absolute',
        left: 0,
    },
    sliderThumb: {
        position: 'absolute',
        top: -8,
        width: 20,
        height: 20,
        backgroundColor: '#af4b0e',
        borderRadius: 10,
        marginLeft: -10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
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
    inquiryForm: {
        flex: 1,
    },
    inquiryFormGroup: {
        marginBottom: 20,
    },
    inquiryFormLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    inquiryFormInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    inquiryTextArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    inquiryTotalSection: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        marginTop: 10,
    },
    inquiryTotalLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    inquiryTotalAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#af4b0e',
    },
    inquiryModalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    inquiryCancelButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        alignItems: 'center',
    },
    inquiryCancelButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    inquiryConfirmButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#af4b0e',
        borderRadius: 8,
        alignItems: 'center',
    },
    inquiryConfirmButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    disabledText: {
        color: '#ccc',
    },
    activeFiltersContainer: {
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    activeFilterBadge: {
        padding: 8,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        marginRight: 10,
    },
    activeFilterText: {
        fontSize: 14,
        color: '#333',
    },
    activeFilterRemove: {
        fontSize: 12,
        color: '#af4b0e',
        fontWeight: '600',
    },
    clearAllFiltersButton: {
        padding: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        alignItems: 'center',
    },
    clearAllFiltersText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    eentBazaarCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 2,
        borderColor: '#af4b0e',
    },
    eentBazaarName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#af4b0e',
        marginBottom: 4,
    },
    eentBazaarLocation: {
        fontSize: 14,
        color: '#af4b0e',
        fontWeight: '600',
    },
    eentBazaarBadge: {
        backgroundColor: '#af4b0e',
        color: '#fff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        fontSize: 12,
        fontWeight: '600',
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    eentBazaarActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    bulkInquiryButton: {
        backgroundColor: '#af4b0e',
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    bulkInquiryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    contactAdminButton: {
        backgroundColor: '#457b9d',
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    contactAdminButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'transparent',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
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
        width: 20,
        height: 20,

        position: 'absolute',
        top: -12,
        right: -12,
        backgroundColor: '#af4b0e',
        borderRadius: 12,
        paddingHorizontal: 2,
        paddingVertical: 1,
    },
    filterBadgeText: {
        textAlign: 'center',
        textAlignVertical: 'center',
        fontSize: 12,
        color: '#fff',
        fontWeight: 'bold',
    },
    disabledCard: {
        opacity: 0.5,
    },
    disabledButton: {
        backgroundColor: '#e5e7eb',
        borderColor: '#e5e7eb',
    },
    disabledButtonText: {
        color: '#b0b0b0',
    },
    featuredBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#af4b0e',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    featuredBadgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    featuredBadgeTab: {
        position: 'absolute',
        top: -18,
        right: '5%',
        // transform: [{ translateX: -60 }], // half of badge width for centering
        backgroundColor: '#af4b0e',
        borderRadius: 6,
        paddingHorizontal: 18,
        paddingVertical: 4,
        zIndex: 0,
        minWidth: 120,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    featuredBadgeTabText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 11,
        textAlign: 'center',
    },
    featuredBadgeTabBehind: {
        position: 'absolute',
        top: -16,
        right: '5%',
        height: 40,
        backgroundColor: '#af4b0e',
        borderRadius: 6,
        paddingHorizontal: 14,
        paddingVertical: 4,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'flex-start',
        zIndex: 0,
    },
    productButtonBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
    },
    productButtonBarButton: {
        flex: 1,
        marginHorizontal: 0,
        borderRadius: 6,
        minWidth: 0,
    },
    sampleButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#af4b0e',
    },
    sampleButtonText: {
        color: '#af4b0e',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },

    sampleDeliveryText: {
        fontSize: 11,
        color: '#af4b0e',
        textAlign: 'left',
        marginTop: 4,
        marginBottom: 6,
        fontStyle: 'italic',
        fontWeight: '500',
    },
    modalTitleContainer: {
        flex: 1,
    },
    modalSubtitle: {
        fontSize: 12,
        color: '#6c757d',
        fontStyle: 'italic',
        marginTop: 2,
    },
    whatsappOrderButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#af4b0e',
        marginTop: 8,
    },
    whatsappOrderButtonText: {
        color: '#af4b0e',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    whatsappButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    whatsappIcon: {
        width: 16,
        height: 16,
        marginRight: 6,
    },
}); 