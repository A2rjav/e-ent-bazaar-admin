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
    Modal,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getCustomerQuotationsWithDetails, QuotationWithDetails } from '../../lib/quotationService';
import { createOrder } from '../../lib/orderService';
import { useRouter, useFocusEffect } from 'expo-router';

const sanitizePhoneInput = (value: string) => value.replace(/\D/g, '').slice(0, 10);

export default function QuotationsScreen() {
    const { user, isGuest } = useAuth();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const [quotations, setQuotations] = useState<QuotationWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orderModalVisible, setOrderModalVisible] = useState(false);
    const [selectedQuotation, setSelectedQuotation] = useState<QuotationWithDetails | null>(null);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [contactNumber, setContactNumber] = useState('');

    // Force re-render when language changes
    const [languageKey, setLanguageKey] = useState(i18n.language);
    console.log("🚀 ~ QuotationsScreen ~ languageKey:", languageKey)

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
        console.log('Current language:', i18n.language);
        console.log('Test translation:', t('quotations.title'));
        console.log('Available languages:', i18n.languages);
    }, [i18n.language, t, languageKey]);

    // Redirect guests to welcome screen
    useEffect(() => {
        if (isGuest) {
            Alert.alert('Guest Mode', 'Please sign in to view your quotations and access all features.');
            router.replace('/welcome');
        }
    }, [isGuest, router]);

    // Don't render anything for guests
    if (isGuest) {
        return null;
    }

    const loadQuotations = async () => {
        if (!user) return;

        try {
            const data = await getCustomerQuotationsWithDetails(user.id);
            console.log('Loaded quotations:', JSON.stringify(data, null, 2));
            setQuotations(data);
        } catch (error) {
            console.error('Error loading quotations:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadQuotations();
        setRefreshing(false);
    };

    // Use useFocusEffect to fetch data every time the screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            console.log('Quotations screen focused - fetching fresh data');
            loadQuotations();
        }, [user?.id])
    );

    const handlePlaceOrder = (quotation: QuotationWithDetails) => {
        setSelectedQuotation(quotation);
        setDeliveryAddress('');
        setContactNumber('');
        setOrderModalVisible(true);
    };

    const handleConfirmOrder = async () => {
        if (!selectedQuotation || !deliveryAddress.trim() || !contactNumber.trim()) {
            Alert.alert(t('quotations.error'), t('quotations.fillAllFields'));
            return;
        }

        if (contactNumber.trim().length !== 10) {
            Alert.alert(t('quotations.error'), t('quotations.contactNumberMustBe10Digits'));
            return;
        }

        try {
            // Use response values if available, otherwise use original values
            const finalQuantity = selectedQuotation.response_quantity || selectedQuotation.quantity;
            const finalPrice = selectedQuotation.response_price || selectedQuotation.quoted_price;
            const totalAmount = finalPrice * finalQuantity;

            const orderData = {
                customer_id: selectedQuotation.customer_id,
                manufacturer_id: selectedQuotation.manufacturer_id,
                product_id: selectedQuotation.product_id,
                quantity: finalQuantity,
                price: finalPrice,
                total_amount: totalAmount,
                delivery_address: deliveryAddress,
                contact_number: contactNumber,
                status: 'pending',
            };

            const result = await createOrder(orderData);
            if (result) {
                Alert.alert(t('quotations.success'), t('quotations.orderPlacedSuccessfully'));
                setOrderModalVisible(false);
                setSelectedQuotation(null);
                loadQuotations();
            } else {
                Alert.alert(t('quotations.error'), t('quotations.failedToPlaceOrder'));
            }
        } catch (error) {
            console.error('Error placing order:', error);
            Alert.alert(t('quotations.error'), t('quotations.failedToPlaceOrder'));
        }
    };

    const isOfferExpired = (quotation: QuotationWithDetails) => {
        if (!quotation.offer_expiry) return false;
        return new Date(quotation.offer_expiry) < new Date();
    };

    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case 'pending':
                return '#f59e0b';
            case 'accepted':
                return '#10b981';
            case 'rejected':
                return '#ef4444';
            case 'expired':
                return '#6b7280';
            default:
                return '#6b7280';
        }
    };

    const getStatusText = (status: string | undefined) => {
        switch (status) {
            case 'pending':
                return t('quotations.waitingForResponse');
            case 'accepted':
                return t('quotations.acceptedByManufacturer');
            case 'rejected':
                return t('quotations.rejectedByManufacturer');
            case 'expired':
                return t('quotations.offerExpired');
            default:
                return status ? status.charAt(0).toUpperCase() + status.slice(1) : t('quotations.unknownStatus');
        }
    };

    const hasManufacturerResponse = (quotation: QuotationWithDetails) => {
        return !!(quotation.response_message || quotation.response_quantity || quotation.response_price || quotation.offer_expiry);
    };

    const renderQuotation = (quotation: QuotationWithDetails) => (
        <View key={quotation.id} style={styles.quotationCard}>
            <View style={styles.quotationHeader}>
                <Text style={styles.quotationNumber}>#{quotation.id.slice(0, 8)}</Text>
                <View style={styles.statusContainer}>
                    <Text style={[styles.quotationStatus, { color: getStatusColor(quotation.status) }]}>
                        {getStatusText(quotation.status)}
                    </Text>
                    {hasManufacturerResponse(quotation) && (
                        <Text style={styles.responseIndicator}>{t('quotations.responseAvailable')}</Text>
                    )}
                </View>
            </View>

            <Text style={styles.productName}>{quotation.product_name}</Text>
            <Text style={styles.manufacturerName}>
                {quotation.manufacturer_company_name || quotation.manufacturer_name}
            </Text>

            <View style={styles.quotationDetails}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('quotations.quantity')}:</Text>
                    <Text style={styles.detailValue}>{quotation.quantity}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('quotations.pricePerUnit')}:</Text>
                    <Text style={styles.detailValue}>₹{quotation.quoted_price}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('quotations.totalAmount')}:</Text>
                    <Text style={styles.detailValue}>₹{quotation.total_amount.toLocaleString()}</Text>
                </View>
                {quotation.delivery_time && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('quotations.deliveryTime')}:</Text>
                        <Text style={styles.detailValue}>{quotation.delivery_time}</Text>
                    </View>
                )}
                {quotation.payment_terms && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('quotations.paymentTerms')}:</Text>
                        <Text style={styles.detailValue}>{quotation.payment_terms}</Text>
                    </View>
                )}
                {quotation.validity_period && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('quotations.validUntil')}:</Text>
                        <Text style={styles.detailValue}>{quotation.validity_period}</Text>
                    </View>
                )}
            </View>

            {quotation.message && (
                <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>{t('quotations.yourMessage')}:</Text>
                    <Text style={styles.notesText}>{quotation.message}</Text>
                </View>
            )}

            {/* Manufacturer Response - Show whenever there's response data */}
            {(quotation.response_message || quotation.response_quantity || quotation.response_price || quotation.offer_expiry) && (
                <View style={styles.responseContainer}>
                    <Text style={styles.responseTitle}>{t('quotations.manufacturerResponse')}:</Text>
                    {quotation.response_message && (
                        <Text style={styles.responseMessage}>{quotation.response_message}</Text>
                    )}
                    <View style={styles.responseDetails}>
                        {quotation.response_quantity && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>{t('quotations.finalQuantity')}:</Text>
                                <Text style={styles.detailValue}>{quotation.response_quantity}</Text>
                            </View>
                        )}
                        {quotation.response_price && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>{t('quotations.finalPricePerUnit')}:</Text>
                                <Text style={styles.detailValue}>₹{quotation.response_price}</Text>
                            </View>
                        )}
                        {quotation.response_quantity && quotation.response_price && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>{t('quotations.finalTotalAmount')}:</Text>
                                <Text style={styles.detailValue}>₹{(quotation.response_quantity * quotation.response_price).toLocaleString()}</Text>
                            </View>
                        )}
                        {quotation.offer_expiry && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>{t('quotations.offerExpires')}:</Text>
                                <Text style={styles.detailValue}>
                                    {new Date(quotation.offer_expiry).toLocaleDateString()}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            <Text style={styles.dateText}>
                {t('quotations.receivedOn')} {new Date(quotation.created_at).toLocaleDateString()}
            </Text>

            {/* Show Place Order button when manufacturer has responded */}
            {(quotation.response_message || quotation.response_quantity || quotation.response_price) && (
                <View style={styles.actionButtons}>
                    {quotation.offer_expiry && isOfferExpired(quotation) ? (
                        <Text style={styles.expiredText}>{t('quotations.offerExpired')}</Text>
                    ) : (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.placeOrderButton]}
                            onPress={() => handlePlaceOrder(quotation)}
                        >
                            <Text style={styles.placeOrderButtonText}>{t('quotations.placeOrder')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('quotations.title')}</Text>
                <Text style={styles.subtitle}>{t('quotations.subtitle')}</Text>
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
                        <Text style={styles.loadingText}>{t('quotations.loadingQuotations')}</Text>
                    </View>
                ) : quotations.length > 0 ? (
                    quotations.map(renderQuotation)
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>{t('quotations.noQuotationsYet')}</Text>
                        <Text style={styles.emptyStateSubtext}>
                            {t('quotations.noQuotationsSubtext')}
                        </Text>
                    </View>
                )}
            </ScrollView>

            <Modal
                visible={orderModalVisible}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalTitle}>{t('quotations.confirmYourOrder')}</Text>
                            <Text style={styles.modalSubtitle}>{t('quotations.reviewAndConfirm')}</Text>

                            {/* Order Details Section */}
                            <View style={styles.orderDetailsSection}>
                                <Text style={styles.sectionTitle}>{t('quotations.orderDetails')}</Text>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{t('quotations.manufacturer')}:</Text>
                                    <Text style={styles.detailValue}>
                                        {selectedQuotation?.manufacturer_company_name || selectedQuotation?.manufacturer_name}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{t('quotations.product')}:</Text>
                                    <Text style={styles.detailValue}>{selectedQuotation?.product_name}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{t('quotations.quantity')}:</Text>
                                    <Text style={styles.detailValue}>
                                        {selectedQuotation?.response_quantity || selectedQuotation?.quantity}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{t('quotations.pricePerUnit')}:</Text>
                                    <Text style={styles.detailValue}>
                                        ₹{selectedQuotation?.response_price || selectedQuotation?.quoted_price}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{t('quotations.totalAmount')}:</Text>
                                    <Text style={styles.detailValue}>
                                        ₹{((selectedQuotation?.response_price || selectedQuotation?.quoted_price || 0) *
                                            (selectedQuotation?.response_quantity || selectedQuotation?.quantity || 0)).toLocaleString()}
                                    </Text>
                                </View>
                                {selectedQuotation?.message && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>{t('quotations.yourMessage')}:</Text>
                                        <Text style={styles.detailValue}>{selectedQuotation.message}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Manufacturer Response Section */}
                            {selectedQuotation?.response_message && (
                                <View style={styles.responseSection}>
                                    <Text style={styles.sectionTitle}>{t('quotations.manufacturerResponse')}</Text>
                                    <Text style={styles.responseMessage}>{selectedQuotation.response_message}</Text>
                                    {selectedQuotation.offer_expiry && (
                                        <Text style={styles.expiryText}>
                                            {t('quotations.offerExpires')}: {new Date(selectedQuotation.offer_expiry).toLocaleDateString()}
                                        </Text>
                                    )}
                                </View>
                            )}

                            {/* Delivery Details Section */}
                            <View style={styles.deliverySection}>
                                <Text style={styles.sectionTitle}>{t('quotations.deliveryDetails')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('quotations.deliveryAddress')}
                                    value={deliveryAddress}
                                    onChangeText={setDeliveryAddress}
                                    multiline
                                    numberOfLines={3}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('quotations.contactNumber')}
                                    value={contactNumber}
                                    onChangeText={(value) => setContactNumber(sanitizePhoneInput(value))}
                                    keyboardType="number-pad"
                                    maxLength={10}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setOrderModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>{t('quotations.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleConfirmOrder}
                            >
                                <Text style={styles.confirmButtonText}>{t('quotations.confirmOrder')}</Text>
                            </TouchableOpacity>
                        </View>
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
    quotationCard: {
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
    quotationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    quotationNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    statusContainer: {
        alignItems: 'flex-end',
        gap: 4,
    },
    quotationStatus: {
        fontSize: 14,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#f8f9fa',
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
    productName: {
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
    quotationDetails: {
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: '#6c757d',
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1a1a1a',
        flex: 1,
        textAlign: 'right',
    },
    notesContainer: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    notesLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    notesText: {
        fontSize: 14,
        color: '#495057',
    },
    dateText: {
        fontSize: 12,
        color: '#6c757d',
        marginBottom: 16,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    placeOrderButton: {
        backgroundColor: '#af4b0e',
    },
    placeOrderButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#6c757d',
        marginBottom: 16,
    },
    orderDetailsSection: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    responseSection: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#e8f5e8',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#28a745',
    },
    responseMessage: {
        fontSize: 14,
        color: '#495057',
        marginBottom: 8,
        lineHeight: 20,
    },
    expiryText: {
        fontSize: 14,
        color: '#6c757d',
        fontStyle: 'italic',
    },
    deliverySection: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#ef4444',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: '#10b981',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    responseContainer: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#28a745',
    },
    responseTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    responseDetails: {
        marginTop: 8,
    },
    expiredText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ef4444',
        textAlign: 'center',
        padding: 8,
        backgroundColor: '#fef2f2',
        borderRadius: 6,
    },
}); 