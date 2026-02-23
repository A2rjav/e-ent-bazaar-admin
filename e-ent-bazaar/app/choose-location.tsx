import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import BackButton from '../components/BackButton';

export default function ChooseLocationScreen() {
    const router = useRouter();
    const { setGuestLocation } = useAuth();
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

    const handleLocationAccess = async () => {
        setLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    t('chooseLocation.permissionDenied'),
                    t('chooseLocation.locationPermissionRequired'),
                    [
                        { text: t('chooseLocation.openSettings') || 'Open Settings', onPress: () => Linking.openSettings() },
                        { text: t('chooseLocation.cancel') || 'Cancel', style: 'cancel' }
                    ]
                );
                setLoading(false);
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            // Reverse geocode to get address (optional)
            let address = 'Current Location';
            try {
                const geocode = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
                if (geocode && geocode.length > 0) {
                    address = `${geocode[0].city || ''}, ${geocode[0].region || ''}`;
                }
            } catch { }
            setGuestLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                address,
            });
            console.log('Guest location set:', location.coords.latitude, location.coords.longitude, address);
            setTimeout(() => {
                router.push('/(tabs)');
            }, 500);
        } catch (e) {
            Alert.alert(t('chooseLocation.error'), t('chooseLocation.failedToGetLocation'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <BackButton color="#af4b0e" />
            <View style={styles.iconCircle}>
                <Text style={styles.icon}>📍</Text>
            </View>
            <Text style={styles.title}>{t('chooseLocation.title')}</Text>
            <Text style={styles.subtitle}>{t('chooseLocation.subtitle')}</Text>
            <TouchableOpacity style={styles.locationButton} onPress={handleLocationAccess} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.locationButtonText}>{t('chooseLocation.allowLocationAccess')}</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 24,
    },
    iconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    icon: {
        fontSize: 40,
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
    locationButton: {
        backgroundColor: '#af4b0e',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        marginBottom: 16,
        width: '100%',
        alignItems: 'center',
    },
    locationButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
}); 