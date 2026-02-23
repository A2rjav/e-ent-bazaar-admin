import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useLanguage, LanguageOption } from '../contexts/LanguageContext';
import LoadingScreen from './_layout';
import { StatusBar } from 'expo-status-bar';
import BackButton from '../components/BackButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storeUserCountry } from '@/lib/countryDetection';

const languageOptions = [
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

export default function LanguageSelectScreen() {
    const { i18n } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { setLastSelectedLanguage } = useLanguage();

    const handleLanguageSelect = async (language: LanguageOption) => {
        try {
            setIsLoading(true);
            setLastSelectedLanguage(language);
            await i18n.changeLanguage(language.code);

            // Store the selected language with country info
            await AsyncStorage.setItem('selectedLanguage', JSON.stringify(language));

            // Directly set and store country based on language selection
            const country = {
                code: language.country === 'Nepal' ? 'NP' : 'IN',
                name: language.country,
                flag: language.flag
            };

            storeUserCountry(country);

            await AsyncStorage.setItem('userCountry', JSON.stringify(country));

            // Remove settings.lang so language is not persisted for guests
            await AsyncStorage.removeItem('settings.lang');

            // Wait for 4 seconds for splash/UX
            await new Promise(resolve => setTimeout(resolve, 4000));
            router.replace('/select-brick-type');
        } catch (error) {
            console.error('Error changing language:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar style="dark" />
                <Image
                    source={require('../assets/images/icon.png')}
                    style={styles.splashLogo}
                    resizeMode="contain"
                />
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.languageContainer}>
            <View style={styles.languageHeader}>
                <Image
                    source={require('../assets/images/icon.png')}
                    style={styles.languageLogo}
                    resizeMode="contain"
                />
                <Text style={styles.languageTitle}>E-Ent Bazaar</Text>
            </View>
            <View style={styles.languageContentSheet}>
                <Text style={styles.chooseLanguageText}>Choose your preferred language</Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {languageOptions.map((language) => (
                        <TouchableOpacity
                            key={language.code}
                            style={styles.languageOption}
                            onPress={() => handleLanguageSelect(language)}
                            disabled={isLoading}
                        >
                            <View style={styles.languageInfo}>
                                <Text style={styles.languageFlag}>{language.flag}</Text>
                                <View style={styles.languageDetails}>
                                    <Text style={styles.languageName}>{language.nativeName}</Text>
                                    <Text style={styles.languageEnglish}>{language.name}</Text>
                                    <Text style={styles.countryInfo}>{`${language.country} • ${language.phoneCode}`}</Text>
                                </View>
                            </View>
                            <Text style={styles.selectArrow}>→</Text>
                        </TouchableOpacity>
                    ))}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            INDIA'S FIRST ONLINE BRICK MARKETPLACE APP
                        </Text>
                        <Text style={styles.footerSubtext}>Build Smarter. Build Together - Where Bricks, People & Possibilities Connect</Text>
                    </View>
                </ScrollView>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
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
        borderRadius: 12,
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
        fontWeight: '600',
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
    splashLogo: {
        width: 150,
        height: 150,
        marginBottom: 30,
        borderRadius: 12,
    },
}); 