import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getCustomerById, updateCustomerProfile, Customer } from '../lib/customerService';
import { getStates, getDistrictsByState } from '../data/indian_states_districts';
import { getProvinces, getDistrictsByProvince } from '../data/nepal_provinces_districts';
import { useTranslation } from 'react-i18next';

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

export default function EditProfileScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();
    const [customerData, setCustomerData] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selectedCountry, setSelectedCountry] = useState<CountryOption>(countryOptions[0]);
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showStatePicker, setShowStatePicker] = useState(false);
    const [showDistrictPicker, setShowDistrictPicker] = useState(false);
    const [isCountryLocked, setIsCountryLocked] = useState(false);

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
    });

    useEffect(() => {
        if (user?.id) {
            loadCustomerData();
        }
    }, [user?.id]);

    const loadCustomerData = async () => {
        try {
            if (user?.id) {
                const data = await getCustomerById(user.id);
                setCustomerData(data);

                // Set form data
                setFormData({
                    name: data?.name || '',
                    email: data?.email || '',
                    company_name: data?.company_name || '',
                    state: data?.state || '',
                    district: data?.district || '',
                    city: data?.city || '',
                    pin_code: data?.pin_code || '',
                    address: data?.address || '',
                    gst_details: data?.gst_details || '',
                    vat_number: data?.vat_number || '',
                    pan_number: data?.pan_number || '',
                });

                // Determine country from phone number and lock it
                if (data?.phone) {
                    let countryCode = 'IN'; // Default to India
                    if (data.phone.startsWith('+977')) {
                        countryCode = 'NP';
                    } else if (data.phone.startsWith('+91')) {
                        countryCode = 'IN';
                    }

                    const country = countryOptions.find(c => c.code === countryCode);
                    if (country) {
                        setSelectedCountry(country);
                        setIsCountryLocked(true); // Lock the country field
                    }
                } else if (data?.country) {
                    // Fallback to stored country if phone is not available
                    const country = countryOptions.find(c => c.code === data.country);
                    if (country) {
                        setSelectedCountry(country);
                        setIsCountryLocked(true); // Lock the country field
                    }
                }
            }
        } catch (error) {
            console.error('Error loading customer data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Reset district when state changes
        if (field === 'state') {
            setFormData(prev => ({ ...prev, district: '' }));
        }
    };

    const handleCountrySelect = (country: CountryOption) => {
        // Only allow country selection if not locked
        if (!isCountryLocked) {
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
        }
    };

    const handleStateSelect = (state: string) => {
        handleInputChange('state', state);
        setShowStatePicker(false);
    };

    const handleDistrictSelect = (district: string) => {
        handleInputChange('district', district);
        setShowDistrictPicker(false);
    };

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

    const validateForm = () => {
        if (!formData.name.trim()) {
            Alert.alert(t('editProfile.error'), t('editProfile.enterFullName'));
            return false;
        }
        if (!formData.email.trim()) {
            Alert.alert(t('editProfile.error'), t('editProfile.enterEmail'));
            return false;
        }
        if (!formData.state.trim()) {
            Alert.alert(t('editProfile.error'), t('editProfile.selectStateProvince'));
            return false;
        }
        if (!formData.district.trim()) {
            Alert.alert(t('editProfile.error'), t('editProfile.selectDistrict'));
            return false;
        }
        if (!formData.city.trim()) {
            Alert.alert(t('editProfile.error'), t('editProfile.enterCity'));
            return false;
        }
        if (!formData.pin_code.trim()) {
            Alert.alert(t('editProfile.error'), t('editProfile.enterPinCode'));
            return false;
        }
        if (formData.pin_code.length !== 6) {
            Alert.alert(t('editProfile.error'), t('editProfile.pinCodeMustBe6Digits'));
            return false;
        }

        // Country-specific validation
        if (selectedCountry.code === 'NP') {
            if (!formData.vat_number.trim()) {
                Alert.alert(t('editProfile.error'), t('editProfile.vatNumberRequired'));
                return false;
            }
            if (!formData.pan_number.trim()) {
                Alert.alert(t('editProfile.error'), t('editProfile.panNumberRequired'));
                return false;
            }
        }

        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        setSaving(true);
        try {
            const updates = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                company_name: formData.company_name.trim(),
                state: formData.state,
                district: formData.district,
                city: formData.city.trim(),
                pin_code: formData.pin_code.trim(),
                address: formData.address.trim(),
                country: selectedCountry.code,
                gst_details: formData.gst_details.trim() || undefined,
                vat_number: formData.vat_number.trim() || undefined,
                pan_number: formData.pan_number.trim() || undefined,
            };

            const result = await updateCustomerProfile(user!.id, updates);

            if (result) {
                Alert.alert(t('editProfile.success'), t('editProfile.profileUpdatedSuccessfully'), [
                    {
                        text: t('editProfile.ok'),
                        onPress: () => router.back(),
                    },
                ]);
            } else {
                Alert.alert(t('editProfile.error'), t('editProfile.failedToUpdateProfile'));
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert(t('editProfile.error'), t('editProfile.failedToUpdateProfile'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#af4b0e" />
                    <Text style={styles.loadingText}>{t('editProfile.loadingProfile')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <IconSymbol size={24} name="chevron.left" color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('editProfile.editProfile')}</Text>
                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>{t('editProfile.save')}</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.form}>
                        {/* Country Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('editProfile.country')} *</Text>
                            <TouchableOpacity
                                style={[styles.dropdownButton, isCountryLocked && styles.dropdownButtonDisabled]}
                                onPress={() => !isCountryLocked && setShowCountryPicker(true)}
                                disabled={isCountryLocked}
                            >
                                <Text style={[styles.dropdownButtonText, isCountryLocked && styles.dropdownButtonTextDisabled]}>
                                    {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dialCode})
                                    {isCountryLocked && ' (Locked)'}
                                </Text>
                                {!isCountryLocked && <Text style={styles.dropdownArrow}>▼</Text>}
                            </TouchableOpacity>
                            {isCountryLocked && (
                                <Text style={styles.lockedFieldText}>
                                    Country cannot be changed after registration
                                </Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('editProfile.fullName')} *</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.name}
                                onChangeText={(value) => handleInputChange('name', value)}
                                placeholder={t('editProfile.enterFullName')}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('editProfile.emailAddress')} *</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.email}
                                onChangeText={(value) => handleInputChange('email', value)}
                                placeholder={t('editProfile.enterEmail')}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('editProfile.companyName')}</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.company_name}
                                onChangeText={(value) => handleInputChange('company_name', value)}
                                placeholder={t('editProfile.enterCompanyName')}
                            />
                        </View>

                        {/* State/Province Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                {selectedCountry.code === 'IN' ? t('editProfile.state') : t('editProfile.province')} *
                            </Text>
                            <TouchableOpacity
                                style={styles.dropdownButton}
                                onPress={() => setShowStatePicker(true)}
                            >
                                <Text style={styles.dropdownButtonText}>
                                    {formData.state || t('editProfile.selectStateProvince')}
                                </Text>
                                <Text style={styles.dropdownArrow}>▼</Text>
                            </TouchableOpacity>
                        </View>

                        {/* District Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('editProfile.district')} *</Text>
                            <TouchableOpacity
                                style={[styles.dropdownButton, !formData.state && styles.dropdownButtonDisabled]}
                                onPress={() => formData.state && setShowDistrictPicker(true)}
                                disabled={!formData.state}
                            >
                                <Text style={[styles.dropdownButtonText, !formData.state && styles.dropdownButtonTextDisabled]}>
                                    {formData.district || (formData.state ? t('editProfile.selectDistrict') : t('editProfile.selectStateProvinceFirst'))}
                                </Text>
                                <Text style={styles.dropdownArrow}>▼</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('editProfile.city')} *</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.city}
                                onChangeText={(value) => handleInputChange('city', value)}
                                placeholder={t('editProfile.enterCity')}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('editProfile.pinCode')} *</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.pin_code}
                                onChangeText={(value) => handleInputChange('pin_code', value)}
                                placeholder={t('editProfile.enterPinCode')}
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('editProfile.address')}</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={formData.address}
                                onChangeText={(value) => handleInputChange('address', value)}
                                placeholder={t('editProfile.enterAddress')}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        {/* Country-specific fields */}
                        {selectedCountry.code === 'IN' && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('editProfile.gstNumber')}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.gst_details}
                                    onChangeText={(value) => handleInputChange('gst_details', value)}
                                    placeholder={t('editProfile.enterGstNumber')}
                                    autoCapitalize="characters"
                                />
                            </View>
                        )}

                        {selectedCountry.code === 'NP' && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('editProfile.vatNumber')} *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.vat_number}
                                        onChangeText={(value) => handleInputChange('vat_number', value)}
                                        placeholder={t('editProfile.enterVatNumber')}
                                        autoCapitalize="characters"
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('editProfile.panNumber')} *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.pan_number}
                                        onChangeText={(value) => handleInputChange('pan_number', value)}
                                        placeholder={t('editProfile.enterPanNumber')}
                                        autoCapitalize="characters"
                                    />
                                </View>
                            </>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

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
                            <Text style={styles.modalTitle}>{t('editProfile.selectCountry')}</Text>
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
                                {t('editProfile.selectStateProvince')}
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
                                    <Text style={styles.pickerOptionName}>{state}</Text>
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
                            <Text style={styles.modalTitle}>{t('editProfile.selectDistrict')}</Text>
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
                                    <Text style={styles.pickerOptionName}>{district}</Text>
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
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6c757d',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    saveButton: {
        backgroundColor: '#af4b0e',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    saveButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    keyboardContainer: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    dropdownButton: {
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownButtonDisabled: {
        backgroundColor: '#f8f9fa',
        borderColor: '#dee2e6',
    },
    dropdownButtonText: {
        fontSize: 16,
        color: '#1a1a1a',
    },
    dropdownButtonTextDisabled: {
        color: '#6c757d',
    },
    lockedFieldText: {
        fontSize: 12,
        color: '#6c757d',
        fontStyle: 'italic',
        marginTop: 4,
    },
    dropdownArrow: {
        fontSize: 12,
        color: '#6c757d',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    closeButton: {
        padding: 4,
    },
    closeButtonText: {
        fontSize: 20,
        color: '#6c757d',
    },
    pickerList: {
        maxHeight: 400,
    },
    pickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    selectedPickerOption: {
        backgroundColor: '#fef2f2',
    },
    pickerOptionFlag: {
        fontSize: 24,
        marginRight: 12,
    },
    pickerOptionInfo: {
        flex: 1,
    },
    pickerOptionName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    pickerOptionCode: {
        fontSize: 14,
        color: '#6c757d',
        marginTop: 2,
    },
}); 