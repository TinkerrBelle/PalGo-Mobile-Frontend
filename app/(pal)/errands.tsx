import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, FlatList, Modal, Alert, ActivityIndicator, Image
} from 'react-native';
import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import API from '@/services/api';
import { useFocusEffect } from 'expo-router';

interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
}

interface Errand {
    id: number;
    title: string;
    description: string;
    address: string;
    price: number;
    status: string;
    category: string;
    createdAt: string;
    completedAt?: string;
    customer?: Customer;
}

const STATUS_TABS = ['All', 'Active', 'Completed', 'Cancelled'];

const STATUS_COLORS: Record<string, string> = {
    Pending: '#F59E0B',
    Matched: '#3B82F6',
    Active: '#10B981',
    Completed: '#6B7280',
    Cancelled: '#EF4444',
};

const StarRating = ({ rating, onRate, readonly = false }: {
    rating: number;
    onRate?: (r: number) => void;
    readonly?: boolean;
}) => (
    <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity
                key={star}
                onPress={() => !readonly && onRate?.(star)}
                disabled={readonly}
            >
                <Text style={{ fontSize: 24, color: star <= rating ? '#F59E0B' : '#D1D5DB' }}>★</Text>
            </TouchableOpacity>
        ))}
    </View>
);

export default function PalErrands() {
    const { user } = useAuth();
    const [errands, setErrands] = useState<Errand[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    const [existingReview, setExistingReview] = useState<any>(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchErrands();
        }, [])
    );

    const fetchErrands = async () => {
        setLoading(true);
        try {
            const response = await API.get('/Errand/pal-errands');
            setErrands(response.data);
        } catch (error) {
            console.log('Error fetching errands:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchErrandReviews = async (errandId: number) => {
        setReviewLoading(true);
        try {
            const response = await API.get(`/Errand/${errandId}/reviews`);
            const myReview = response.data.find((r: any) => r.reviewerId === user?.id);
            if (myReview) {
                setExistingReview(myReview);
                setReviewRating(myReview.rating);
                setReviewComment(myReview.comment || '');
            } else {
                setExistingReview(null);
                setReviewRating(0);
                setReviewComment('');
            }
        } catch (error) {
            console.log('Error fetching reviews:', error);
        } finally {
            setReviewLoading(false);
        }
    };

    const openDetail = (errand: Errand) => {
        setSelectedErrand(errand);
        setShowDetail(true);
        if (errand.status === 'Completed') fetchErrandReviews(errand.id);
    };

    const handleSubmitReview = async () => {
        if (!selectedErrand || reviewRating === 0) {
            Alert.alert('Error', 'Please select a rating');
            return;
        }
        setSubmittingReview(true);
        try {
            await API.post(`/Errand/${selectedErrand.id}/review`, {
                errandId: selectedErrand.id,
                rating: reviewRating,
                comment: reviewComment,
            });
            Alert.alert('Success', 'Review submitted!');
            fetchErrandReviews(selectedErrand.id);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
    };

    const filteredErrands = errands.filter(e => {
        if (activeTab === 'All') return true;
        if (activeTab === 'Active') return ['Active', 'Matched'].includes(e.status);
        return e.status === activeTab;
    });

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

    const formatTime = (dateStr: string) =>
        new Date(dateStr).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

    const renderErrandCard = ({ item }: { item: Errand }) => (
        <TouchableOpacity style={styles.errandCard} onPress={() => openDetail(item)}>
            <View style={styles.errandCardLeft}>
                <Text style={styles.errandCardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.errandCardAddress} numberOfLines={1}>📍 {item.address}</Text>
                <Text style={styles.errandCardDate}>🕐 {formatDate(item.createdAt)}</Text>
            </View>
            <View style={styles.errandCardRight}>
                <Text style={styles.errandCardPrice}>₦{item.price.toLocaleString()}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || '#6B7280' }]}>
                    <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Errands</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        style={styles.tabsContainer} contentContainerStyle={styles.tabsContent}>
                {STATUS_TABS.map(tab => (
                    <TouchableOpacity key={tab}
                                      style={[styles.tab, activeTab === tab && styles.tabActive]}
                                      onPress={() => setActiveTab(tab)}>
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading ? (
                <ActivityIndicator color="#10B981" style={{ marginTop: 40 }} />
            ) : filteredErrands.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateIcon}>📋</Text>
                    <Text style={styles.emptyStateText}>No {activeTab !== 'All' ? activeTab : ''} errands yet</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredErrands}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderErrandCard}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    onRefresh={fetchErrands}
                    refreshing={loading}
                />
            )}

            <Modal visible={showDetail} animationType="slide" onRequestClose={() => setShowDetail(false)}>
                <View style={styles.detailContainer}>
                    <View style={styles.detailHeader}>
                        <TouchableOpacity onPress={() => setShowDetail(false)}>
                            <Text style={styles.backBtn}>‹ Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.detailHeaderTitle}>{selectedErrand?.status}</Text>
                        <View style={{ width: 50 }} />
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
                        {selectedErrand && (
                            <>
                                {/* Customer info */}
                                {selectedErrand.customer && (
                                    <View style={styles.customerCard}>
                                        <View style={styles.customerAvatar}>
                                            {selectedErrand.customer.profileImageUrl ? (
                                                <Image source={{ uri: selectedErrand.customer.profileImageUrl }}
                                                       style={styles.avatarImage} />
                                            ) : (
                                                <Text style={styles.avatarInitial}>
                                                    {selectedErrand.customer.firstName.charAt(0)}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.customerName}>
                                                {selectedErrand.customer.firstName} {selectedErrand.customer.lastName}
                                            </Text>
                                            <Text style={styles.customerLabel}>Customer</Text>
                                        </View>
                                        <View style={[styles.statusBadge,
                                            { backgroundColor: STATUS_COLORS[selectedErrand.status] }]}>
                                            <Text style={styles.statusBadgeText}>{selectedErrand.status}</Text>
                                        </View>
                                    </View>
                                )}

                                <Text style={styles.sectionTitle}>Errand Details</Text>
                                <View style={styles.detailCard}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailIcon}>📌</Text>
                                        <Text style={styles.detailText}>{selectedErrand.title}</Text>
                                    </View>
                                    {selectedErrand.description ? (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailIcon}>📝</Text>
                                            <Text style={styles.detailText}>{selectedErrand.description}</Text>
                                        </View>
                                    ) : null}
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailIcon}>📍</Text>
                                        <Text style={styles.detailText}>{selectedErrand.address}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailIcon}>🕐</Text>
                                        <Text style={styles.detailText}>
                                            {formatDate(selectedErrand.createdAt)} at {formatTime(selectedErrand.createdAt)}
                                        </Text>
                                    </View>
                                    {selectedErrand.completedAt && (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailIcon}>✅</Text>
                                            <Text style={styles.detailText}>
                                                Completed: {formatDate(selectedErrand.completedAt)}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.sectionTitle}>Earnings</Text>
                                <View style={styles.detailCard}>
                                    <View style={styles.paymentRow}>
                                        <Text style={styles.paymentLabel}>Agreed Price</Text>
                                        <Text style={styles.paymentValue}>₦{selectedErrand.price.toLocaleString()}</Text>
                                    </View>
                                    <View style={[styles.paymentRow, styles.paymentTotal]}>
                                        <Text style={styles.paymentTotalLabel}>You Earn</Text>
                                        <Text style={[styles.paymentTotalValue, { color: '#10B981' }]}>
                                            ₦{selectedErrand.price.toLocaleString()}
                                        </Text>
                                    </View>
                                    <View style={styles.paymentRow}>
                                        <Text style={styles.paymentLabel}>Payment Method</Text>
                                        <Text style={styles.paymentValue}>Cash</Text>
                                    </View>
                                </View>

                                {selectedErrand.status === 'Completed' && (
                                    <>
                                        <Text style={styles.sectionTitle}>
                                            {existingReview ? 'Your Review' : 'Rate this Customer'}
                                        </Text>
                                        <View style={styles.detailCard}>
                                            {reviewLoading ? (
                                                <ActivityIndicator color="#10B981" />
                                            ) : (
                                                <>
                                                    <StarRating
                                                        rating={reviewRating}
                                                        onRate={existingReview ? undefined : setReviewRating}
                                                        readonly={!!existingReview}
                                                    />
                                                    {reviewComment ? (
                                                        <Text style={styles.reviewComment}>{reviewComment}</Text>
                                                    ) : null}
                                                    {!existingReview && (
                                                        <TouchableOpacity
                                                            style={[styles.submitReviewBtn,
                                                                { backgroundColor: '#10B981' },
                                                                reviewRating === 0 && { opacity: 0.5 }]}
                                                            onPress={handleSubmitReview}
                                                            disabled={submittingReview || reviewRating === 0}
                                                        >
                                                            {submittingReview ? (
                                                                <ActivityIndicator color="white" size="small" />
                                                            ) : (
                                                                <Text style={styles.submitReviewBtnText}>Submit Review</Text>
                                                            )}
                                                        </TouchableOpacity>
                                                    )}
                                                </>
                                            )}
                                        </View>
                                    </>
                                )}

                                <TouchableOpacity style={styles.reportBtn}>
                                    <Text style={styles.reportBtnText}>Report Issue</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        backgroundColor: 'white', paddingTop: 56, paddingBottom: 16,
        paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    headerTitle: { fontSize: 22, fontFamily: 'Nunito_700Bold', color: '#111827' },
    tabsContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    tabsContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    tab: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
    tabActive: { backgroundColor: '#10B981' },
    tabText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#6B7280' },
    tabTextActive: { color: 'white' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyStateIcon: { fontSize: 48 },
    emptyStateText: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: '#6B7280' },
    errandCard: {
        backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 10,
        flexDirection: 'row', alignItems: 'center', elevation: 2,
    },
    errandCardLeft: { flex: 1 },
    errandCardTitle: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#111827', marginBottom: 4 },
    errandCardAddress: { fontSize: 12, fontFamily: 'Nunito_500Medium', color: '#6B7280', marginBottom: 2 },
    errandCardDate: { fontSize: 11, fontFamily: 'Nunito_400Regular', color: '#9CA3AF' },
    errandCardRight: { alignItems: 'flex-end', gap: 8 },
    errandCardPrice: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#10B981' },
    statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    statusBadgeText: { fontSize: 10, fontFamily: 'Nunito_700Bold', color: 'white' },
    detailContainer: { flex: 1, backgroundColor: '#F9FAFB' },
    detailHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    backBtn: { fontSize: 18, fontFamily: 'Nunito_600SemiBold', color: '#10B981' },
    detailHeaderTitle: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#111827' },
    customerCard: {
        backgroundColor: 'white', borderRadius: 16, padding: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, elevation: 2,
    },
    customerAvatar: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#10B981',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    avatarImage: { width: 48, height: 48, borderRadius: 24 },
    avatarInitial: { fontSize: 20, fontFamily: 'Nunito_700Bold', color: 'white' },
    customerName: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#111827' },
    customerLabel: { fontSize: 12, fontFamily: 'Nunito_500Medium', color: '#6B7280' },
    sectionTitle: {
        fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#374151',
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4,
    },
    detailCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, gap: 10, elevation: 1 },
    detailRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    detailIcon: { fontSize: 14, marginTop: 1 },
    detailText: { fontSize: 13, fontFamily: 'Nunito_500Medium', color: '#374151', flex: 1, lineHeight: 20 },
    paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    paymentLabel: { fontSize: 13, fontFamily: 'Nunito_500Medium', color: '#6B7280' },
    paymentValue: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#111827' },
    paymentTotal: { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 4, paddingTop: 8 },
    paymentTotalLabel: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#111827' },
    paymentTotalValue: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#10B981' },
    reviewComment: { fontSize: 13, fontFamily: 'Nunito_500Medium', color: '#374151', fontStyle: 'italic', marginTop: 8 },
    submitReviewBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
    submitReviewBtnText: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: 'white' },
    reportBtn: { alignItems: 'center', paddingVertical: 12 },
    reportBtnText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#EF4444', textDecorationLine: 'underline' },
});