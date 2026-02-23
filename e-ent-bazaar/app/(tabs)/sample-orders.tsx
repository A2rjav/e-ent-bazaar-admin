import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCustomerSampleOrdersWithDetails } from '../../lib/sampleOrderService';

export default function SampleOrdersScreen() {
    const { user, isGuest } = useAuth();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const [orders, setOrders] = useState<any[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
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

    useEffect(() => {
        if (isGuest) {
            Alert.alert('Guest Mode', 'Please sign in to view your sample orders and access all features.');
            router.replace('/welcome');
        }
    }, [isGuest, router]);

    if (isGuest) {
        return null;
    }

    const statusFilters: { label: string; value: string }[] = [
        { label: 'All', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Rejected', value: 'rejected' },
    ];

    const loadOrders = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        try {
            const customerOrders = await getCustomerSampleOrdersWithDetails(user.id);
            setOrders(customerOrders);
            setFilteredOrders(customerOrders);
        } catch (error) {
            console.error('Error loading sample orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadOrders();
        setRefreshing(false);
    };

    useFocusEffect(
        React.useCallback(() => {
            loadOrders();
        }, [user?.id])
    );

    useEffect(() => {
        let filtered = orders;
        if (selectedStatus !== 'all') {
            filtered = filtered.filter(order => order.status === selectedStatus);
        }
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(order =>
                (order.product_name || '').toLowerCase().includes(query) ||
                (order.manufacturer_name || '').toLowerCase().includes(query) ||
                (order.id || '').toLowerCase().includes(query)
            );
        }
        setFilteredOrders(filtered);
    }, [orders, selectedStatus, searchQuery]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#f59e0b';
            case 'approved': return '#3b82f6';
            case 'shipped': return '#8b5cf6';
            case 'delivered': return '#10b981';
            case 'cancelled': return '#ef4444';
            case 'rejected': return '#6b7280';
            default: return '#6b7280';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return 'Pending';
            case 'approved': return 'Approved';
            case 'shipped': return 'Shipped';
            case 'delivered': return 'Delivered';
            case 'cancelled': return 'Cancelled';
            case 'rejected': return 'Rejected';
            default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const renderOrderItem = ({ item }: { item: any }) => (
        <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>#{item.id.slice(0, 8)}</Text>
                <Text style={[styles.orderStatus, { color: getStatusColor(item.status) }]}>
                    {getStatusText(item.status)}
                </Text>
            </View>
            <View style={styles.orderDetails}>
                <Text style={styles.productName}>{item.product_name || 'Unknown Product'}</Text>
                <Text style={styles.manufacturerName}>{item.manufacturer_name || 'Unknown Manufacturer'}</Text>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderInfoText}>Qty: {item.quantity}</Text>
                </View>
                <View style={styles.orderFooter}>
                    <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
                </View>
            </View>
        </View>
    );

    const renderStatusFilter = ({ item }: { item: { label: string; value: string } }) => (
        <TouchableOpacity
            style={[
                styles.statusFilter,
                selectedStatus === item.value && styles.statusFilterActive
            ]}
            onPress={() => setSelectedStatus(item.value)}
        >
            <Text style={[
                styles.statusFilterText,
                selectedStatus === item.value && styles.statusFilterTextActive
            ]}>
                {item.label}
            </Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#af4b0e" />
                    <Text style={styles.loadingText}>Loading Sample Orders...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Sample Orders</Text>
                <Text style={styles.subtitle}>
                    {filteredOrders.length} Sample Orders
                </Text>
            </View>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search sample orders..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                />
            </View>
            <View style={styles.filtersContainer}>
                <FlatList
                    data={statusFilters}
                    renderItem={renderStatusFilter}
                    keyExtractor={(item) => item.value}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersList}
                />
            </View>
            <FlatList
                data={filteredOrders}
                renderItem={renderOrderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.ordersList}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No sample orders found.</Text>
                        <Text style={styles.emptyStateSubtext}>
                            You have not requested any samples yet.
                        </Text>
                    </View>
                }
            />
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
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    searchContainer: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    searchInput: {
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    filtersContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    filtersList: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    statusFilter: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: '#f1f5f9',
    },
    statusFilterActive: {
        backgroundColor: '#af4b0e',
    },
    statusFilterText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    statusFilterTextActive: {
        color: '#fff',
    },
    ordersList: {
        padding: 20,
    },
    orderCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    orderNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    orderStatus: {
        fontSize: 12,
        fontWeight: '600',
    },
    orderDetails: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    manufacturerName: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    orderInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    orderInfoText: {
        fontSize: 12,
        color: '#666',
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderDate: {
        fontSize: 12,
        color: '#666',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        paddingHorizontal: 20,
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
}); 