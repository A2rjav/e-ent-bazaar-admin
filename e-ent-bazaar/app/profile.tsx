import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Modal,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getCustomerById, Customer } from '../lib/customerService';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
    const { user, logout, deleteAccount } = useAuth();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const [customerData, setCustomerData] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [languageModalVisible, setLanguageModalVisible] = useState(false);
    const [notificationModalVisible, setNotificationModalVisible] = useState(false);

    const languageOptions = [
        { code: 'en', name: 'English', country: 'India' },
        { code: 'hi', name: 'हिंदी (Hindi)', country: 'India' },
        { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)', country: 'India' },
        { code: 'bn', name: 'বাংলা (Bengali)', country: 'India' },
        { code: 'ne', name: 'नेपाली (Nepali)', country: 'Nepal' },
    ];

    // Dummy notifications data
    const notifications = [
        {
            id: 1,
            title: 'Welcome to E-Ent Bazaar',
            message: 'Thank you for joining our platform. Start exploring brick manufacturers near you.',
            time: '2 hours ago',
            type: 'welcome',
            read: false,
        },
        {
            id: 2,
            title: 'New Manufacturer Available',
            message: 'A new brick manufacturer has been added in your area. Check them out!',
            time: '1 day ago',
            type: 'update',
            read: true,
        },
        {
            id: 3,
            title: 'Order Status Update',
            message: 'Your order #12345 has been confirmed and is being processed.',
            time: '3 days ago',
            type: 'order',
            read: true,
        },
    ];

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
            }
        } catch (error) {
            console.error('Error loading customer data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = () => {
        Alert.alert(
            t('profile.signOut'),
            t('profile.signOutConfirmation'),
            [
                {
                    text: t('profile.cancel'),
                    style: 'cancel',
                },
                {
                    text: t('profile.signOut'),
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/auth/phone');
                    },
                },
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            t('profile.deleteAccount'),
            t('profile.deleteAccountConfirmation'),
            [
                {
                    text: t('profile.cancel'),
                    style: 'cancel',
                },
                {
                    text: t('profile.deleteAccount'),
                    style: 'destructive',
                    onPress: () => {
                        // Second confirmation
                        Alert.alert(
                            t('profile.finalConfirmation'),
                            t('profile.finalConfirmationMessage'),
                            [
                                {
                                    text: t('profile.cancel'),
                                    style: 'cancel',
                                },
                                {
                                    text: t('profile.confirmDelete'),
                                    style: 'destructive',
                                    onPress: () => confirmDeleteAccount(),
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };

    const confirmDeleteAccount = async () => {
        try {
            // Show loading state
            Alert.alert(
                t('profile.deletingAccount'),
                t('profile.deletingAccountMessage'),
                [],
                { cancelable: false }
            );

            // Call the delete account function from AuthContext
            const result = await deleteAccount();

            if (result.success) {
                Alert.alert(
                    t('profile.accountDeleted'),
                    t('profile.accountDeletedMessage'),
                    [
                        {
                            text: t('profile.ok'),
                            onPress: () => {
                                router.replace('/language-select');
                            },
                        },
                    ]
                );
            } else {
                Alert.alert(
                    t('profile.error'),
                    result.message || t('profile.failedToDeleteAccount'),
                    [{ text: t('profile.ok') }]
                );
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            Alert.alert(
                t('profile.error'),
                t('profile.unexpectedError'),
                [{ text: t('profile.ok') }]
            );
        }
    };

    // Helper function to check if user logged in with Nepali phone number
    const isNepaliPhoneUser = () => {
        const userPhone = customerData?.phone || user?.phone || '';
        return userPhone.startsWith('+977');
    };

    const handleLanguageChange = async (languageCode: string) => {
        try {
            await i18n.changeLanguage(languageCode);

            // Find the language option to get country info
            const selectedLang = languageOptions.find(lang => lang.code === languageCode);
            if (selectedLang) {
                // Store the selected language with country info
                await AsyncStorage.setItem('selectedLanguage', JSON.stringify(selectedLang));

                // Check if user logged in with Nepali phone number
                if (isNepaliPhoneUser()) {
                    // For Nepali phone users, always keep Nepal country regardless of language
                    const nepalCountry = {
                        code: 'NP',
                        name: 'Nepal',
                        flag: '🇳🇵'
                    };
                    await AsyncStorage.setItem('userCountry', JSON.stringify(nepalCountry));
                    console.log('🇳🇵 User with Nepali phone number - keeping Nepal country regardless of language selection');
                } else {
                    // For non-Nepali users, change country based on language selection
                    const country = {
                        code: selectedLang.country === 'Nepal' ? 'NP' : 'IN',
                        name: selectedLang.country,
                        flag: selectedLang.country === 'Nepal' ? '🇳🇵' : '🇮🇳'
                    };
                    await AsyncStorage.setItem('userCountry', JSON.stringify(country));
                    console.log('🌍 Non-Nepali user - changing country based on language selection');
                }
            }

            setLanguageModalVisible(false);
        } catch (error) {
            console.error('Error changing language:', error);
        }
    };

    const handleWhatsAppContact = async () => {
        const phoneNumber = '+918008007954'; // Admin WhatsApp number
        const message = 'Hello! I need help with my E-Ent Bazaar account.';

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

    const handleNotifications = () => {
        setNotificationModalVisible(true);
    };

    const menuItems = [
        {
            id: 'edit-profile',
            title: t('profile.editProfile'),
            subtitle: t('profile.editProfileSubtitle'),
            icon: 'person.circle',
            onPress: () => router.push('/edit-profile'),
        },
        {
            id: 'history',
            title: t('profile.history'),
            subtitle: t('profile.historySubtitle'),
            icon: 'clock',
            onPress: () => router.push('/my-history'),
        },
        {
            id: 'whatsapp-contact',
            title: t('profile.whatsappContact'),
            subtitle: t('profile.whatsappContactSubtitle'),
            icon: 'message',
            onPress: handleWhatsAppContact,
        },
        {
            id: 'language',
            title: t('profile.language'),
            subtitle: `${t('profile.current')}: ${languageOptions.find(l => l.code === i18n.language)?.name || 'English'}`,
            icon: 'globe',
            onPress: () => setLanguageModalVisible(true),
        },
        {
            id: 'delete-account',
            title: t('profile.deleteAccount'),
            subtitle: t('profile.deleteAccountSubtitle'),
            icon: 'trash',
            onPress: handleDeleteAccount,
        },
    ];

    const renderMenuItem = (item: any) => (
        <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
            <View style={styles.menuItemLeft}>
                <View style={[
                    styles.menuIcon,
                    item.id === 'delete-account' && styles.deleteAccountIcon
                ]}>
                    <IconSymbol
                        size={20}
                        name={item.icon}
                        color={item.id === 'delete-account' ? '#ef4444' : '#af4b0e'}
                    />
                </View>
                <View style={styles.menuText}>
                    <Text style={[
                        styles.menuTitle,
                        item.id === 'delete-account' && styles.deleteAccountTitle
                    ]}>{item.title}</Text>
                    <Text style={[
                        styles.menuSubtitle,
                        item.id === 'delete-account' && styles.deleteAccountSubtitle
                    ]}>{item.subtitle}</Text>
                </View>
            </View>
            <IconSymbol
                size={16}
                name="chevron.right"
                color={item.id === 'delete-account' ? '#ef4444' : '#6b7280'}
            />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <IconSymbol size={24} name="chevron.left" color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('profile.title')}</Text>
                <TouchableOpacity style={styles.headerRight}>
                    <IconSymbol size={24} name="bell" color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <IconSymbol size={40} name="person.fill" color="#fff" />
                        </View>
                    </View>
                    <View>
                        <Text style={styles.userName}>{customerData?.name || user?.name || t('profile.user')}</Text>
                        <Text style={styles.userEmail}>{customerData?.email || user?.email || t('profile.noEmail')}</Text>
                        <Text style={styles.userPhone}>{customerData?.phone || user?.phone || t('profile.noPhone')}</Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    {menuItems.map(renderMenuItem)}
                </View>

                {/* Sign Out Button */}
                <View style={styles.signOutSection}>
                    <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                        <IconSymbol size={20} name="rectangle.portrait.and.arrow.right" color="#ef4444" />
                        <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Language Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={languageModalVisible}
                onRequestClose={() => setLanguageModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('profile.selectLanguage')}</Text>
                        {languageOptions.map((option) => (
                            <TouchableOpacity
                                key={option.code}
                                style={[
                                    styles.languageOption,
                                    i18n.language === option.code && styles.selectedLanguageOption,
                                ]}
                                onPress={() => handleLanguageChange(option.code)}
                            >
                                <Text
                                    style={[
                                        styles.languageOptionText,
                                        i18n.language === option.code && styles.selectedLanguageOptionText,
                                    ]}
                                >
                                    {option.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setLanguageModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>{t('profile.close')}</Text>
                        </TouchableOpacity>
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
    headerRight: {
        width: 32,
    },
    content: {
        flex: 1,
    },
    profileSection: {
        backgroundColor: '#fff',
        padding: 24,
        alignItems: 'flex-start',
        flexDirection: "row",
        gap: 25
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#af4b0e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 16,
        color: '#6c757d',
        marginBottom: 4,
    },
    userPhone: {
        fontSize: 16,
        color: '#6c757d',
    },
    menuSection: {
        backgroundColor: '#fff',
        paddingBottom: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fef2f2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuText: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 14,
        color: '#6c757d',
    },
    deleteAccountIcon: {
        backgroundColor: '#fef2f2',
    },
    deleteAccountTitle: {
        color: '#ef4444',
    },
    deleteAccountSubtitle: {
        color: '#ef4444',
    },
    signOutSection: {
        backgroundColor: '#fff',
        padding: 16,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ef4444',
        marginLeft: 8,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    languageOption: {
        width: '100%',
        padding: 15,
        marginVertical: 5,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        alignItems: 'center',
    },
    selectedLanguageOption: {
        backgroundColor: '#af4b0e',
        borderColor: '#af4b0e',
    },
    languageOptionText: {
        fontSize: 16,
    },
    selectedLanguageOptionText: {
        color: 'white',
        fontWeight: 'bold',
    },
    closeButton: {
        marginTop: 20,
        backgroundColor: '#6c757d',
        padding: 10,
        borderRadius: 5,
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
}); 
