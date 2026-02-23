import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getCustomerInquiries, InquiryWithDetails } from '../../lib/inquiryService';
import { useRouter, useFocusEffect } from 'expo-router';

export default function InquiriesScreen() {
    const { user, isGuest } = useAuth();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const [inquiries, setInquiries] = useState<InquiryWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Force re-render when language changes
    const [languageKey, setLanguageKey] = useState(i18n.language);

    useEffect(() => {
        const handleLanguageChange = () => {
            setLanguageKey(i18n.language);
        };

        i18n.on('languageChanged', handleLanguageChange);
        return () => {
            i18n.off('languageChanged', handleLanguageChange);
        };
    }, [i18n]);

    // Debug: Log current language and test translation
    useEffect(() => {
        console.log('Inquiries - Current language:', i18n.language);
        console.log('Inquiries - Test translation:', t('inquiries.title'));
        console.log('Inquiries - Available languages:', i18n.languages);
        console.log('Inquiries - i18n resources:', Object.keys(i18n.options.resources || {}));
        console.log('Inquiries - Hindi resources:', i18n.options.resources?.hi);
        console.log('Inquiries - Direct access:', (i18n.options.resources?.hi as any)?.translation?.inquiries?.title);
    }, [i18n.language, t, languageKey]);

    // Redirect guests to welcome screen
    useEffect(() => {
        if (isGuest) {
            Alert.alert('Guest Mode', 'Please sign in to view your inquiries and access all features.');
            router.replace('/welcome');
        }
    }, [isGuest, router]);

    // Don't render anything for guests
    if (isGuest) {
        return null;
    }

    const loadInquiries = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            const data = await getCustomerInquiries(user.id);
            setInquiries(data);
        } catch (error) {
            console.error('Error loading inquiries:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadInquiries();
        setRefreshing(false);
    };

    // Use useFocusEffect to fetch data every time the screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            console.log('Inquiries screen focused - fetching fresh data');
            loadInquiries();
        }, [user?.id])
    );

    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case 'pending':
                return '#f59e0b';
            case 'in_progress':
                return '#3b82f6';
            case 'completed':
                return '#10b981';
            case 'cancelled':
                return '#ef4444';
            default:
                return '#6b7280';
        }
    };

    const getStatusText = (status: string | undefined) => {
        switch (status) {
            case 'pending':
                return t('inquiries.pending');
            case 'in_progress':
                return t('inquiries.inProgress');
            case 'completed':
                return t('inquiries.completed');
            case 'cancelled':
                return t('inquiries.cancelled');
            default:
                return status ? status.charAt(0).toUpperCase() + status.slice(1) : t('inquiries.unknownStatus');
        }
    };

    const renderInquiry = (inquiry: InquiryWithDetails) => (
        <View key={inquiry.id} style={styles.inquiryCard}>
            <View style={styles.inquiryHeader}>
                <Text style={styles.inquiryNumber}>#{inquiry.id.slice(0, 8)}</Text>
                <View style={styles.statusContainer}>
                    <Text style={[styles.inquiryStatus, { color: getStatusColor(inquiry.status) }]}>
                        {getStatusText(inquiry.status)}
                    </Text>
                    {inquiry.reply && (
                        <Text style={styles.responseIndicator}>{t('inquiries.replyAvailable')}</Text>
                    )}
                </View>
            </View>

            <Text style={styles.inquirySubject}>{inquiry.subject}</Text>
            <Text style={styles.manufacturerName}>
                {inquiry.manufacturer_company_name || inquiry.manufacturer_name}
            </Text>

            <View style={styles.messageContainer}>
                <Text style={styles.messageLabel}>{t('inquiries.yourMessage')}:</Text>
                <Text style={styles.messageText}>{inquiry.message}</Text>
            </View>

            {/* Manufacturer Response */}
            {inquiry.reply && (
                <View style={styles.responseContainer}>
                    <Text style={styles.responseTitle}>{t('inquiries.manufacturerReply')}:</Text>
                    <Text style={styles.responseMessage}>{inquiry.reply}</Text>
                    <View style={styles.responseMeta}>
                        {inquiry.reply_by && (
                            <Text style={styles.responseBy}>{t('inquiries.by')} {inquiry.reply_by}</Text>
                        )}
                        {inquiry.reply_at && (
                            <Text style={styles.responseDate}>
                                {new Date(inquiry.reply_at).toLocaleDateString()}
                            </Text>
                        )}
                    </View>
                </View>
            )}

            <Text style={styles.dateText}>
                {t('inquiries.sentOn')} {new Date(inquiry.created_at).toLocaleDateString()}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('inquiries.title')}</Text>
                <Text style={styles.subtitle}>{t('inquiries.subtitle')}</Text>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#af4b0e" />
                        <Text style={styles.loadingText}>{t('inquiries.loadingInquiries')}</Text>
                    </View>
                ) : inquiries.length > 0 ? (
                    inquiries.map(renderInquiry)
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>{t('inquiries.noInquiriesYet')}</Text>
                        <Text style={styles.emptyStateSubtext}>
                            {t('inquiries.noInquiriesSubtext')}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#6c757d',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6c757d',
    },
    inquiryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    inquiryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    inquiryNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    inquiryStatus: {
        fontSize: 14,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#f8f9fa',
    },
    inquirySubject: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    manufacturerName: {
        fontSize: 14,
        color: '#6c757d',
        marginBottom: 16,
    },
    messageContainer: {
        marginBottom: 16,
    },
    messageLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    messageText: {
        fontSize: 14,
        color: '#495057',
        lineHeight: 20,
    },
    dateText: {
        fontSize: 12,
        color: '#6c757d',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    statusContainer: {
        alignItems: 'flex-end',
        gap: 4,
    },
    responseIndicator: {
        fontSize: 12,
        fontWeight: '600',
        color: '#28a745',
        backgroundColor: '#d4edda',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    responseContainer: {
        marginBottom: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 12,
    },
    responseTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    responseMessage: {
        fontSize: 14,
        color: '#495057',
        lineHeight: 20,
    },
    responseMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    responseBy: {
        fontSize: 12,
        color: '#6c757d',
    },
    responseDate: {
        fontSize: 12,
        color: '#6c757d',
    },
}); 