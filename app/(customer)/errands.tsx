import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, FlatList, Modal, Alert, ActivityIndicator,
    Image, TextInput as RNTextInput
} from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import API from '@/services/api';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

interface Pal {
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
    pal?: Pal;
}

const STATUS_TABS = ['All', 'Pending', 'Active', 'Completed', 'Cancelled'];

const STATUS_COLORS: Record<string, string> = {
    Pending: '#F59E0B',
    Matched: '#3B82F6',
    Active: '#10B981',
    Completed: '#6B7280',
    Cancelled: '#EF4444',
};

const FILTER_PRESETS = [
    'Custom Period', 'Current week', 'Last week',
    'Current month', 'Last month', 'Current year', 'Last year'
];

const getPresetDates = (preset: string): { start: Date; end: Date } => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (preset) {
        case 'Current week':
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'Last week':
            start.setDate(now.getDate() - now.getDay() - 7);
            start.setHours(0, 0, 0, 0);
            end.setDate(now.getDate() - now.getDay() - 1);
            end.setHours(23, 59, 59, 999);
            break;
        case 'Current month':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'Last month':
            start.setMonth(now.getMonth() - 1, 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'Current year':
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'Last year':
            start.setFullYear(now.getFullYear() - 1, 0, 1);
            start.setHours(0, 0, 0, 0);
            end.setFullYear(now.getFullYear() - 1, 11, 31);
            end.setHours(23, 59, 59, 999);
            break;
        default:
            start.setFullYear(2000);
            end.setHours(23, 59, 59, 999);
    }
    return { start, end };
};

const StarRating = ({ rating, onRate, readonly = false }: {
    rating: number;
    onRate?: (r: number) => void;
    readonly?: boolean;
}) => (
    <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity key={star} onPress={() => !readonly && onRate?.(star)} disabled={readonly}>
                <Text style={{ fontSize: 24, color: star <= rating ? '#F59E0B' : '#D1D5DB' }}>★</Text>
            </TouchableOpacity>
        ))}
    </View>
);

