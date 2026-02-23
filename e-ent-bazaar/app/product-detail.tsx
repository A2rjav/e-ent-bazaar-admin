import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getProductById, ProductWithManufacturer } from '../lib/productService';
import { createOrder } from '../lib/orderService';
import { createQuotation } from '../lib/quotationService';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '@/components/ui/IconSymbol';

export const options = { headerShown: false };

const sanitizePhoneInput = (value: string) => value.replace(/\D/g, '').slice(0, 10);

export default function ProductDetailScreen() {
    const { t } = useTranslation();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user, isGuest } = useAuth();
    const router = useRouter();
    const [product, setProduct] = useState<ProductWithManufacturer | null>(null);
    const [loading, setLoading] = useState(true);
    const [orderModalVisible, setOrderModalVisible] = useState(false);
    const [quoteModalVisible, setQuoteModalVisible] = useState(false);
    const [orderDetails, setOrderDetails] = useState({
        quantity: '',
        deliveryAddress: '',
        contactNumber: '',
    });
    const [quoteDetails, setQuoteDetails] = useState({
        quantity: '',
        quotedPrice: '',
        message: '',
    });

    useEffect(() => {
        if (id) {
            loadProduct();
        }
    }, [id]);

    const loadProduct = async () => {
        if (!id) return;

        try {
            const productData = await getProductById(id);
            setProduct(productData);
        } catch (error) {
            console.error('Error loading product:', error);
            Alert.alert(t('productDetail.error'), t('productDetail.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    const handleRequestQuote = () => {
        if (!user) {
            if (isGuest) {
                Alert.alert('Guest Mode', 'Please sign in to request quotes and access all features.');
            } else {
                Alert.alert(t('productDetail.loginRequired'), t('productDetail.pleaseLoginToQuote'));
            }
            return;
        }
        setQuoteModalVisible(true);
    };

    const handleSubmitQuote = async () => {
        const quantity = parseInt(quoteDetails.quantity);
        const quotedPrice = parseFloat(quoteDetails.quotedPrice);

        if (isNaN(quantity) || quantity <= 0) {
            Alert.alert(t('productDetail.error'), t('productDetail.enterValidQuantity'));
            return;
        }

        if (isNaN(quotedPrice) || quotedPrice <= 0) {
            Alert.alert(t('productDetail.error'), t('productDetail.enterValidPrice'));
            return;
        }

        if (!user?.id || !product) {
            Alert.alert(t('productDetail.error'), t('productDetail.missingInfo'));
            return;
        }

        const totalAmount = quantity * quotedPrice;

        Alert.alert(
            t('productDetail.confirmQuote'),
            `${t('productDetail.quoteDetails')}:\n\n${t('productDetail.product')}: ${product.name}\n${t('productDetail.quantity')}: ${quantity}\n${t('productDetail.quotedPricePerUnit')}: ₹${quotedPrice}\n${t('productDetail.totalAmount')}: ₹${totalAmount.toLocaleString()}\n\n${t('productDetail.message')}: ${quoteDetails.message || t('productDetail.noMessage')}`,
            [
                { text: t('productDetail.cancel'), style: 'cancel' },
                {
                    text: t('productDetail.sendRequest'),
                    onPress: async () => {
                        try {
                            setQuoteModalVisible(false);

                            // Show loading state
                            Alert.alert(t('productDetail.processing'), t('productDetail.sendingQuote'));

                            const quotationData = {
                                customer_id: user.id,
                                manufacturer_id: product.manufacturer_id,
                                product_id: product.id,
                                quantity,
                                quoted_price: quotedPrice,
                                total_amount: totalAmount,
                                message: quoteDetails.message || undefined,
                            };

                            const newQuotation = await createQuotation(quotationData);

                            if (newQuotation) {
                                Alert.alert(
                                    t('productDetail.quoteSent'),
                                    t('productDetail.quoteSentMessage'),
                                    [
                                        {
                                            text: t('productDetail.viewQuotations'),
                                            onPress: () => router.push('/(tabs)/quotations')
                                        },
                                        {
                                            text: t('productDetail.continueShopping'),
                                            onPress: () => router.back()
                                        }
                                    ]
                                );

                                // Reset form
                                setQuoteDetails({
                                    quantity: '',
                                    quotedPrice: '',
                                    message: '',
                                });
                            } else {
                                Alert.alert(t('productDetail.error'), t('productDetail.failedToSendQuote'));
                            }
                        } catch (error) {
                            console.error('Error sending quote request:', error);
                            Alert.alert(t('productDetail.error'), t('productDetail.failedToSendQuote'));
                        }
                    }
                },
            ]
        );
    };

    const handlePlaceOrder = () => {
        if (!user) {
            if (isGuest) {
                Alert.alert('Guest Mode', 'Please sign in to place orders and access all features.');
            } else {
                Alert.alert(t('productDetail.loginRequired'), t('productDetail.pleaseLoginToOrder'));
            }
            return;
        }
        setOrderModalVisible(true);
    };

    const handleConfirmOrder = async () => {
        const quantity = parseInt(orderDetails.quantity);
        if (isNaN(quantity) || quantity <= 0) {
            Alert.alert(t('productDetail.error'), t('productDetail.enterValidQuantity'));
            return;
        }

        if (!orderDetails.deliveryAddress.trim()) {
            Alert.alert(t('productDetail.error'), t('productDetail.enterDeliveryAddress'));
            return;
        }

        if (!orderDetails.contactNumber.trim()) {
            Alert.alert(t('productDetail.error'), t('productDetail.enterContactNumber'));
            return;
        }

        if (orderDetails.contactNumber.trim().length !== 10) {
            Alert.alert(t('productDetail.error'), t('productDetail.contactNumberMustBe10Digits'));
            return;
        }

        if (!user?.id || !product) {
            Alert.alert(t('productDetail.error'), t('productDetail.missingInfo'));
            return;
        }

        const totalAmount = quantity * product.price;

        Alert.alert(
            t('productDetail.confirmOrder'),
            `${t('productDetail.orderDetails')}:\n\n${t('productDetail.product')}: ${product.name}\n${t('productDetail.quantity')}: ${quantity}\n${t('productDetail.pricePerUnit')}: ₹${product.price}\n${t('productDetail.totalAmount')}: ₹${totalAmount.toLocaleString()}\n\n${t('productDetail.deliveryAddress')}: ${orderDetails.deliveryAddress}\n${t('productDetail.contact')}: ${orderDetails.contactNumber}`,
            [
                { text: t('productDetail.cancel'), style: 'cancel' },
                {
                    text: t('productDetail.placeOrder'),
                    onPress: async () => {
                        try {
                            setOrderModalVisible(false);

                            // Show loading state
                            Alert.alert(t('productDetail.processing'), t('productDetail.placingOrder'));

                            const orderData = {
                                customer_id: user.id,
                                manufacturer_id: product.manufacturer_id,
                                product_id: product.id,
                                quantity,
                                price: product.price,
                                delivery_address: orderDetails.deliveryAddress,
                                contact_number: orderDetails.contactNumber,
                            };

                            const newOrder = await createOrder(orderData);

                            if (newOrder) {
                                Alert.alert(
                                    t('productDetail.orderPlaced'),
                                    `${t('productDetail.orderPlacedMessage')}\n\n${t('productDetail.orderId')}: ${newOrder.id}\n${t('productDetail.totalAmount')}: ₹${newOrder.total_amount.toLocaleString()}\n\n${t('productDetail.trackOrderMessage')}`,
                                    [
                                        {
                                            text: t('productDetail.viewOrders'),
                                            onPress: () => router.push('/(tabs)/orders')
                                        },
                                        {
                                            text: t('productDetail.continueShopping'),
                                            onPress: () => router.back()
                                        }
                                    ]
                                );

                                // Reset form
                                setOrderDetails({
                                    quantity: '',
                                    deliveryAddress: '',
                                    contactNumber: '',
                                });
                            } else {
                                Alert.alert(t('productDetail.error'), t('productDetail.failedToPlaceOrder'));
                            }
                        } catch (error) {
                            console.error('Error placing order:', error);
                            Alert.alert(t('productDetail.error'), t('productDetail.failedToPlaceOrder'));
                        }
                    }
                },
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#af4b0e" />
                    <Text style={styles.loadingText}>{t('productDetail.loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!product) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{t('productDetail.productNotFound')}</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>{t('productDetail.goBack')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <IconSymbol size={24} name="chevron.left" color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('productDetail.productDetails')}</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}


                {/* Product Image Placeholder */}
                <View style={styles.imageContainer}>
                    <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderText}>📦</Text>
                        <Text style={styles.imagePlaceholderSubtext}>{t('productDetail.productImage')}</Text>
                    </View>
                </View>

                {/* Product Info */}
                <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productPrice}>₹{product.price}/{t('productDetail.unit')}</Text>

                    {product.description && (
                        <Text style={styles.productDescription}>{product.description}</Text>
                    )}

                    <View style={styles.productMeta}>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>{t('productDetail.category')}:</Text>
                            <Text style={styles.metaValue}>{product.category}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>{t('productDetail.available')}:</Text>
                            <Text style={[styles.metaValue, { color: product.is_available ? '#10b981' : '#ef4444' }]}>
                                {product.is_available ? t('productDetail.yes') : t('productDetail.no')}
                            </Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>{t('productDetail.added')}:</Text>
                            <Text style={styles.metaValue}>{formatDate(product.created_at)}</Text>
                        </View>
                    </View>
                </View>

                {/* Manufacturer Info */}
                <View style={styles.manufacturerInfo}>
                    <Text style={styles.sectionTitle}>{t('productDetail.manufacturer')}</Text>
                    <View style={styles.manufacturerCard}>
                        <Text style={styles.manufacturerName}>{product.manufacturer_name}</Text>
                        {product.manufacturer_location && (
                            <Text style={styles.manufacturerLocation}>📍 {product.manufacturer_location}</Text>
                        )}
                        {product.manufacturer_company_name && (
                            <Text style={styles.manufacturerCompany}>{product.manufacturer_company_name}</Text>
                        )}
                    </View>
                </View>

                {/* Specifications */}
                {product.specifications && (
                    <View style={styles.specifications}>
                        <Text style={styles.sectionTitle}>{t('productDetail.specifications')}</Text>
                        <View style={styles.specificationsCard}>
                            <Text style={styles.specificationsText}>
                                {JSON.stringify(product.specifications, null, 2)}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.quoteButton, isGuest && styles.disabledButton]}
                        onPress={handleRequestQuote}
                        disabled={isGuest}
                    >
                        <Text style={[styles.quoteButtonText, isGuest && styles.disabledButtonText]}>
                            {t('productDetail.requestQuote')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.orderButton, !product.is_available && styles.orderButtonDisabled, isGuest && styles.disabledButton]}
                        onPress={handlePlaceOrder}
                        disabled={!product.is_available || isGuest}
                    >
                        <Text style={[styles.orderButtonText, isGuest && styles.disabledButtonText]}>
                            {(product.is_available ? t('productDetail.placeOrder') : t('productDetail.notAvailable'))}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Order Modal */}
            <Modal
                visible={orderModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setOrderModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        style={styles.modalAvoiding}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('productDetail.placeOrder')}</Text>
                                <TouchableOpacity onPress={() => setOrderModalVisible(false)}>
                                    <Text style={styles.closeButton}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody}>
                                <View style={styles.orderForm}>
                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>{t('productDetail.product')}</Text>
                                        <Text style={styles.formValue}>{product.name}</Text>
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>{t('productDetail.pricePerUnit')}</Text>
                                        <Text style={styles.formValue}>₹{product.price}</Text>
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>{t('productDetail.quantity')} *</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            value={orderDetails.quantity}
                                            onChangeText={(text) => setOrderDetails(prev => ({ ...prev, quantity: text }))}
                                            placeholder={t('productDetail.enterQuantity')}
                                            keyboardType="numeric"
                                        />
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>{t('productDetail.deliveryAddress')} *</Text>
                                        <TextInput
                                            style={[styles.formInput, styles.textArea]}
                                            value={orderDetails.deliveryAddress}
                                            onChangeText={(text) => setOrderDetails(prev => ({ ...prev, deliveryAddress: text }))}
                                            placeholder={t('productDetail.enterDeliveryAddress')}
                                            multiline
                                            numberOfLines={3}
                                        />
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>{t('productDetail.contactNumber')} *</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            value={orderDetails.contactNumber}
                                            onChangeText={(text) => setOrderDetails(prev => ({
                                                ...prev,
                                                contactNumber: sanitizePhoneInput(text),
                                            }))}
                                            placeholder={t('productDetail.enterContactNumber')}
                                            keyboardType="number-pad"
                                            maxLength={10}
                                        />
                                    </View>

                                    {orderDetails.quantity && (
                                        <View style={styles.totalSection}>
                                            <Text style={styles.totalLabel}>{t('productDetail.totalAmount')}:</Text>
                                            <Text style={styles.totalAmount}>
                                                ₹{(parseInt(orderDetails.quantity) || 0) * product.price}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setOrderModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>{t('productDetail.cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.confirmButton}
                                    onPress={handleConfirmOrder}
                                >
                                    <Text style={styles.confirmButtonText}>{t('productDetail.placeOrder')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Quote Modal */}
            <Modal
                visible={quoteModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setQuoteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        style={styles.modalAvoiding}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('productDetail.requestQuote')}</Text>
                                <TouchableOpacity onPress={() => setQuoteModalVisible(false)}>
                                    <Text style={styles.closeButton}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody}>
                                <View style={styles.quoteForm}>
                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>{t('productDetail.product')}</Text>
                                        <Text style={styles.formValue}>{product.name}</Text>
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>{t('productDetail.quantity')} *</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            value={quoteDetails.quantity}
                                            onChangeText={(text) => setQuoteDetails(prev => ({ ...prev, quantity: text }))}
                                            placeholder={t('productDetail.enterQuantity')}
                                            keyboardType="numeric"
                                        />
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>{t('productDetail.quotedPricePerUnit')} *</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            value={quoteDetails.quotedPrice}
                                            onChangeText={(text) => setQuoteDetails(prev => ({ ...prev, quotedPrice: text }))}
                                            placeholder={t('productDetail.enterQuotedPrice')}
                                            keyboardType="numeric"
                                        />
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>{t('productDetail.message')}</Text>
                                        <TextInput
                                            style={[styles.formInput, styles.textArea]}
                                            value={quoteDetails.message}
                                            onChangeText={(text) => setQuoteDetails(prev => ({ ...prev, message: text }))}
                                            placeholder={t('productDetail.enterMessage')}
                                            multiline
                                            numberOfLines={3}
                                        />
                                    </View>

                                    {quoteDetails.quantity && quoteDetails.quotedPrice && (
                                        <View style={styles.totalSection}>
                                            <Text style={styles.totalLabel}>{t('productDetail.totalAmount')}:</Text>
                                            <Text style={styles.totalAmount}>
                                                ₹{(parseInt(quoteDetails.quantity) || 0) * parseFloat(quoteDetails.quotedPrice)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setQuoteModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>{t('productDetail.cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.confirmButton}
                                    onPress={handleSubmitQuote}
                                >
                                    <Text style={styles.confirmButtonText}>{t('productDetail.requestQuote')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
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
    content: {
        flex: 1,
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
        padding: 8,
    },
    backButtonText: {
        fontSize: 16,
        color: '#af4b0e',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 12,
    },
    imageContainer: {
        padding: 20,
        backgroundColor: '#fff',
    },
    imagePlaceholder: {
        height: 200,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholderText: {
        fontSize: 48,
        marginBottom: 8,
    },
    imagePlaceholderSubtext: {
        fontSize: 16,
        color: '#666',
    },
    productInfo: {
        padding: 20,
        backgroundColor: '#fff',
        marginTop: 1,
    },
    productName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    headerRight: {
        width: 32,
    },
    productPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#af4b0e',
        marginBottom: 16,
    },
    productDescription: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
        marginBottom: 20,
    },
    productMeta: {
        gap: 8,
    },
    metaItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metaLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    metaValue: {
        fontSize: 14,
        color: '#333',
    },
    manufacturerInfo: {
        padding: 20,
        backgroundColor: '#fff',
        marginTop: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    manufacturerCard: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
    },
    manufacturerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    manufacturerLocation: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    manufacturerCompany: {
        fontSize: 14,
        color: '#666',
    },
    specifications: {
        padding: 20,
        backgroundColor: '#fff',
        marginTop: 1,
    },
    specificationsCard: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
    },
    specificationsText: {
        fontSize: 14,
        color: '#333',
        fontFamily: 'monospace',
    },
    actionButtons: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
    },
    quoteButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#af4b0e',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    quoteButtonText: {
        color: '#af4b0e',
        fontSize: 16,
        fontWeight: '600',
    },
    orderButton: {
        flex: 1,
        backgroundColor: '#af4b0e',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    orderButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    orderButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        marginTop: 12,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalAvoiding: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
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
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        fontSize: 20,
        color: '#666',
    },
    modalBody: {
        padding: 20,
    },
    orderForm: {
        gap: 16,
        paddingBottom: 30,
    },
    formGroup: {
        gap: 8,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    formValue: {
        fontSize: 16,
        color: '#666',
        paddingVertical: 8,
    },
    formInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    totalSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        marginTop: 8,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#af4b0e',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        backgroundColor: '#af4b0e',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    quoteForm: {
        gap: 16,
    },
    disabledButton: {
        backgroundColor: '#9ca3af',
    },
    disabledButtonText: {
        color: '#666',
    },
}); 