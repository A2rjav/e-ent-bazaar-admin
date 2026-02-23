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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getOrderWithDetails, cancelOrder, updateOrder, OrderWithDetails } from '../lib/orderService';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from 'react-i18next';

const sanitizePhoneInput = (value: string) => value.replace(/\D/g, '').slice(0, 10);

export default function OrderDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();
    const [order, setOrder] = useState<OrderWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editModal, setEditModal] = useState(false);
    const [editFields, setEditFields] = useState({
        quantity: '',
        delivery_address: '',
        contact_number: '',
    });
    const { t } = useTranslation();

    useEffect(() => {
        if (id) {
            loadOrder();
        }
    }, [id]);

    const loadOrder = async () => {
        if (!id) return;

        try {
            const orderData = await getOrderWithDetails(id);
            setOrder(orderData);
        } catch (error) {
            console.error('Error loading order:', error);
            Alert.alert('Error', 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    const handleEditOrder = () => {
        if (!order) return;

        setEditFields({
            quantity: order.quantity.toString(),
            delivery_address: order.delivery_address,
            contact_number: order.contact_number,
        });
        setEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!order) return;

        const newQuantity = parseInt(editFields.quantity);
        if (isNaN(newQuantity) || newQuantity <= 0) {
            Alert.alert('Error', 'Please enter a valid quantity');
            return;
        }

        if (!editFields.delivery_address.trim()) {
            Alert.alert('Error', 'Please enter delivery address');
            return;
        }

        if (!editFields.contact_number.trim()) {
            Alert.alert(t('orderDetails.error'), t('orderDetails.enterContactNumber'));
            return;
        }

        if (editFields.contact_number.trim().length !== 10) {
            Alert.alert(t('orderDetails.error'), t('orderDetails.contactNumberMustBe10Digits'));
            return;
        }

        try {
            setSaving(true);
            const updates = {
                quantity: newQuantity,
                delivery_address: editFields.delivery_address.trim(),
                contact_number: editFields.contact_number.trim(),
            };

            const updatedOrder = await updateOrder(order.id, updates);

            if (updatedOrder) {
                setOrder(updatedOrder as OrderWithDetails);
                setEditModal(false);
                Alert.alert('Success', 'Order updated successfully');
            } else {
                Alert.alert('Error', 'Failed to update order');
            }
        } catch (error) {
            console.error('Error updating order:', error);
            Alert.alert('Error', 'Failed to update order');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!order) return;

        Alert.alert(
            'Cancel Order',
            `Are you sure you want to cancel this order?\n\nOrder ID: ${order.id}\nProduct: ${order.product_name}`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setCancelling(true);
                            const cancelledOrder = await cancelOrder(order.id);

                            if (cancelledOrder) {
                                setOrder(cancelledOrder as OrderWithDetails);
                                Alert.alert('Success', 'Order cancelled successfully');
                            } else {
                                Alert.alert('Error', 'Failed to cancel order');
                            }
                        } catch (error) {
                            console.error('Error cancelling order:', error);
                            Alert.alert('Error', 'Failed to cancel order');
                        } finally {
                            setCancelling(false);
                        }
                    }
                },
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return '#f59e0b';
            case 'processing':
                return '#3b82f6';
            case 'shipped':
                return '#8b5cf6';
            case 'delivered':
                return '#10b981';
            case 'cancelled':
                return '#ef4444';
            case 'returned':
                return '#6b7280';
            default:
                return '#6b7280';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return t('orderDetails.pending');
            case 'processing':
                return t('orderDetails.processing');
            case 'shipped':
                return t('orderDetails.shipped');
            case 'delivered':
                return t('orderDetails.delivered');
            case 'cancelled':
                return t('orderDetails.cancelled');
            case 'returned':
                return t('orderDetails.returned');
            default:
                return status;
        }
    };

    const getStatusDescription = (status: string) => {
        switch (status) {
            case 'pending':
                return t('orderDetails.pendingDescription');
            case 'processing':
                return t('orderDetails.processingDescription');
            case 'shipped':
                return t('orderDetails.shippedDescription');
            case 'delivered':
                return t('orderDetails.deliveredDescription');
            case 'cancelled':
                return t('orderDetails.cancelledDescription');
            case 'returned':
                return t('orderDetails.returnedDescription');
            default:
                return t('orderDetails.unknownStatusDescription');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderEditModal = () => (
        <Modal
            visible={editModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setEditModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('orderDetails.editOrderModalTitle')}</Text>
                        <TouchableOpacity onPress={() => setEditModal(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>{t('orderDetails.editOrderQuantity')}</Text>
                            <TextInput
                                style={styles.textInput}
                                value={editFields.quantity}
                                onChangeText={(text) => setEditFields(prev => ({ ...prev, quantity: text }))}
                                keyboardType="numeric"
                                placeholder={t('orderDetails.editOrderQuantity')}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>{t('orderDetails.editOrderDeliveryAddress')}</Text>
                            <TextInput
                                style={[styles.textInput, styles.textArea]}
                                value={editFields.delivery_address}
                                onChangeText={(text) => setEditFields(prev => ({ ...prev, delivery_address: text }))}
                                placeholder={t('orderDetails.editOrderDeliveryAddress')}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>{t('orderDetails.editOrderContactNumber')}</Text>
                            <TextInput
                                style={styles.textInput}
                                value={editFields.contact_number}
                                onChangeText={(text) => setEditFields(prev => ({
                                    ...prev,
                                    contact_number: sanitizePhoneInput(text),
                                }))}
                                placeholder={t('orderDetails.editOrderContactNumber')}
                                keyboardType="number-pad"
                                maxLength={10}
                            />
                        </View>

                        <View style={styles.totalPreview}>
                            <Text style={styles.totalPreviewLabel}>{t('orderDetails.editOrderNewTotal')}</Text>
                            <Text style={styles.totalPreviewAmount}>
                                ₹{(parseInt(editFields.quantity) || 0) * (order?.price || 0)}
                            </Text>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelModalButton}
                            onPress={() => setEditModal(false)}
                        >
                            <Text style={styles.cancelModalButtonText}>{t('orderDetails.editOrderCancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleSaveEdit}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.saveButtonText}>{t('orderDetails.editOrderSave')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#af4b0e" />
                    <Text style={styles.loadingText}>{t('orderDetails.loadingOrderDetails')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!order) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{t('orderDetails.orderNotFound')}</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>{t('orderDetails.goBack')}</Text>
                    </TouchableOpacity>
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
                <Text style={styles.headerTitle}>{t('orderDetails.title')}</Text>
                <View style={styles.headerRight} />
            </View>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* Order Status */}
                <View style={styles.statusContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
                    </View>
                    <Text style={styles.orderId}>Order #{order.id.slice(-8)}</Text>
                </View>

                {/* Status Description */}
                <View style={styles.statusDescriptionContainer}>
                    <Text style={styles.statusDescription}>{getStatusDescription(order.status)}</Text>
                </View>

                {/* Product Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('orderDetails.productInformation')}</Text>
                    <View style={styles.productCard}>
                        <Text style={styles.productName}>{order.product_name}</Text>
                        {order.product_description && (
                            <Text style={styles.productDescription}>{order.product_description}</Text>
                        )}
                        <View style={styles.productMeta}>
                            <Text style={styles.metaText}>{t('orderDetails.quantity')}: {order.quantity}</Text>
                            <Text style={styles.metaText}>{t('orderDetails.pricePerUnit')}: ₹{order.price}</Text>
                        </View>
                    </View>
                </View>

                {/* Order Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('orderDetails.orderDetails')}</Text>
                    <View style={styles.detailsCard}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{t('orderDetails.totalAmount')}:</Text>
                            <Text style={styles.detailValue}>₹{order.total_amount.toLocaleString()}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{t('orderDetails.orderDate')}:</Text>
                            <Text style={styles.detailValue}>{formatDate(order.created_at)}</Text>
                        </View>
                        {order.updated_at !== order.created_at && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>{t('orderDetails.lastUpdated')}:</Text>
                                <Text style={styles.detailValue}>{formatDate(order.updated_at)}</Text>
                            </View>
                        )}
                        {order.tracking_number && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>{t('orderDetails.trackingNumber')}:</Text>
                                <Text style={styles.detailValue}>{order.tracking_number}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Manufacturer Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('orderDetails.manufacturer')}</Text>
                    <View style={styles.manufacturerCard}>
                        <Text style={styles.manufacturerName}>{order.manufacturer_name}</Text>
                    </View>
                </View>

                {/* Delivery Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('orderDetails.deliveryInformation')}</Text>
                    <View style={styles.deliveryCard}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{t('orderDetails.deliveryAddress')}:</Text>
                            <Text style={styles.detailValue}>{order.delivery_address}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{t('orderDetails.contactNumber')}:</Text>
                            <Text style={styles.detailValue}>{order.contact_number}</Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                {order.status === 'pending' && (
                    <View style={styles.actionContainer}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.orderButton]}
                            onPress={handleEditOrder}
                        >
                            <Text style={styles.orderButtonText}>{t('orderDetails.editOrder')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.quoteButton]}
                            onPress={handleCancelOrder}
                            disabled={cancelling}
                        >
                            {cancelling ? (
                                <ActivityIndicator size="small" color="#af4b0e" />
                            ) : (
                                <Text style={styles.quoteButtonText}>{t('orderDetails.cancelOrder')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Help Section */}
            </ScrollView>

            {renderEditModal()}
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
        marginRight: 15,
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
    },
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    orderId: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    statusDescriptionContainer: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 10,
        marginHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statusDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        paddingHorizontal: 20,
    },
    productCard: {
        backgroundColor: '#fff',
        padding: 16,
        marginHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    productDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    productMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    headerRight: {
        width: 32,
    },
    metaText: {
        fontSize: 14,
        color: '#666',
    },
    detailsCard: {
        backgroundColor: '#fff',
        padding: 16,
        marginHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        flex: 2,
        textAlign: 'right',
    },
    manufacturerCard: {
        backgroundColor: '#fff',
        padding: 16,
        marginHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    manufacturerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    deliveryCard: {
        backgroundColor: '#fff',
        padding: 16,
        marginHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    actionContainer: {
        padding: 20,
        marginTop: 10,
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    orderButton: {
        backgroundColor: '#af4b0e',
    },
    orderButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    quoteButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#af4b0e',
    },
    quoteButtonText: {
        color: '#af4b0e',
        fontSize: 14,
        fontWeight: '600',
    },
    helpSection: {
        backgroundColor: '#fff',
        padding: 20,
        margin: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    helpTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    helpText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
        lineHeight: 20,
    },
    helpButton: {
        backgroundColor: '#af4b0e',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
    },
    helpButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    formGroup: {
        marginBottom: 20,
    },
    formLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    totalPreview: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 8,
        marginTop: 10,
    },
    totalPreviewLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    totalPreviewAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#af4b0e',
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    cancelModalButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelModalButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#af4b0e',
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 14,
        color: '#fff',
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
        marginTop: 10,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
}); 