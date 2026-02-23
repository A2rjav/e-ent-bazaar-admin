import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import BackButton from '../components/BackButton';

export default function WelcomeScreen() {
    const router = useRouter();
    const { setGuestMode, clearGuest } = useAuth();
    const { t } = useTranslation();

    useEffect(() => {
        (async () => {
            const brickType = await AsyncStorage.getItem('selectedBrickType');
            if (!brickType) {
                router.replace('/select-brick-type');
            }
        })();
    }, []);

    const handleExplore = () => {
        clearGuest(); // Reset any previous guest state
        setGuestMode(true);
        // Navigate to the main app after a short delay
        setTimeout(() => {
            router.push('/(tabs)');
        }, 500);
    };

    const handleSignIn = () => {
        clearGuest();
        router.replace('/auth/phone');
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <BackButton />
            <View style={styles.header}>
                <Image
                    source={require('../assets/images/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.headerTitle}>E-Ent Bazaar</Text>
            </View>
            <View style={styles.contentSheet}>
                <Text style={styles.title}>{t('welcomeScreen.title')}</Text>
                <Text style={styles.subtitle}>{t('welcomeScreen.subtitle')}</Text>
                <TouchableOpacity style={styles.exploreButton} onPress={handleExplore}>
                    <Text style={styles.exploreButtonText}>{t('welcomeScreen.explore')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
                    <Text style={styles.signInButtonText}>{t('welcomeScreen.signIn')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#af4b0e',
    },
    header: {
        paddingTop: 80,
        paddingBottom: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 16,
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    contentSheet: {
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#af4b0e',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
        textAlign: 'center',
    },
    exploreButton: {
        backgroundColor: '#af4b0e',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        marginBottom: 16,
        width: '100%',
        alignItems: 'center',
    },
    exploreButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    signInButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#af4b0e',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
    },
    signInButtonText: {
        color: '#af4b0e',
        fontSize: 18,
        fontWeight: '600',
    },
}); 