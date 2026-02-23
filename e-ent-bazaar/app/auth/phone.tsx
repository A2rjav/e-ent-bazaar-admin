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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
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

export default function PhoneScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { sendOtp, isSendingOtp } = useAuth();
    const { lastSelectedLanguage } = useLanguage();

    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<CountryOption>(countryOptions[0]);
    const [showCountryPicker, setShowCountryPicker] = useState(false);

    // Set default country based on selected language
    useEffect(() => {
        if (lastSelectedLanguage) {
            const countryCode = lastSelectedLanguage.phoneCode;
            const country = countryOptions.find(c => c.dialCode === countryCode);
            if (country) {
                setSelectedCountry(country);
            }
        }
    }, [lastSelectedLanguage]);

    const handleSendOtp = async () => {
        if (!phone || phone.length !== 10) {
            Alert.alert(t('phone.error'), t('phone.invalidPhoneNumber'));
            return;
        }

        if (isSendingOtp) {
            Alert.alert(t('phone.error'), 'OTP request already in progress. Please wait.');
            return;
        }

        setIsLoading(true);
        try {
            const fullPhone = selectedCountry.dialCode + phone;
            const result = await sendOtp(fullPhone);
            console.log("🚀 ~ handleSendOtp ~ result:", result)

            if (result.success) {
                router.push({
                    pathname: '/auth/otp',
                    params: { phone: fullPhone }
                });
            } else {
                Alert.alert(t('phone.error'), result.message);
            }
        } catch (error) {
            Alert.alert(t('phone.error'), t('phone.failedToSendOtp'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCountrySelect = (country: CountryOption) => {
        setSelectedCountry(country);
        setShowCountryPicker(false);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <BackButton color="#af4b0e" />
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.content}>
                    <Text style={styles.title}>{t('phone.title')}</Text>
                    <Text style={styles.subtitle}>
                        {t('phone.subtitle')}
                    </Text>

                    <View style={styles.phoneContainer}>
                        <TouchableOpacity
                            style={styles.countryCodeContainer}
                            onPress={() => setShowCountryPicker(true)}
                        >
                            <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                            <Text style={styles.countryCode}>{selectedCountry.dialCode}</Text>
                        </TouchableOpacity>
                        <TextInput
                            style={styles.phoneInput}
                            placeholder={t('phone.placeholder')}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            maxLength={10}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, (isLoading || isSendingOtp) && styles.buttonDisabled]}
                        onPress={handleSendOtp}
                        disabled={isLoading || isSendingOtp}
                    >
                        <Text style={styles.buttonText}>
                            {(isLoading || isSendingOtp) ? t('phone.sendingOtp') : t('phone.sendOtp')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.terms}>
                        {t('phone.terms')}
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
                            <Text style={styles.modalTitle}>{t('phone.modalTitle')}</Text>
                            <TouchableOpacity
                                onPress={() => setShowCountryPicker(false)}
                                style={styles.closeButton}
                            >
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.countryList}>
                            {countryOptions.map((country) => (
                                <TouchableOpacity
                                    key={country.code}
                                    style={[
                                        styles.countryOption,
                                        selectedCountry.code === country.code && styles.selectedCountry
                                    ]}
                                    onPress={() => handleCountrySelect(country)}
                                >
                                    <Text style={styles.countryOptionFlag}>{country.flag}</Text>
                                    <View style={styles.countryOptionInfo}>
                                        <Text style={styles.countryOptionName}>{country.name}</Text>
                                        <Text style={styles.countryOptionCode}>{country.dialCode}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
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
        marginBottom: 30,
        textAlign: 'center',
    },
    phoneContainer: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        overflow: 'hidden',
    },
    countryCodeContainer: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 15,
        paddingVertical: 15,
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0',
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 80,
    },
    countryFlag: {
        fontSize: 20,
        marginRight: 8,
    },
    countryCode: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: 15,
        paddingVertical: 15,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#af4b0e',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    terms: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
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
        maxHeight: '70%',
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
        fontWeight: '600',
        color: '#333',
    },
    closeButton: {
        padding: 5,
    },
    closeButtonText: {
        fontSize: 20,
        color: '#666',
    },
    countryList: {
        padding: 20,
    },
    countryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 5,
    },
    selectedCountry: {
        backgroundColor: '#f1f5f9',
    },
    countryOptionFlag: {
        fontSize: 24,
        marginRight: 15,
    },
    countryOptionInfo: {
        flex: 1,
    },
    countryOptionName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 2,
    },
    countryOptionCode: {
        fontSize: 14,
        color: '#666',
    },
}); 