export default function CustomerErrands() {
    const { user } = useAuth();
    const [errands, setErrands] = useState<Errand[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [searchText, setSearchText] = useState('');

    // Filter state
    const [showFilter, setShowFilter] = useState(false);
    const [filterPreset, setFilterPreset] = useState('Custom Period');
    const [filterStart, setFilterStart] = useState<Date | null>(null);
    const [filterStartFinal, setFilterStartFinal] = useState<Date | null>(null);
    const [filterEnd, setFilterEnd] = useState<Date | null>(null);
    const [filterEndFinal, setFilterEndFinal] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [appliedFilter, setAppliedFilter] = useState<{ start: Date; end: Date } | null>(null);

    // Review state
    const [existingReview, setExistingReview] = useState<any>(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [palRating, setPalRating] = useState<{ averageRating: number; totalReviews: number } | null>(null);

    // Date Picker state on iOS
    const [showDatePicker, setShowDatePicker] = useState(false);


    useFocusEffect(useCallback(() => { fetchErrands(); }, []));

    const fetchErrands = async () => {
        setLoading(true);
        try {
            const response = await API.get('/Errand/my-errands');
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
        } catch { } finally {
            setReviewLoading(false);
        }
    };

    const openDetail = (errand: Errand) => {
        setSelectedErrand(errand);
        setPalRating(null);
        setShowDetail(true);
        if (errand.status === 'Completed') {
            fetchErrandReviews(errand.id);
            if (errand.pal?.id) {
                API.get(`/Errand/reviews/user/${errand.pal.id}/stats`)
                    .then(res => setPalRating(res.data))
                    .catch(() => {});
            }
        }
    };

    const handleCompleteErrand = async (errand: Errand) => {
        Alert.alert(
            'Mark as Completed',
            'Are you sure you want to mark this errand as completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete', onPress: async () => {
                        try {
                            await API.post(`/Errand/${errand.id}/complete`);
                            fetchErrands();
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed');
                        }
                    }
                }
            ]
        );
    };

    const handleCancelErrand = async (errand: Errand) => {
        Alert.alert('Cancel Errand', 'Are you sure?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
                    try {
                        await API.post(`/Errand/${errand.id}/cancel`);
                        setShowDetail(false);
                        fetchErrands();
                    } catch (error: any) {
                        Alert.alert('Error', error.response?.data?.message || 'Failed to cancel');
                    }
                }
            }
        ]);
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

    const applyFilter = () => {
        if (filterPreset === 'Custom Period') {
            if (!filterStart || !filterEnd) {
                Alert.alert('Error', 'Please select both start and end dates');
                return;
            }
            setAppliedFilter({ start: filterStart, end: filterEnd });
        } else {
            setAppliedFilter(getPresetDates(filterPreset));
        }
        setShowFilter(false);
    };

    const applySelectedDate = (selectedDate: Date | null = null) => {
        setShowDatePicker(false)
        console.log('filterStart', filterStart);
        if (showStartPicker) {
            setFilterStartFinal(selectedDate || filterStart);
            setShowStartPicker(false);
        }
        else if (showEndPicker) {
            setFilterEndFinal(selectedDate || filterEnd);
            setShowEndPicker(false);
        }
    };

    const closeDatePickerModal = () => {
        setShowDatePicker(false)

        if (showStartPicker) {
            setShowStartPicker(false);
        }
        else if (showEndPicker) {
            setShowEndPicker(false);
        }
    }

    const clearFilter = () => {
        setFilterPreset('Custom Period');
        setFilterStart(null);
        setFilterStartFinal(null);
        setFilterEnd(null);
        setFilterEndFinal(null);
        setAppliedFilter(null);
        setShowFilter(false);
    };

    const filteredErrands = errands.filter(e => {
        // Tab filter
        if (activeTab !== 'All') {
            if (activeTab === 'Active' && !['Active', 'Matched'].includes(e.status)) return false;
            if (activeTab !== 'Active' && e.status !== activeTab) return false;
        }
        // Search filter
        if (searchText) {
            const q = searchText.toLowerCase();
            if (!e.title.toLowerCase().includes(q) && !e.address.toLowerCase().includes(q)) return false;
        }
        // Date filter
        if (appliedFilter) {
            const date = new Date(e.createdAt);
            if (date < appliedFilter.start || date > appliedFilter.end) return false;
        }
        return true;
    });

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

    const formatTime = (dateStr: string) =>
        new Date(dateStr).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

    const isActiveStatus = (status: string) => ['Active', 'Matched'].includes(status);

    const renderErrandCard = ({ item }: { item: Errand }) => (
        <View style={styles.errandCard}>
            <TouchableOpacity style={styles.errandCardMain} onPress={() => openDetail(item)}>
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

            {/* Action buttons for active/matched errands */}
            {isActiveStatus(item.status) && (
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.completeCardBtn}
                        onPress={() => handleCompleteErrand(item)}
                    >
                        <Text style={styles.completeCardBtnText}>✓ Completed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.viewDetailsBtn}
                        onPress={() => openDetail(item)}
                    >
                        <Text style={styles.viewDetailsBtnText}>View Details</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Errands</Text>
            </View>

            {/* Status Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsContainer}
                contentContainerStyle={styles.tabsContent}
            >
                {STATUS_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Search + Filter Row */}
            <View style={styles.searchRow}>
                <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <RNTextInput
                        placeholder="Search errands..."
                        placeholderTextColor="#9CA3AF"
                        value={searchText}
                        onChangeText={setSearchText}
                        style={styles.searchInput}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Text style={{ color: '#9CA3AF', fontSize: 16, paddingHorizontal: 8 }}>×</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.filterBtn, appliedFilter && styles.filterBtnActive]}
                    onPress={() => setShowFilter(true)}
                >
                    <Text style={styles.filterBtnText}>Filter {appliedFilter ? '●' : '▼'}</Text>
                </TouchableOpacity>
            </View>

            {/* Results count */}
            {(searchText || appliedFilter) && (
                <Text style={styles.resultsCount}>
                    {filteredErrands.length} result{filteredErrands.length !== 1 ? 's' : ''}
                </Text>
            )}

            {/* Errand List */}
            {loading ? (
                <ActivityIndicator color="#2563EB" style={{ marginTop: 40 }} />
            ) : filteredErrands.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateIcon}>📋</Text>
                    <Text style={styles.emptyStateText}>No errands found</Text>
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

            {/* FILTER MODAL */}
            <Modal
                visible={showFilter}
                animationType="slide"
                onRequestClose={() => setShowFilter(false)}
            >
                <View style={styles.filterContainer}>
                    <View style={styles.filterHeader}>
                        <TouchableOpacity onPress={() => setShowFilter(false)}>
                            <Text style={styles.backBtn}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.filterTitle}>Filter</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
                        {/* Preset chips */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, marginBottom: 24 }}
                        >
                            {FILTER_PRESETS.map(preset => (
                                <TouchableOpacity
                                    key={preset}
                                    style={[styles.presetChip, filterPreset === preset && styles.presetChipActive]}
                                    onPress={() => {
                                        setFilterPreset(preset);
                                        if (preset !== 'Custom Period') {
                                            setFilterStart(null);
                                            setFilterStartFinal(null);
                                            setFilterEnd(null);
                                            setFilterEndFinal(null);
                                        }
                                    }}
                                >
                                    <Text style={[styles.presetChipText, filterPreset === preset && styles.presetChipTextActive]}>
                                        {preset}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Date pickers — only show for Custom Period */}
                        {filterPreset === 'Custom Period' && (
                            <>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => {
                                        setFilterStart(filterStartFinal || new Date());
                                        setShowStartPicker(true);
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <Text style={[styles.dateInputText, !filterStartFinal && { color: '#9CA3AF' }]}>
                                        {filterStartFinal ? filterStartFinal.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Start date'}
                                    </Text>
                                    <Text style={styles.calendarIcon}>📅</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => {
                                        setFilterEnd(filterEndFinal || new Date());
                                        setShowEndPicker(true);
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <Text style={[styles.dateInputText, !filterEndFinal && { color: '#9CA3AF' }]}>
                                        {filterEndFinal ? filterEndFinal.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'End date'}
                                    </Text>
                                    <Text style={styles.calendarIcon}>📅</Text>
                                </TouchableOpacity>




                            </>
                        )}

                        {/* Preview of selected preset */}
                        {filterPreset !== 'Custom Period' && (
                            <View style={styles.presetPreview}>
                                <Text style={styles.presetPreviewText}>
                                    {(() => {
                                        const { start, end } = getPresetDates(filterPreset);
                                        return `${start.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })} → ${end.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                                    })()}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Bottom buttons */}
                    <View style={styles.filterFooter}>
                        <TouchableOpacity style={styles.clearAllBtn} onPress={clearFilter}>
                            <Text style={styles.clearAllBtnText}>Clear All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyBtn} onPress={applyFilter}>
                            <Text style={styles.applyBtnText}>Apply</Text>
                        </TouchableOpacity>
                    </View>

                    {/*DATE PICKER*/}
                    <Modal
                        visible={showDatePicker}
                        transparent
                        animationType="slide"
                        onRequestClose={() => closeDatePickerModal()}
                    >
                        <TouchableOpacity
                            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
                            activeOpacity={1}
                            onPress={() => closeDatePickerModal()}
                        />
                        <View style={{ backgroundColor: 'white' }}>
                            {/*Cancel & Done controls*/}
                            {Platform.OS === 'ios' && (
                                <View style={{
                                    flexDirection: 'row', gap: 12, padding: 0, justifyContent: 'space-between'
                                }}>
                                    <TouchableOpacity style={{ padding: 10 }} onPress={() => closeDatePickerModal()}>
                                        <Text style={{ color: 'grey' }}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={{ padding: 10 }} onPress={() => applySelectedDate()}>
                                        <Text style={{ color: '#2563EB' }}>Confirm</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/*Start*/}
                            {showStartPicker && (
                                <DateTimePicker
                                    value={filterStart || filterStartFinal || new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(_, date) => {
                                        if (date) setFilterStart(date);
                                        console.log('date', date);
                                        if (Platform.OS === 'android') {
                                            setShowStartPicker(false);
                                            applySelectedDate(date);
                                        }
                                    }}
                                    maximumDate={filterEndFinal || new Date()}
                                    textColor="#111827"
                                    themeVariant="light"
                                />
                            )}

                            {/*End*/}
                            {showEndPicker && (
                                <DateTimePicker
                                    value={filterEnd || filterEndFinal || new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(_, date) => {
                                        if (date) setFilterEnd(date);
                                        if (Platform.OS === 'android') {
                                            setShowEndPicker(false);
                                            applySelectedDate(date);
                                        }
                                    }}
                                    minimumDate={filterStartFinal || undefined}
                                    maximumDate={new Date()}
                                    textColor="#111827"
                                    themeVariant="light"
                                />
                            )}
                        </View>

                    </Modal>
                </View>
            </Modal>

            {/* DETAIL MODAL */}
            <Modal visible={showDetail} animationType="slide" onRequestClose={() => setShowDetail(false)}>
                <View style={styles.detailContainer}>
                    <View style={styles.detailHeader}>
                        <TouchableOpacity onPress={() => setShowDetail(false)}>
                            <Text style={styles.backBtn}>‹ Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.detailHeaderTitle}>{selectedErrand?.status}</Text>
                        <View style={{ width: 50 }} />
                    </View>

                    <ScrollView
                        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {selectedErrand && (
                            <>
                                {selectedErrand.pal && (
                                    <View style={styles.palCard}>
                                        <View style={styles.palCardAvatar}>
                                            {selectedErrand.pal.profileImageUrl ? (
                                                <Image source={{ uri: selectedErrand.pal.profileImageUrl }} style={styles.palAvatarImage} />
                                            ) : (
                                                <Text style={styles.palAvatarInitial}>{selectedErrand.pal.firstName.charAt(0)}</Text>
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.palName}>{selectedErrand.pal.firstName} {selectedErrand.pal.lastName}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                <Text style={{ color: '#F59E0B', fontSize: 13 }}>★</Text>
                                                <Text style={{ fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: '#374151' }}>
                                                    {palRating
                                                        ? `${Number(palRating.averageRating).toFixed(1)} (${Number(palRating.totalReviews)} reviews)`
                                                        : 'No reviews yet'
                                                    }
                                                </Text>
                                            </View>
                                            <Text style={styles.palLabel}>Your Pal</Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedErrand.status] }]}>
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
                                                Completed: {formatDate(selectedErrand.completedAt)} at {formatTime(selectedErrand.completedAt)}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.sectionTitle}>Payment Summary</Text>
                                <View style={styles.detailCard}>
                                    <View style={styles.paymentRow}>
                                        <Text style={styles.paymentLabel}>Service Fee</Text>
                                        <Text style={styles.paymentValue}>₦{selectedErrand.price.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.paymentRow}>
                                        <Text style={styles.paymentLabel}>Service Charge (5%)</Text>
                                        <Text style={styles.paymentValue}>₦{(selectedErrand.price * 0.05).toLocaleString()}</Text>
                                    </View>
                                    <View style={[styles.paymentRow, styles.paymentTotal]}>
                                        <Text style={styles.paymentTotalLabel}>Total</Text>
                                        <Text style={styles.paymentTotalValue}>₦{(selectedErrand.price * 1.05).toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.paymentRow}>
                                        <Text style={styles.paymentLabel}>Payment Method</Text>
                                        <Text style={styles.paymentValue}>Cash</Text>
                                    </View>
                                    <View style={styles.paymentRow}>
                                        <Text style={styles.paymentLabel}>Status</Text>
                                        <Text style={[styles.paymentValue, { color: STATUS_COLORS[selectedErrand.status] }]}>
                                            {selectedErrand.status}
                                        </Text>
                                    </View>
                                </View>

                                {selectedErrand.status === 'Completed' && (
                                    <>
                                        <Text style={styles.sectionTitle}>
                                            {existingReview ? 'Your Review' : 'Leave a Review'}
                                        </Text>
                                        <View style={styles.detailCard}>
                                            {reviewLoading ? (
                                                <ActivityIndicator color="#2563EB" />
                                            ) : (
                                                <>
                                                    <StarRating
                                                        rating={reviewRating}
                                                        onRate={existingReview ? undefined : setReviewRating}
                                                        readonly={!!existingReview}
                                                    />
                                                    {existingReview && reviewComment ? (
                                                        <Text style={styles.reviewComment}>{reviewComment}</Text>
                                                    ) : null}
                                                    {!existingReview && (
                                                        <>
                                                            <RNTextInput
                                                                placeholder="Add a comment (optional)..."
                                                                placeholderTextColor="#9CA3AF"
                                                                value={reviewComment}
                                                                onChangeText={setReviewComment}
                                                                multiline
                                                                numberOfLines={3}
                                                                style={styles.commentInput}
                                                            />
                                                            <TouchableOpacity
                                                                style={[styles.submitReviewBtn, reviewRating === 0 && { opacity: 0.5 }]}
                                                                onPress={handleSubmitReview}
                                                                disabled={submittingReview || reviewRating === 0}
                                                            >
                                                                {submittingReview ? (
                                                                    <ActivityIndicator color="white" size="small" />
                                                                ) : (
                                                                    <Text style={styles.submitReviewBtnText}>Submit Review</Text>
                                                                )}
                                                            </TouchableOpacity>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </View>
                                    </>
                                )}

                                {['Pending', 'Matched'].includes(selectedErrand.status) && (
                                    <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelErrand(selectedErrand)}>
                                        <Text style={styles.cancelBtnText}>Cancel Errand</Text>
                                    </TouchableOpacity>
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

    tabsContainer: {
        backgroundColor: 'white', borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6', maxHeight: 52,
    },
    tabsContent: {
        paddingHorizontal: 16, paddingVertical: 8,
        gap: 8, alignItems: 'center',
    },
    tab: {
        paddingHorizontal: 14, paddingVertical: 4,
        borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8,
    },
    tabActive: { backgroundColor: '#2563EB' },
    tabText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#6B7280' },
    tabTextActive: { color: 'white' },

    searchRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: 'white', gap: 10,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    searchContainer: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F3F4F6', borderRadius: 12,
        paddingHorizontal: 12, height: 40,
    },
    searchIcon: { fontSize: 14, marginRight: 6 },
    searchInput: {
        flex: 1, fontSize: 13, fontFamily: 'Nunito_500Medium',
        color: '#111827', height: 40,
    },
    filterBtn: {
        backgroundColor: '#F3F4F6', borderRadius: 12,
        paddingHorizontal: 14, height: 40,
        justifyContent: 'center', alignItems: 'center',
    },
    filterBtnActive: { backgroundColor: '#DBEAFE' },
    filterBtnText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#2563EB' },

    resultsCount: {
        fontSize: 12, fontFamily: 'Nunito_500Medium',
        color: '#6B7280', paddingHorizontal: 16, paddingTop: 8,
    },

    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyStateIcon: { fontSize: 48 },
    emptyStateText: { fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: '#6B7280' },

    errandCard: {
        backgroundColor: 'white', borderRadius: 16, marginBottom: 10,
        elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
        overflow: 'hidden',
    },
    errandCardMain: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
    },
    errandCardLeft: { flex: 1 },
    errandCardTitle: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#111827', marginBottom: 4 },
    errandCardAddress: { fontSize: 12, fontFamily: 'Nunito_500Medium', color: '#6B7280', marginBottom: 2 },
    errandCardDate: { fontSize: 11, fontFamily: 'Nunito_400Regular', color: '#9CA3AF' },
    errandCardRight: { alignItems: 'flex-end', gap: 8 },
    errandCardPrice: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#2563EB' },

    cardActions: {
        flexDirection: 'row', borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    completeCardBtn: {
        flex: 1, backgroundColor: '#10B981',
        paddingVertical: 12, alignItems: 'center',
    },
    completeCardBtnText: {
        fontSize: 13, fontFamily: 'Nunito_700Bold', color: 'white',
    },
    viewDetailsBtn: {
        flex: 1, backgroundColor: '#2563EB',
        paddingVertical: 12, alignItems: 'center',
    },
    viewDetailsBtnText: {
        fontSize: 13, fontFamily: 'Nunito_700Bold', color: 'white',
    },

    statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    statusBadgeText: { fontSize: 10, fontFamily: 'Nunito_700Bold', color: 'white' },

    // Filter modal
    filterContainer: { flex: 1, backgroundColor: '#F9FAFB' },
    filterHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    filterTitle: { fontSize: 18, fontFamily: 'Nunito_700Bold', color: '#111827' },
    filterFooterContainer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        // flexDirection: 'row', gap: 12, padding: 20,
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    },
    filterFooter: {
        // position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', gap: 12, padding: 20,
        // backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    },
    clearAllBtn: {
        flex: 1, borderWidth: 1, borderColor: '#2563EB',
        borderRadius: 16, paddingVertical: 14, alignItems: 'center',
    },
    clearAllBtnText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: '#2563EB' },
    applyBtn: {
        flex: 1, backgroundColor: '#2563EB',
        borderRadius: 16, paddingVertical: 14, alignItems: 'center',
    },
    applyBtnText: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: 'white' },

    presetChip: {
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB',
        backgroundColor: 'white',
    },
    presetChipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
    presetChipText: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#374151' },
    presetChipTextActive: { color: 'white' },

    dateInput: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'white', borderRadius: 12, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
    },
    dateInputText: { fontSize: 14, fontFamily: 'Nunito_500Medium', color: '#111827' },
    calendarIcon: { fontSize: 18 },

    presetPreview: {
        backgroundColor: '#EFF6FF', borderRadius: 12,
        padding: 16, marginTop: 8,
    },
    presetPreviewText: {
        fontSize: 13, fontFamily: 'Nunito_600SemiBold',
        color: '#2563EB', textAlign: 'center',
    },

    // Detail modal
    detailContainer: { flex: 1, backgroundColor: '#F9FAFB' },
    detailHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    backBtn: { fontSize: 18, fontFamily: 'Nunito_600SemiBold', color: '#2563EB' },
    detailHeaderTitle: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#111827' },

    palCard: {
        backgroundColor: 'white', borderRadius: 16, padding: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, elevation: 2,
    },
    palCardAvatar: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#2563EB',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    palAvatarImage: { width: 48, height: 48, borderRadius: 24 },
    palAvatarInitial: { fontSize: 20, fontFamily: 'Nunito_700Bold', color: 'white' },
    palName: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#111827' },
    palLabel: { fontSize: 12, fontFamily: 'Nunito_500Medium', color: '#6B7280' },

    sectionTitle: {
        fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#374151',
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4,
    },
    detailCard: {
        backgroundColor: 'white', borderRadius: 16, padding: 16,
        marginBottom: 16, gap: 10, elevation: 1,
    },
    detailRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    detailIcon: { fontSize: 14, marginTop: 1 },
    detailText: {
        fontSize: 13, fontFamily: 'Nunito_500Medium', color: '#374151',
        flex: 1, lineHeight: 20,
    },

    paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    paymentLabel: { fontSize: 13, fontFamily: 'Nunito_500Medium', color: '#6B7280' },
    paymentValue: { fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#111827' },
    paymentTotal: { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 4, paddingTop: 8 },
    paymentTotalLabel: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#111827' },
    paymentTotalValue: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#2563EB' },

    reviewComment: {
        fontSize: 13, fontFamily: 'Nunito_500Medium',
        color: '#374151', fontStyle: 'italic', marginTop: 8,
    },
    commentInput: {
        backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12,
        marginTop: 8, minHeight: 60, fontSize: 13,
        fontFamily: 'Nunito_500Medium', color: '#111827', textAlignVertical: 'top',
    },
    submitReviewBtn: {
        backgroundColor: '#2563EB', borderRadius: 12,
        paddingVertical: 12, alignItems: 'center', marginTop: 8,
    },
    submitReviewBtnText: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: 'white' },

    cancelBtn: {
        borderWidth: 1, borderColor: '#EF4444', borderRadius: 16,
        paddingVertical: 14, alignItems: 'center', marginBottom: 12,
    },
    cancelBtnText: { fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: '#EF4444' },
    reportBtn: { alignItems: 'center', paddingVertical: 12 },
    reportBtnText: {
        fontSize: 13, fontFamily: 'Nunito_600SemiBold',
        color: '#EF4444', textDecorationLine: 'underline',
    },
});