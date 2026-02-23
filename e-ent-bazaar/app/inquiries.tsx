import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    FlatList,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

interface Inquiry {
    id: string;
    manufacturer_name: string;
    manufacturer_phone: string;
    subject: string;
    message: string;
    status: string;
    created_at: string;
    reply?: string;
    reply_by?: string;
    reply_at?: string;
}

interface Manufacturer {
    id: string;
    name: string;
    company_name: string;
    phone: string;
    city: string;
    state: string;
}

export default function InquiriesScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newInquiryModal, setNewInquiryModal] = useState(false);
    const [selectedManufacturer, setSelectedManufacturer] = useState<string>('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    // Mock data for testing
    useEffect(() => {
        const mockInquiries: Inquiry[] = [
            {
                id: '1',
                manufacturer_name: 'ABC Brick Works',
                manufacturer_phone: '+91 98765 43210',
                subject: 'Bulk Order Inquiry',
                message: 'I need 5000 red clay bricks for a construction project. What would be the best price and delivery timeline?',
                status: 'replied',
                created_at: '2024-01-15',
                reply: 'Thank you for your inquiry. We can provide 5000 red clay bricks at ₹8.5 per piece. Delivery within 15 days. Please contact us for further details.',
                reply_by: 'ABC Brick Works',
                reply_at: '2024-01-16',
            },
            {
                id: '2',
                manufacturer_name: 'XYZ Construction',
                manufacturer_phone: '+91 98765 43211',
                subject: 'Product Availability',
                message: 'Do you have concrete blocks available? I need 1000 pieces for immediate delivery.',
                status: 'pending',
                created_at: '2024-01-18',
            },
            {
                id: '3',
                manufacturer_name: 'PQR Materials',
                manufacturer_phone: '+91 98765 43212',
                subject: 'Quality Specifications',
                message: 'What are the quality specifications for your cement bricks? I need them for a residential project.',
                status: 'replied',
                created_at: '2024-01-12',
                reply: 'Our cement bricks meet IS 2185 standards with compressive strength of 10-15 MPa. They are suitable for residential construction.',
                reply_by: 'PQR Materials',
                reply_at: '2024-01-13',
            },
        ];

        const mockManufacturers: Manufacturer[] = [
            {
                id: '1',
                name: 'ABC Brick Works',
                company_name: 'ABC Brick Works Pvt Ltd',
                phone: '+91 98765 43210',
                city: 'Mumbai',
                state: 'Maharashtra',
            },
            {
                id: '2',
                name: 'XYZ Construction',
                company_name: 'XYZ Construction Materials',
                phone: '+91 98765 43211',
                city: 'Pune',
                state: 'Maharashtra',
            },
            {
                id: '3',
                name: 'PQR Materials',
                company_name: 'PQR Materials Ltd',
                phone: '+91 98765 43212',
                city: 'Delhi',
                state: 'Delhi',
            },
        ];

        setInquiries(mockInquiries);
        setManufacturers(mockManufacturers);
        setIsLoading(false);
    }, []);

    const handleSendInquiry = () => {
        if (!selectedManufacturer || !subject.trim() || !message.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        const manufacturer = manufacturers.find(m => m.id === selectedManufacturer);
        if (!manufacturer) {
            Alert.alert('Error', 'Please select a manufacturer');
            return;
        }

        const newInquiry: Inquiry = {
            id: Date.now().toString(),
            manufacturer_name: manufacturer.name,
            manufacturer_phone: manufacturer.phone,
            subject: subject.trim(),
            message: message.trim(),
            status: 'pending',
            created_at: new Date().toISOString().split('T')[0],
        };

        setInquiries(prev => [newInquiry, ...prev]);
        setNewInquiryModal(false);
        setSelectedManufacturer('');
        setSubject('');
        setMessage('');

        Alert.alert('Success', 'Inquiry sent successfully!');
    };

    const handleContactManufacturer = (inquiry: Inquiry) => {
        Alert.alert(
            'Contact Manufacturer',
            `Call ${inquiry.manufacturer_name} at ${inquiry.manufacturer_phone}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call', onPress: () => console.log('Calling manufacturer') },
            ]
        );
    };

    const renderInquiry = ({ item: inquiry }: { item: Inquiry }) => (
        <View style={styles.inquiryCard}>
            <View style={styles.inquiryHeader}>
                <View>
                    <Text style={styles.manufacturerName}>{inquiry.manufacturer_name}</Text>
                    <Text style={styles.manufacturerPhone}>{inquiry.manufacturer_phone}</Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: inquiry.status === 'replied' ? '#10b981' : '#f59e0b' }
                ]}>
                    <Text style={styles.statusText}>
                        {inquiry.status === 'replied' ? 'Replied' : 'Pending'}
                    </Text>
                </View>
            </View>

            <View style={styles.inquiryContent}>
                <Text style={styles.subjectText}>{inquiry.subject}</Text>
                <Text style={styles.messageText}>{inquiry.message}</Text>
                <Text style={styles.dateText}>Sent: {new Date(inquiry.created_at).toLocaleDateString()}</Text>
            </View>

            {inquiry.reply && (
                <View style={styles.replyContainer}>
                    <Text style={styles.replyLabel}>Manufacturer Response:</Text>
                    <Text style={styles.replyText}>{inquiry.reply}</Text>
                    <Text style={styles.replyMeta}>
                        by {inquiry.reply_by} on {inquiry.reply_at ? new Date(inquiry.reply_at).toLocaleDateString() : ''}
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleContactManufacturer(inquiry)}
            >
                <Text style={styles.contactButtonText}>Contact Manufacturer</Text>
            </TouchableOpacity>
        </View>
    );

    const renderNewInquiryModal = () => (
        <Modal
            visible={newInquiryModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setNewInquiryModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Send New Inquiry</Text>
                        <TouchableOpacity onPress={() => setNewInquiryModal(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Select Manufacturer</Text>
                            <TouchableOpacity
                                style={styles.selectButton}
                                onPress={() => {
                                    Alert.alert(
                                        'Select Manufacturer',
                                        'Choose a manufacturer',
                                        [
                                            ...manufacturers.map(m => ({
                                                text: `${m.name} (${m.city})`,
                                                onPress: () => setSelectedManufacturer(m.id)
                                            })),
                                            { text: 'Cancel', style: 'cancel' }
                                        ]
                                    );
                                }}
                            >
                                <Text style={styles.selectButtonText}>
                                    {selectedManufacturer
                                        ? manufacturers.find(m => m.id === selectedManufacturer)?.name || 'Select Manufacturer'
                                        : 'Select Manufacturer'
                                    }
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Subject</Text>
                            <TextInput
                                style={styles.textInput}
                                value={subject}
                                onChangeText={setSubject}
                                placeholder="Enter inquiry subject"
                                maxLength={100}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Message</Text>
                            <TextInput
                                style={[styles.textInput, styles.messageInput]}
                                value={message}
                                onChangeText={setMessage}
                                placeholder="Describe your inquiry in detail..."
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                                maxLength={500}
                            />
                            <Text style={styles.charCount}>{message.length}/500</Text>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelModalButton}
                            onPress={() => setNewInquiryModal(false)}
                        >
                            <Text style={styles.cancelModalButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.sendButton}
                            onPress={handleSendInquiry}
                        >
                            <Text style={styles.sendButtonText}>Send Inquiry</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading inquiries...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Inquiries</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{inquiries.length}</Text>
                        <Text style={styles.statLabel}>Total Inquiries</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>
                            {inquiries.filter(i => i.status === 'replied').length}
                        </Text>
                        <Text style={styles.statLabel}>Replied</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>
                            {inquiries.filter(i => i.status === 'pending').length}
                        </Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.newInquiryButton}
                    onPress={() => setNewInquiryModal(true)}
                >
                    <Text style={styles.newInquiryButtonText}>+ Send New Inquiry</Text>
                </TouchableOpacity>

                <FlatList
                    data={inquiries}
                    renderItem={renderInquiry}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No inquiries found</Text>
                            <Text style={styles.emptySubtext}>
                                Send your first inquiry to a manufacturer
                            </Text>
                        </View>
                    }
                />
            </View>

            {renderNewInquiryModal()}
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
        borderBottomColor: '#e2e8f0',
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
    },
    placeholder: {
        width: 60,
    },
    content: {
        flex: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#af4b0e',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },
    newInquiryButton: {
        backgroundColor: '#af4b0e',
        marginHorizontal: 20,
        marginBottom: 20,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    newInquiryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    listContainer: {
        padding: 20,
    },
    inquiryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    inquiryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    manufacturerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    manufacturerPhone: {
        fontSize: 14,
        color: '#666',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
    inquiryContent: {
        marginBottom: 12,
    },
    subjectText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    messageText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 8,
    },
    dateText: {
        fontSize: 12,
        color: '#999',
    },
    replyContainer: {
        backgroundColor: '#e8f5e8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    replyLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    replyText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 8,
    },
    replyMeta: {
        fontSize: 12,
        color: '#999',
    },
    contactButton: {
        backgroundColor: '#af4b0e',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
    },
    contactButtonText: {
        color: '#fff',
        fontSize: 14,
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
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
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
        maxHeight: '90%',
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
    selectButton: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    selectButtonText: {
        fontSize: 14,
        color: '#333',
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
    messageInput: {
        height: 120,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: '#666',
        textAlign: 'right',
        marginTop: 4,
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
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelModalButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    sendButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#af4b0e',
        borderRadius: 8,
        alignItems: 'center',
    },
    sendButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
}); 