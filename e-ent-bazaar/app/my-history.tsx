import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    ActivityIndicator,
    RefreshControl,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

const sanitizePhoneInput = (value: string) => value.replace(/\D/g, '').slice(0, 10);

interface HistoryItem {
    id: string;
    type: 'inquiry' | 'quotation' | 'order' | 'sample';
    title: string;
    status: string;
    date: string;
    amount?: string;
    manufacturer?: string;
    product?: string;
    quantity?: string;
    orderId?: string;
    message?: string; // Added for inquiries
    delivery_address?: string; // Added for orders and samples
    contact_number?: string; // Added for orders and samples
    updated_at?: string; // Added for updated_at field
    quoted_price?: string; // Added for quotations
}

export default function MyHistoryScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();
    const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
    const [filteredData, setFilteredData] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedType, setSelectedType] = useState<'all' | 'inquiry' | 'quotation' | 'order' | 'sample'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
    const [editForm, setEditForm] = useState({
        quantity: '',
        message: '',
        delivery_address: '',
        contact_number: '',
        quoted_price: '',
    });

    useEffect(() => {
        if (user?.id) {
            loadHistoryData();
        }
    }, [user?.id]);

    useEffect(() => {
        filterData();
    }, [historyData, selectedType, searchQuery]);

    const loadHistoryData = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const historyItems: HistoryItem[] = [];

            // Load inquiries
            const { data: inquiries, error: inquiryError } = await supabase
                .from('inquiries')
                .select('id, subject, status, created_at, message, updated_at')
                .eq('customer_id', user.id);

            if (!inquiryError && inquiries) {
                inquiries.forEach(inquiry => {
                    historyItems.push({
                        id: inquiry.id,
                        type: 'inquiry',
                        title: inquiry.subject || 'Inquiry',
                        status: inquiry.status || 'pending',
                        date: new Date(inquiry.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        }),
                        manufacturer: 'Unknown',
                        orderId: inquiry.id.slice(-8),
                        message: inquiry.message,
                        updated_at: inquiry.updated_at
                    });
                });
            }

            // Load quotations - using the same approach as quotations tab
            const { data: quotations, error: quotationError } = await supabase
                .from('quotations')
                .select(`
                    *,
                    manufacturers(name, company_name),
                    products(name, description, image_url)
                `)
                .eq('customer_id', user.id);

            if (!quotationError && quotations) {
                quotations.forEach(quotation => {
                    historyItems.push({
                        id: quotation.id,
                        type: 'quotation',
                        title: quotation.products?.name || 'Quote Request',
                        status: quotation.status || 'pending',
                        date: new Date(quotation.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        }),
                        amount: quotation.total_amount ? `₹${quotation.total_amount}` : undefined,
                        manufacturer: quotation.manufacturers?.name || quotation.manufacturers?.company_name || 'Unknown',
                        product: quotation.products?.name || 'Unknown',
                        quantity: quotation.quantity?.toString() || '0',
                        orderId: quotation.id.slice(-8),
                        updated_at: quotation.updated_at,
                        message: quotation.message,
                        quoted_price: quotation.quoted_price,
                    });
                });
            }

            // Load orders
            const { data: orders, error: orderError } = await supabase
                .from('orders')
                .select('id, status, created_at, total_amount, quantity, delivery_address, contact_number, updated_at')
                .eq('customer_id', user.id);

            if (!orderError && orders) {
                orders.forEach(order => {
                    historyItems.push({
                        id: order.id,
                        type: 'order',
                        title: 'Order',
                        status: order.status || 'pending',
                        date: new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        }),
                        amount: order.total_amount ? `₹${order.total_amount}` : undefined,
                        manufacturer: 'Unknown',
                        product: 'Unknown',
                        quantity: order.quantity?.toString() || '0',
                        orderId: order.id.slice(-8),
                        delivery_address: order.delivery_address,
                        contact_number: order.contact_number,
                        updated_at: order.updated_at
                    });
                });
            }

            // Load sample requests
            const { data: sampleOrders, error: sampleError } = await supabase
                .from('sample_orders')
                .select(`
                    *,
                    manufacturers(name, company_name),
                    products(name, description, image_url)
                `)
                .eq('customer_id', user.id);

            if (!sampleError && sampleOrders) {
                sampleOrders.forEach(sample => {
                    historyItems.push({
                        id: sample.id,
                        type: 'sample',
                        title: sample.products?.name || 'Sample Request',
                        status: sample.status || 'pending',
                        date: new Date(sample.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        }),
                        manufacturer: sample.manufacturers?.name || sample.manufacturers?.company_name || 'Unknown',
                        product: sample.products?.name || 'Unknown',
                        quantity: sample.quantity?.toString() || '0',
                        orderId: sample.id.slice(-8),
                        delivery_address: sample.delivery_address,
                        contact_number: sample.contact_number,
                        updated_at: sample.updated_at
                    });
                });
            }

            // Sort by updated_at (most recent updates first), then by created_at as fallback
            historyItems.sort((a, b) => {
                // First try to sort by updated_at if available
                const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.date).getTime();
                const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.date).getTime();
                return bUpdated - aUpdated;
            });
            setHistoryData(historyItems);

        } catch (error) {
            console.error('Error loading history:', error);
            Alert.alert(t('profile.myHistory.error'), t('profile.myHistory.failedToLoadHistory'));
        } finally {
            setLoading(false);
        }
    };

    const filterData = () => {
        let filtered = historyData;

        // Filter by type
        if (selectedType !== 'all') {
            filtered = filtered.filter(item => item.type === selectedType);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.status.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredData(filtered);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadHistoryData();
        setRefreshing(false);
    };

    const handleEditItem = (item: HistoryItem) => {
        setSelectedItem(item);

        // Set form fields based on item type
        if (item.type === 'inquiry') {
            const formData = {
                quantity: '',
                message: item.message || '',
                delivery_address: '',
                contact_number: '',
                quoted_price: '',
            };
            setEditForm(formData);
        } else if (item.type === 'quotation') {
            const formData = {
                quantity: item.quantity || '',
                message: item.message || '',
                delivery_address: '',
                contact_number: '',
                quoted_price: item.quoted_price || '',
            };
            setEditForm(formData);
        } else if (item.type === 'order' || item.type === 'sample') {
            const formData = {
                quantity: item.quantity || '',
                message: '',
                delivery_address: item.delivery_address || '',
                contact_number: item.contact_number || '',
                quoted_price: '',
            };
            setEditForm(formData);
        }

        setEditModalVisible(true);
    };

    const getDeleteConfirmationMessage = (type: string) => {
        const typeLabel = getTypeLabel(type);
        const baseMessage = t('profile.myHistory.deleteConfirmation', { type: '' });
        return baseMessage.replace('{type}', typeLabel);
    };

    const getDeleteSuccessMessage = (type: string) => {
        const typeLabel = getTypeLabel(type);
        const baseMessage = t('profile.myHistory.itemDeletedSuccessfully', { type: '' });
        return baseMessage.replace('{type}', typeLabel);
    };

    const handleDeleteItem = (item: HistoryItem) => {
        Alert.alert(
            t('profile.myHistory.deleteItem'),
            getDeleteConfirmationMessage(item.type),
            [
                { text: t('profile.myHistory.cancel'), style: 'cancel' },
                {
                    text: t('profile.myHistory.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            let error;

                            switch (item.type) {
                                case 'inquiry':
                                    const { error: inquiryError } = await supabase
                                        .from('inquiries')
                                        .delete()
                                        .eq('id', item.id);
                                    error = inquiryError;
                                    break;

                                case 'quotation':
                                    const { error: quotationError } = await supabase
                                        .from('quotations')
                                        .delete()
                                        .eq('id', item.id);
                                    error = quotationError;
                                    break;

                                case 'order':
                                    const { error: orderError } = await supabase
                                        .from('orders')
                                        .delete()
                                        .eq('id', item.id);
                                    error = orderError;
                                    break;

                                case 'sample':
                                    const { error: sampleError } = await supabase
                                        .from('sample_orders')
                                        .delete()
                                        .eq('id', item.id);
                                    error = sampleError;
                                    break;
                            }

                            if (error) {
                                throw error;
                            }

                            Alert.alert(t('profile.myHistory.success'), getDeleteSuccessMessage(item.type));
                            loadHistoryData(); // Reload history
                        } catch (error) {
                            console.error('Error deleting item:', error);
                            Alert.alert(t('profile.myHistory.error'), t('profile.myHistory.failedToDeleteItem'));
                        }
                    }
                }
            ]
        );
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'inquiry':
                return t('profile.myHistory.inquiries');
            case 'quotation':
                return t('profile.myHistory.quotations');
            case 'order':
                return t('profile.myHistory.orders');
            case 'sample':
                return t('profile.myHistory.samples');
            default:
                return type;
        }
    };

    const getUpdateSuccessMessage = (type: string) => {
        const typeLabel = getTypeLabel(type);
        const baseMessage = t('profile.myHistory.itemUpdatedSuccessfully', { type: '' });
        return baseMessage.replace('{type}', typeLabel);
    };

    const handleSaveEdit = async () => {
        if (!selectedItem) return;

        console.log('Saving edit for item:', selectedItem);
        console.log('Form data:', editForm);

        // Validate required fields based on item type
        if (selectedItem.type === 'inquiry' && !editForm.message.trim()) {
            Alert.alert(t('profile.myHistory.validationError'), t('profile.myHistory.enterMessageForInquiry'));
            return;
        }

        if ((selectedItem.type === 'order' || selectedItem.type === 'sample') &&
            (!editForm.quantity.trim() || !editForm.delivery_address.trim() || !editForm.contact_number.trim())) {
            Alert.alert(t('profile.myHistory.validationError'), t('profile.myHistory.fillRequiredFields'));
            return;
        }

        if (selectedItem.type === 'quotation' && (!editForm.quantity.trim() || !editForm.quoted_price.trim())) {
            Alert.alert(t('profile.myHistory.validationError'), t('profile.myHistory.enterQuantityAndPrice'));
            return;
        }

        try {
            let success = false;
            let error = null;

            console.log('Updating item type:', selectedItem.type);

            switch (selectedItem.type) {
                case 'inquiry':
                    console.log('Updating inquiry with message:', editForm.message);
                    const { error: inquiryError } = await supabase
                        .from('inquiries')
                        .update({
                            message: editForm.message.trim(),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', selectedItem.id);
                    error = inquiryError;
                    success = !inquiryError;
                    console.log('Inquiry update result:', { success, error });
                    break;

                case 'quotation':
                    console.log('Updating quotation with:', { quantity: editForm.quantity, quoted_price: editForm.quoted_price });
                    const quantity = parseInt(editForm.quantity) || 0;
                    const quotedPrice = parseFloat(editForm.quoted_price) || 0;
                    const totalAmount = quantity * quotedPrice;

                    const { error: quotationError } = await supabase
                        .from('quotations')
                        .update({
                            quantity: quantity,
                            quoted_price: quotedPrice,
                            total_amount: totalAmount,
                            message: editForm.message.trim() || null,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', selectedItem.id);
                    error = quotationError;
                    success = !quotationError;
                    console.log('Quotation update result:', { success, error });
                    break;

                case 'order':
                    console.log('Updating order with:', { quantity: editForm.quantity, delivery_address: editForm.delivery_address, contact_number: editForm.contact_number });
                    const { error: orderError } = await supabase
                        .from('orders')
                        .update({
                            quantity: parseInt(editForm.quantity) || 0,
                            delivery_address: editForm.delivery_address.trim(),
                            contact_number: editForm.contact_number.trim(),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', selectedItem.id);
                    error = orderError;
                    success = !orderError;
                    console.log('Order update result:', { success, error });
                    break;

                case 'sample':
                    console.log('Updating sample with:', { quantity: editForm.quantity, delivery_address: editForm.delivery_address, contact_number: editForm.contact_number });
                    const { error: sampleError } = await supabase
                        .from('sample_orders')
                        .update({
                            quantity: parseInt(editForm.quantity) || 0,
                            delivery_address: editForm.delivery_address.trim(),
                            contact_number: editForm.contact_number.trim(),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', selectedItem.id);
                    error = sampleError;
                    success = !sampleError;
                    console.log('Sample update result:', { success, error });
                    break;
            }

            if (success) {
                Alert.alert(t('profile.myHistory.success'), getUpdateSuccessMessage(selectedItem.type));
                setEditModalVisible(false);
                setSelectedItem(null);
                setEditForm({
                    quantity: '',
                    message: '',
                    delivery_address: '',
                    contact_number: '',
                    quoted_price: '',
                });
                loadHistoryData(); // Reload history to show updated data
            } else {
                console.error('Update failed with error:', error);
                Alert.alert(t('profile.myHistory.error'), `${getTypeLabel(selectedItem.type)} update failed: ${error?.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating item:', error);
            Alert.alert(t('profile.myHistory.error'), t('profile.myHistory.unexpectedError'));
        }
    };

    const handleCloseModal = () => {
        setEditModalVisible(false);
        setSelectedItem(null);
        setEditForm({
            quantity: '',
            message: '',
            delivery_address: '',
            contact_number: '',
            quoted_price: '',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return '#f59e0b';
            case 'approved':
                return '#10b981';
            case 'shipped':
                return '#3b82f6';
            case 'delivered':
                return '#10b981';
            case 'cancelled':
                return '#ef4444';
            default:
                return '#6b7280';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'inquiry':
                return 'message';
            case 'quotation':
                return 'doc.text';
            case 'order':
                return 'cube.box.fill';
            case 'sample':
                return 'doc.text'; // Assuming sample requests are also documents
            default:
                return 'doc';
        }
    };

    const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
        <View style={styles.historyCard}>
            <View style={styles.cardHeader}>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>#{item.orderId}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.productInfo}>
                    <IconSymbol size={20} name={getTypeIcon(item.type)} color="#af4b0e" />
                    <Text style={styles.productName}>{item.title}</Text>
                </View>

                <Text style={styles.sourceText}>{item.manufacturer}</Text>

                {item.quantity && (
                    <Text style={styles.quantityText}>Qty: {item.quantity}</Text>
                )}

                {item.amount && (
                    <Text style={styles.amountText}>{item.amount}</Text>
                )}

                <Text style={styles.dateText}>{item.date}</Text>
            </View>

            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEditItem(item)}
                >
                    <IconSymbol size={16} name="pencil" color="#af4b0e" />
                    <Text style={styles.editButtonText}>{t('profile.myHistory.edit')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteItem(item)}
                >
                    <IconSymbol size={16} name="trash" color="#ef4444" />
                    <Text style={styles.deleteButtonText}>{t('profile.myHistory.delete')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const getEmptyStateMessage = () => {
        if (selectedType === 'all') {
            return t('profile.myHistory.noItemsFound', { type: '' });
        } else {
            const typeLabel = getTypeLabel(selectedType);
            const baseMessage = t('profile.myHistory.noItemsFound', { type: '' });
            return baseMessage.replace('{type}', typeLabel);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#af4b0e" />
                    <Text style={styles.loadingText}>{t('profile.myHistory.loadingHistory')}</Text>
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
                <Text style={styles.headerTitle}>{t('profile.history')}</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Order Count */}
                <View style={styles.countContainer}>
                    <Text style={styles.countText}>{filteredData.length} {t('profile.myHistory.items')}</Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('profile.myHistory.searchHistory')}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Filter Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterContainer}
                >
                    <TouchableOpacity
                        style={[styles.filterButton, selectedType === 'all' && styles.activeFilterButton]}
                        onPress={() => setSelectedType('all')}
                    >
                        <Text style={[styles.filterButtonText, selectedType === 'all' && styles.activeFilterButtonText]}>
                            {t('profile.myHistory.all')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, selectedType === 'inquiry' && styles.activeFilterButton]}
                        onPress={() => setSelectedType('inquiry')}
                    >
                        <Text style={[styles.filterButtonText, selectedType === 'inquiry' && styles.activeFilterButtonText]}>
                            {t('profile.myHistory.inquiries')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, selectedType === 'quotation' && styles.activeFilterButton]}
                        onPress={() => setSelectedType('quotation')}
                    >
                        <Text style={[styles.filterButtonText, selectedType === 'quotation' && styles.activeFilterButtonText]}>
                            {t('profile.myHistory.quotations')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, selectedType === 'order' && styles.activeFilterButton]}
                        onPress={() => setSelectedType('order')}
                    >
                        <Text style={[styles.filterButtonText, selectedType === 'order' && styles.activeFilterButtonText]}>
                            {t('profile.myHistory.orders')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, selectedType === 'sample' && styles.activeFilterButton]}
                        onPress={() => setSelectedType('sample')}
                    >
                        <Text style={[styles.filterButtonText, selectedType === 'sample' && styles.activeFilterButtonText]}>
                            {t('profile.myHistory.samples')}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* History List */}
                {filteredData.length > 0 ? (
                    <View style={styles.listContainer}>
                        {filteredData.map((item) => (
                            <View key={item.id}>
                                {renderHistoryItem({ item })}
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <IconSymbol size={48} name="doc.text" color="#6b7280" />
                        <Text style={styles.emptyText}>
                            {getEmptyStateMessage()}
                        </Text>
                        <Text style={styles.emptySubtext}>{t('profile.myHistory.tryAdjustingSearch')}</Text>
                    </View>
                )}
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={handleCloseModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {selectedItem ? `${t('profile.myHistory.edit')} ${getTypeLabel(selectedItem.type)}` : t('profile.myHistory.edit')}
                            </Text>
                            <TouchableOpacity onPress={handleCloseModal}>
                                <IconSymbol size={24} name="xmark" color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll}>
                            {selectedItem?.type === 'inquiry' && (
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('profile.myHistory.message')}
                                    value={editForm.message}
                                    onChangeText={(text: string) => setEditForm({ ...editForm, message: text })}
                                    multiline
                                    numberOfLines={4}
                                />
                            )}

                            {selectedItem?.type === 'quotation' && (
                                <>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('profile.myHistory.quantity')}
                                        value={editForm.quantity}
                                        onChangeText={(text: string) => setEditForm({ ...editForm, quantity: text })}
                                        keyboardType="numeric"
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('profile.myHistory.message')}
                                        value={editForm.message}
                                        onChangeText={(text: string) => setEditForm({ ...editForm, message: text })}
                                        multiline
                                        numberOfLines={4}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('profile.myHistory.quotedPrice')}
                                        value={editForm.quoted_price}
                                        onChangeText={(text: string) => setEditForm({ ...editForm, quoted_price: text })}
                                        keyboardType="numeric"
                                    />
                                </>
                            )}

                            {(selectedItem?.type === 'order' || selectedItem?.type === 'sample') && (
                                <>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('profile.myHistory.quantity')}
                                        value={editForm.quantity}
                                        onChangeText={(text: string) => setEditForm({ ...editForm, quantity: text })}
                                        keyboardType="numeric"
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('profile.myHistory.deliveryAddress')}
                                        value={editForm.delivery_address}
                                        onChangeText={(text: string) => setEditForm({ ...editForm, delivery_address: text })}
                                        multiline
                                        numberOfLines={3}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('profile.myHistory.contactNumber')}
                                        value={editForm.contact_number}
                                        onChangeText={(text: string) => setEditForm({ ...editForm, contact_number: sanitizePhoneInput(text) })}
                                        keyboardType="number-pad"
                                        maxLength={10}
                                    />
                                </>
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCloseModal}
                            >
                                <Text style={styles.cancelButtonText}>{t('profile.myHistory.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSaveEdit}
                            >
                                <Text style={styles.saveButtonText}>{t('profile.myHistory.saveChanges')}</Text>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
    },
    countContainer: {
        padding: 20,
        paddingBottom: 10,
    },
    countText: {
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '500',
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    searchInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    filterContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    filterButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#f1f3f4',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    activeFilterButton: {
        backgroundColor: '#af4b0e',
        borderColor: '#af4b0e',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    activeFilterButtonText: {
        color: '#fff',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    historyCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        marginBottom: 12,
    },
    orderInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderId: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        textTransform: 'capitalize',
    },
    cardContent: {
        marginBottom: 16,
    },
    productInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginLeft: 8,
    },
    sourceText: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    quantityText: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    amountText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#af4b0e',
        marginBottom: 4,
    },
    dateText: {
        fontSize: 14,
        color: '#6b7280',
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f1f3f4',
        paddingTop: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 4,
        justifyContent: 'center',
    },
    editButton: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#af4b0e',
    },
    deleteButton: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#af4b0e',
        marginLeft: 4,
    },
    deleteButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ef4444',
        marginLeft: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 16,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
        borderBottomColor: '#f1f3f4',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    modalScroll: {
        padding: 20,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e9ecef',
        marginBottom: 16,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f1f3f4',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e9ecef',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#af4b0e',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
}); 