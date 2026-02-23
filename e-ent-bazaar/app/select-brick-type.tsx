import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import BackButton from '../components/BackButton';

export default function SelectBrickTypeScreen() {
    const router = useRouter();
    const { t } = useTranslation();

    const handleSelect = async (type: 'Handmade Bricks' | 'Machine Clay Products') => {
        await AsyncStorage.setItem('selectedBrickType', type);
        router.replace('/welcome');
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
                <Text style={styles.title}>{t('selectBrickType.title')}</Text>
                <Text style={styles.subtitle}>{t('selectBrickType.subtitle')}</Text>
                <TouchableOpacity style={styles.button} onPress={() => handleSelect('Handmade Bricks')}>
                    <Text style={styles.buttonText}>{t('selectBrickType.handmadeBricks')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => handleSelect('Machine Clay Products')}>
                    <Text style={[styles.buttonText, styles.secondaryButtonText]}>{t('selectBrickType.machineClayProducts')}</Text>
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
    button: {
        backgroundColor: '#af4b0e',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        marginBottom: 16,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#af4b0e',
    },
    secondaryButtonText: {
        color: '#af4b0e',
    },
}); 