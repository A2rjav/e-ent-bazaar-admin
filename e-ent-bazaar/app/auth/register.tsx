import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Modal,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStates, getDistrictsByState } from '../../data/indian_states_districts';
import { getProvinces, getDistrictsByProvince } from '../../data/nepal_provinces_districts';
import { geocodeAddress, getCurrentLocation } from '../../utils/geocode';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../../components/BackButton';


interface CountryOption {
    code: string;
    name: string;
    flag: string;
    dialCode: string;
}

const countryOptions: CountryOption[] = [
    { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91' },
    { code: 'NP', name: 'Nepal', flag: '🇳🇵', dialCode: '+977' },
];

export default function RegisterScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { phone } = useLocalSearchParams<{ phone: string }>();
    const { register } = useAuth();
    const { lastSelectedLanguage } = useLanguage();

    const [selectedCountry, setSelectedCountry] = useState<CountryOption>(countryOptions[0]);
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showStatePicker, setShowStatePicker] = useState(false);
    const [showDistrictPicker, setShowDistrictPicker] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company_name: '',
        state: '',
        district: '',
        city: '',
        pin_code: '',
        address: '',
        gst_details: '',
        vat_number: '',
        pan_number: '',
        latitude: '',
        longitude: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [isAutoGeocoding, setIsAutoGeocoding] = useState(false);

    useEffect(() => {
        // First priority: phone number from OTP flow
        if (phone) {
            if (phone.startsWith('+977')) {
                setSelectedCountry(countryOptions.find(c => c.code === 'NP')!);
                console.log('🇳🇵 Country set to Nepal based on phone number:', phone);
                // Reset location fields when switching to Nepal
                setFormData(prev => ({
                    ...prev,
                    state: '',
                    district: '',
                    city: '',
                    pin_code: '',
                }));
            } else if (phone.startsWith('+91')) {
                setSelectedCountry(countryOptions.find(c => c.code === 'IN')!);
                console.log('🇮🇳 Country set to India based on phone number:', phone);
                // Reset location fields when switching to India
                setFormData(prev => ({
                    ...prev,
                    state: '',
                    district: '',
                    city: '',
                    pin_code: '',
                }));
            }
        }
        // Second priority: language context
        else if (lastSelectedLanguage) {
            const countryCode = lastSelectedLanguage.phoneCode;
            const country = countryOptions.find(c => c.dialCode === countryCode);
            if (country) {
                setSelectedCountry(country);
                console.log('🌍 Country set based on language context:', country);
            }
        }
    }, [phone, lastSelectedLanguage]); // Run when phone or language changes

    // Get available states/provinces based on country
    const getAvailableStates = () => {
        if (selectedCountry.code === 'IN') {
            return getStates();
        } else if (selectedCountry.code === 'NP') {
            return getProvinces();
        }
        return [];
    };

    // Get available districts based on selected state/province
    const getAvailableDistricts = () => {
        if (selectedCountry.code === 'IN' && formData.state) {
            return getDistrictsByState(formData.state);
        } else if (selectedCountry.code === 'NP' && formData.state) {
            return getDistrictsByProvince(formData.state);
        }
        return [];
    };

    // Function to get current location using device GPS
    const handleGetCurrentLocation = async () => {
        setIsGettingLocation(true);
        setLocationError('');

        try {
            const location = await getCurrentLocation();
            if (location) {
                setFormData(prev => ({
                    ...prev,
                    latitude: location.latitude.toString(),
                    longitude: location.longitude.toString(),
                }));
                setLocationError('');
                Alert.alert('Success', 'Current location captured successfully!');
            } else {
                setLocationError('Failed to get current location. Please check your location permissions.');
            }
        } catch (error) {
            console.error('Error getting location:', error);
            setLocationError('Error getting location. Please try again or enter coordinates manually.');
        } finally {
            setIsGettingLocation(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Reset district when state changes
        if (field === 'state') {
            setFormData(prev => ({ ...prev, district: '' }));
        }

        // Auto-geocode when address fields are complete
        if (['address', 'city', 'state', 'pin_code'].includes(field)) {
            setTimeout(() => {
                autoGeocodeAddress();
            }, 1000); // Delay to avoid too many API calls
        }
    };

    // Auto-geocode function that runs when address fields are complete
    const autoGeocodeAddress = async () => {
        const { address, city, state, pin_code } = formData;

        // Only geocode if we have the essential fields and no coordinates yet
        if (address && city && state && pin_code && !formData.latitude && !formData.longitude) {
            setIsAutoGeocoding(true);
            try {
                const addressParts = [
                    address,
                    city,
                    state,
                    pin_code,
                    selectedCountry.name,
                ];
                const fullAddress = addressParts.filter(Boolean).join(", ");

                console.log("🔄 Auto-geocoding address:", fullAddress);

                const coordinates = await geocodeAddress(fullAddress);

                if (coordinates) {
                    setFormData(prev => ({
                        ...prev,
                        latitude: coordinates.latitude.toString(),
                        longitude: coordinates.longitude.toString(),
                    }));
                    console.log('✅ Auto-geocoded address:', fullAddress, 'to:', coordinates);
                } else {
                    console.log('❌ Auto-geocoding failed for address:', fullAddress);
                }
            } catch (error) {
                console.log('❌ Auto-geocoding error:', error);
                // Don't show error to user for auto-geocoding
            } finally {
                setIsAutoGeocoding(false);
            }
        }
    };

    const handleCountrySelect = (country: CountryOption) => {
        setSelectedCountry(country);
        setShowCountryPicker(false);
        // Reset location fields when country changes
        setFormData(prev => ({
            ...prev,
            state: '',
            district: '',
            city: '',
            pin_code: '',
        }));
        console.log('🌍 Country manually changed to:', country.name);
    };

    const handleStateSelect = (state: string) => {
        handleInputChange('state', state);
        setShowStatePicker(false);
    };

    const handleDistrictSelect = (district: string) => {
        handleInputChange('district', district);
        setShowDistrictPicker(false);
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            Alert.alert('Error', 'Please enter your full name');
            return false;
        }
        if (!formData.email.trim()) {
            Alert.alert('Error', 'Please enter your email address');
            return false;
        }
        if (!formData.state.trim()) {
            Alert.alert('Error', selectedCountry.code === 'NP' ? 'Please select your province' : 'Please select your state');
            return false;
        }
        if (!formData.district.trim()) {
            Alert.alert('Error', 'Please select your district');
            return false;
        }
        if (!formData.city.trim()) {
            Alert.alert('Error', 'Please enter your city');
            return false;
        }
        if (!formData.pin_code.trim()) {
            Alert.alert('Error', 'Please enter your PIN code');
            return false;
        }
        // Country-specific PIN code validation
        if (selectedCountry.code === 'NP') {
            if (formData.pin_code.length !== 5) {
                Alert.alert('Error', 'Nepal PIN code must be 5 digits');
                return false;
            }
        } else if (selectedCountry.code === 'IN') {
            if (formData.pin_code.length !== 6) {
                Alert.alert('Error', 'India PIN code must be 6 digits');
                return false;
            }
        }

        // Country-specific validation
        if (selectedCountry.code === 'NP') {
            if (!formData.vat_number.trim()) {
                Alert.alert('Error', 'VAT Number is required for Nepal');
                return false;
            }
            if (!formData.pan_number.trim()) {
                Alert.alert('Error', 'PAN Number is required for Nepal');
                return false;
            }
        }

        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        try {
            // Save country preference
            await AsyncStorage.setItem('selectedCountryCode', selectedCountry.dialCode);
            await AsyncStorage.setItem('selectedCountry', selectedCountry.code);

            // Prefer user-provided lat/lng if present and valid
            let latitude = formData.latitude && formData.latitude.trim() !== "" ? formData.latitude : "";
            let longitude = formData.longitude && formData.longitude.trim() !== "" ? formData.longitude : "";

            // If not provided, use geocoding (like web app)
            if (!latitude || !longitude) {
                const addressParts = [
                    formData.address,
                    formData.city,
                    formData.district,
                    formData.state,
                    formData.pin_code,
                    selectedCountry.name,
                ];
                const fullAddress = addressParts.filter(Boolean).join(", ");

                console.log("🔍 Attempting to geocode address:", fullAddress);

                try {
                    const geo = await geocodeAddress(fullAddress);
                    if (geo) {
                        latitude = geo.latitude.toString();
                        longitude = geo.longitude.toString();
                        console.log("✅ Address geocoded successfully:", latitude, longitude);
                    } else {
                        console.warn("❌ Geocoding failed for address:", fullAddress);
                    }
                } catch (geoError) {
                    console.error("❌ Error during geocoding:", geoError);
                }
            }

            // Convert string coordinates to numbers for the API
            const userData = {
                ...formData,
                latitude: latitude ? parseFloat(latitude) : undefined,
                longitude: longitude ? parseFloat(longitude) : undefined,
            };

            const result = await register(userData, phone || '');

            if (result.success) {
                Alert.alert('Success', 'Registration successful!', [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/(tabs)'),
                    },
                ]);
            } else {
                Alert.alert('Error', result.message);
            }
        } catch (error) {
            Alert.alert('Error', 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="white" animated={true} barStyle="dark-content" />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>{t('register.title')}</Text>
                    <Text style={styles.subtitle}>
                        {t('register.subtitle')}
                    </Text>
                </View>
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.content}>


                        <View style={styles.form}>
                            {/* Country Selection */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('register.country')} *</Text>
                                <TouchableOpacity
                                    style={[styles.dropdownButton, styles.dropdownButtonDisabled]}
                                    disabled={true}
                                >
                                    <Text style={[styles.dropdownButtonText, styles.dropdownButtonTextDisabled]}>
                                        {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dialCode})
                                    </Text>
                                    <Text style={styles.dropdownArrow}>🔒</Text>
                                </TouchableOpacity>
                                <Text style={styles.lockedFieldText}>
                                    Country is set based on your phone number
                                </Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('register.fullName')} *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.name}
                                    onChangeText={(value) => handleInputChange('name', value)}
                                    placeholder={t('register.fullNamePlaceholder')}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('register.email')} *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.email}
                                    onChangeText={(value) => handleInputChange('email', value)}
                                    placeholder={t('register.emailPlaceholder')}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('register.companyName')}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.company_name}
                                    onChangeText={(value) => handleInputChange('company_name', value)}
                                    placeholder={t('register.companyNamePlaceholder')}
                                />
                            </View>



                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('register.city')} *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.city}
                                    onChangeText={(value) => handleInputChange('city', value)}
                                    placeholder={t('register.cityPlaceholder')}
                                />
                            </View>

                            {/* State/Province Selection */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>
                                    {selectedCountry.code === 'IN' ? t('register.state') : t('register.province')} *
                                </Text>
                                <TouchableOpacity
                                    style={styles.dropdownButton}
                                    onPress={() => setShowStatePicker(true)}
                                >
                                    <Text style={styles.dropdownButtonText}>
                                        {formData.state || t(selectedCountry.code === 'IN' ? 'register.selectState' : 'register.selectProvince')}
                                    </Text>
                                    <Text style={styles.dropdownArrow}>▼</Text>
                                </TouchableOpacity>
                            </View>

                            {/* District Selection */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('register.district')} *</Text>
                                <TouchableOpacity
                                    style={[styles.dropdownButton, !formData.state && styles.dropdownButtonDisabled]}
                                    onPress={() => formData.state && setShowDistrictPicker(true)}
                                    disabled={!formData.state}
                                >
                                    <Text style={[styles.dropdownButtonText, !formData.state && styles.dropdownButtonTextDisabled]}>
                                        {formData.district || (formData.state ? t('register.selectDistrict') : t('register.selectStateFirst'))}
                                    </Text>
                                    <Text style={styles.dropdownArrow}>▼</Text>
                                </TouchableOpacity>
                            </View>





                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('register.pinCode')} *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.pin_code}
                                    onChangeText={(value) => handleInputChange('pin_code', value)}
                                    placeholder={selectedCountry.code === 'NP' ? 'Enter 5-digit PIN code' : 'Enter 6-digit PIN code'}
                                    keyboardType="number-pad"
                                    maxLength={selectedCountry.code === 'NP' ? 5 : 6}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('register.address')}</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={formData.address}
                                    onChangeText={(value) => handleInputChange('address', value)}
                                    placeholder={t('register.addressPlaceholder')}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            {/* Country-specific fields */}
                            {selectedCountry.code === 'IN' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('register.gstNumber')}</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.gst_details}
                                        onChangeText={(value) => handleInputChange('gst_details', value)}
                                        placeholder={t('register.gstNumberPlaceholder')}
                                        autoCapitalize="characters"
                                    />
                                </View>
                            )}

                            {selectedCountry.code === 'NP' && (
                                <>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>{t('register.vatNumber')} *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.vat_number}
                                            onChangeText={(value) => handleInputChange('vat_number', value)}
                                            placeholder={t('register.vatNumberPlaceholder')}
                                            autoCapitalize="characters"
                                        />
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>{t('register.panNumber')} *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.pan_number}
                                            onChangeText={(value) => handleInputChange('pan_number', value)}
                                            placeholder={t('register.panNumberPlaceholder')}
                                            autoCapitalize="characters"
                                        />
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Location Coordinates Section */}
                        <View style={styles.locationSection}>
                            <Text style={styles.sectionTitle}>{t('register.locationTitle')}</Text>

                            <Text style={styles.locationDescription}>
                                {t('register.locationDescription')}
                            </Text>

                            {/* Location Action Buttons */}
                            <View style={styles.locationButtons}>
                                <TouchableOpacity
                                    style={[styles.locationButton, styles.currentLocationButton]}
                                    onPress={handleGetCurrentLocation}
                                    disabled={isGettingLocation}
                                >
                                    <IconSymbol size={16} name="location.fill" color="#fff" />
                                    <Text style={styles.locationButtonText}>
                                        {isGettingLocation ? t('register.gettingLocation') : t('register.getCurrentLocation')}
                                    </Text>
                                    {isGettingLocation && <ActivityIndicator size="small" color="#fff" />}
                                </TouchableOpacity>
                            </View>

                            {/* Location Error Message */}
                            {locationError ? (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>{locationError}</Text>
                                </View>
                            ) : null}

                            {/* Latitude and Longitude Inputs */}
                            <View style={styles.coordinatesContainer}>
                                <View style={styles.coordinateInput}>
                                    <Text style={styles.label}>{t('register.latitude')}</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.latitude}
                                        onChangeText={(value) => handleInputChange('latitude', value)}
                                        placeholder={t('register.latitudePlaceholder')}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.coordinateInput}>
                                    <Text style={styles.label}>{t('register.longitude')}</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.longitude}
                                        onChangeText={(value) => handleInputChange('longitude', value)}
                                        placeholder={t('register.longitudePlaceholder')}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            {/* Location Status */}
                            {(formData.latitude && formData.longitude) && (
                                <View style={styles.locationStatus}>
                                    <IconSymbol size={16} name="checkmark.circle.fill" color="#10b981" />
                                    <Text style={styles.locationStatusText}>
                                        {t('register.locationCaptured')}: {formData.latitude}, {formData.longitude}
                                    </Text>
                                </View>
                            )}

                            {/* Auto-geocoding indicator */}
                            {isAutoGeocoding && (
                                <View style={styles.autoGeocodingStatus}>
                                    <ActivityIndicator size="small" color="#3b82f6" />
                                    <Text style={styles.autoGeocodingText}>
                                        {t('register.autoGeocoding')}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={isLoading}
                        >
                            <Text style={styles.buttonText}>
                                {isLoading ? t('register.registering') : t('register.completeRegistration')}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.terms}>
                            {t('register.terms')}
                        </Text>
                    </View>
                </ScrollView>

                {/* Country Picker Modal */}
                <Modal
                    visible={showCountryPicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowCountryPicker(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('register.country')}</Text>
                                <TouchableOpacity
                                    onPress={() => setShowCountryPicker(false)}
                                    style={styles.closeButton}
                                >
                                    <Text style={styles.closeButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.pickerList}>
                                {countryOptions.map((country) => (
                                    <TouchableOpacity
                                        key={country.code}
                                        style={[
                                            styles.pickerOption,
                                            selectedCountry.code === country.code && styles.selectedPickerOption
                                        ]}
                                        onPress={() => handleCountrySelect(country)}
                                    >
                                        <Text style={styles.pickerOptionFlag}>{country.flag}</Text>
                                        <View style={styles.pickerOptionInfo}>
                                            <Text style={styles.pickerOptionName}>{country.name}</Text>
                                            <Text style={styles.pickerOptionCode}>{country.dialCode}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* State/Province Picker Modal */}
                <Modal
                    visible={showStatePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowStatePicker(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {t(selectedCountry.code === 'IN' ? 'register.selectState' : 'register.selectProvince')}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowStatePicker(false)}
                                    style={styles.closeButton}
                                >
                                    <Text style={styles.closeButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.pickerList}>
                                {getAvailableStates().map((state) => (
                                    <TouchableOpacity
                                        key={state}
                                        style={[
                                            styles.pickerOption,
                                            formData.state === state && styles.selectedPickerOption
                                        ]}
                                        onPress={() => handleStateSelect(state)}
                                    >
                                        <Text style={styles.pickerOptionText}>{state}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* District Picker Modal */}
                <Modal
                    visible={showDistrictPicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowDistrictPicker(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('register.selectDistrict')}</Text>
                                <TouchableOpacity
                                    onPress={() => setShowDistrictPicker(false)}
                                    style={styles.closeButton}
                                >
                                    <Text style={styles.closeButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.pickerList}>
                                {getAvailableDistricts().map((district) => (
                                    <TouchableOpacity
                                        key={district}
                                        style={[
                                            styles.pickerOption,
                                            formData.district === district && styles.selectedPickerOption
                                        ]}
                                        onPress={() => handleDistrictSelect(district)}
                                    >
                                        <Text style={styles.pickerOptionText}>{district}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
        padding: 20,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#af4b0e',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        paddingBottom: 10,
        textAlign: 'center',
    },
    form: {
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: '#af4b0e',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    backButtonText: {
        color: '#666',
        fontSize: 14,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    dropdownButtonText: {
        fontSize: 16,
    },
    dropdownArrow: {
        fontSize: 12,
    },
    dropdownButtonDisabled: {
        backgroundColor: '#ccc',
    },
    dropdownButtonTextDisabled: {
        color: '#666',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        width: '100%',
        maxHeight: '60%',
        paddingTop: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        backgroundColor: '#f0f0f0',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        color: '#666',
    },
    pickerList: {
        paddingHorizontal: 10,
    },
    pickerOption: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    selectedPickerOption: {
        backgroundColor: '#e2e8f0',
    },
    pickerOptionFlag: {
        fontSize: 16,
        marginRight: 10,
    },
    pickerOptionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pickerOptionName: {
        fontSize: 16,
    },
    pickerOptionCode: {
        fontSize: 14,
        color: '#666',
    },
    pickerOptionText: {
        fontSize: 16,
        color: '#333',
    },
    terms: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
    },
    locationSection: {
        marginBottom: 30,
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    locationDescription: {
        color: '#666',
        fontSize: 14,
        marginBottom: 15,
    },
    locationButtons: {
        flexDirection: 'row',
        width: '100%',
        alignItems: 'center',
        marginBottom: 15,
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        flex: 1,
        borderRadius: 8,
        backgroundColor: '#10b981',
    },
    currentLocationButton: {
        backgroundColor: '#10b981',
    },
    locationButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    errorContainer: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 6,
        padding: 10,
        marginBottom: 15,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
    },
    coordinatesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    coordinateInput: {
        flex: 1,
        marginHorizontal: 5,
    },
    locationStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: 6,
        padding: 10,
    },
    locationStatusText: {
        color: '#166534',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    autoGeocodingStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: 6,
        padding: 10,
    },
    autoGeocodingText: {
        color: '#166534',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    header: {
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    headerRight: {
        width: 32,
    },
    lockedFieldText: {
        fontSize: 12,
        color: '#6c757d',
        fontStyle: 'italic',
        marginTop: 4,
    },
}); 