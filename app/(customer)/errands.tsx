import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, FlatList, Modal, Alert, ActivityIndicator,
    Image, TextInput as RNTextInput, ImageBackground
} from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import API from '@/services/api';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import {COLORS} from "@/constants/colors";
import * as Location from 'expo-location';

interface Pal {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    averageRating?: string;
}

interface Errand {
    id: number;
    title: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    price: number;
    status: string;
    category: string;
    createdAt: string;
    completedAt?: string;
    acceptedAt?: string;      // ← ADD (maps to AcceptedByCustomerAt)
    pal?: Pal;
}

interface PalApplication {
    applicationId: number;
    palId: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    message?: string;
    appliedAt: string;
    averageRating: number;
    totalReviews: number;
    palLatitude?: number;
    palLongitude?: number;
}



const STATUS_TABS = ['Completed', 'Active', 'Pending', 'Cancelled'];
// const STATUS_TABS = ['All', 'Pending', 'Active', 'Completed', 'Cancelled'];

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
    const [activeTab, setActiveTab] = useState('Completed');
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

    // Add to state:
    const [applications, setApplications] = useState<PalApplication[]>([]);
    const [loadingApplications, setLoadingApplications] = useState(false);
    const [showApplications, setShowApplications] = useState(false);
    const [selectedPendingErrand, setSelectedPendingErrand] = useState<Errand | null>(null);
    const [acceptingPal, setAcceptingPal] = useState<number | null>(null);

    // Add to state
    const [errandApplications, setErrandApplications] = useState<Record<number, PalApplication[]>>({});
    // const [loadingApplications, setLoadingApplications] = useState<Record<number, boolean>>({});
    const [expandedErrandId, setExpandedErrandId] = useState<number | null>(null);
    // const [acceptingPal, setAcceptingPal] = useState<number | null>(null);
    const [customerLocation, setCustomerLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    useFocusEffect(useCallback(() => {
        fetchErrands();
    }, []));

    // Get customer location on mount
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const loc = await Location.getCurrentPositionAsync({});
                setCustomerLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
            } catch { }
        })();
    }, []);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
    };

    const formatTimeAgo = (dateStr: string): string => {
        // Force UTC parsing by appending Z if not present
        const dateString = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
        const diff = Date.now() - new Date(dateString).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

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

    const fetchApplications = async (errandId: number) => {
        setLoadingApplications(true);
        try {
            const response = await API.get(`/Errand/${errandId}/applications`);
            setApplications(response.data);
        } catch (error) {
            console.log('Error fetching applications:', error);
        } finally {
            setLoadingApplications(false);
        }
    };

    /*const fetchApplicationsForErrand = async (errandId: number) => {
        setLoadingApplications(prev => ({ ...prev, [errandId]: true }));
        try {
            const response = await API.get(`/Errand/${errandId}/applications`);
            setErrandApplications(prev => ({ ...prev, [errandId]: response.data }));
        } catch (error) {
            console.log('Error fetching applications:', error);
        } finally {
            setLoadingApplications(prev => ({ ...prev, [errandId]: false }));
        }
    };*/

    /*const handleAcceptPalApplication = async (errandId: number, applicationId: number) => {
        Alert.alert('Accept Pal', 'Are you sure you want to accept this Pal?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Accept', onPress: async () => {
                    setAcceptingPal(applicationId);
                    try {
                        await API.post(`/Errand/${errandId}/accept-application`, { applicationId });
                        Alert.alert('Success', 'Pal accepted! Your errand is now active.');
                        setExpandedErrandId(null);
                        setErrandApplications({});
                        fetchErrands();
                    } catch (error: any) {
                        Alert.alert('Error', error.response?.data?.message || 'Failed to accept');
                    } finally {
                        setAcceptingPal(null);
                    }
                }
            }
        ]);
    };*/

    const handleAcceptPalApplication = async (applicationId: number) => {
        if (!selectedPendingErrand) return;
        Alert.alert(
            'Accept Pal',
            'Are you sure you want to accept this Pal?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept', onPress: async () => {
                        setAcceptingPal(applicationId);
                        try {
                            await API.post(`/Errand/${selectedPendingErrand.id}/accept-application`, {
                                applicationId,
                            });
                            Alert.alert('Success', 'Pal accepted! Your errand is now active.');
                            setShowApplications(false);
                            fetchErrands();
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to accept');
                        } finally {
                            setAcceptingPal(null);
                        }
                    }
                }
            ]
        );
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
    const isPendingStatus = (status: string) => ['Pending', 'Matched'].includes(status);
    const isCancelStatus = (status: string) => ['Cancelled'].includes(status);

    const renderErrandCard = ({ item }: { item: Errand }) => (
        <View style={[styles.errandCard,
            isActiveStatus(item.status) && { borderWidth: 1, borderColor: COLORS.secondary, borderRadius: 20 },
            isPendingStatus(item.status) && { borderRadius: 20 },
        ]}>
            {isActiveStatus(item.status) ? (
                <View>
                    {/*<TouchableOpacity onPress={() => openDetail(item)}>*/}
                    <View style={[styles.errandCardLeft, { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }]}>
                        <Text style={{ fontSize: 13, color: COLORS.header }}
                              numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.errandCardDate}> - {formatDate(item.createdAt)}</Text>
                    </View>
                    <View style={[styles.errandCardMain, { paddingBottom: 0 }]}>
                        <View style={styles.errandCardLeft}>
                            <Text style={[styles.errandCardTitle, { fontFamily: 'Nunito_600SemiBold' }]} numberOfLines={1}>{item.pal?.firstName} {item.pal?.lastName}</Text>
                            <Text style={styles.errandCardDate}> - {formatDate(item.createdAt)}</Text>
                        </View>
                        <View style={styles.errandCardRight}>
                            <Text style={[styles.errandCardPrice, isCancelStatus(item.status) && { color: COLORS.red }]}>
                                ₦{item.price.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.errandCardMain}>
                        <View style={styles.errandCardLeft}>
                            <Text style={[styles.errandCardPrice, { fontSize: 16 }, isCancelStatus(item.status) && { color: COLORS.red }]}>
                                ₦{item.price.toLocaleString()}
                                {/*{item.palLatitude && item.palLongitude && selectedPendingErrand?.latitude && selectedPendingErrand?.longitude && (
                                    <Text style={styles.metaText}>
                                        📍 {calculateDistance(selectedPendingErrand?.latitude, selectedPendingErrand?.longitude, item.palLatitude, item.palLongitude)}
                                    </Text>
                                )}*/}
                            </Text>
                        </View>
                        <View style={styles.errandCardRight}>
                            {item.acceptedAt && (
                                <Text style={[styles.errandCardPrice, isCancelStatus(item.status) && { color: COLORS.red }]}>
                                    {formatTimeAgo(item.acceptedAt)}
                                </Text>
                            )}
                        </View>
                    </View>
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={styles.completeCardBtn}
                            onPress={() => handleCompleteErrand(item)}
                        >
                            <ImageBackground source={require('../../assets/images/btn_6.png')}
                                             resizeMode="stretch" style={styles.cardActionsBtn}>
                                <Text style={styles.completeCardBtnText}>Completed</Text>
                            </ImageBackground>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.viewDetailsBtn}
                            onPress={() => openDetail(item)}
                        >
                            <ImageBackground source={require('../../assets/images/btn_5.png')}
                                             resizeMode="stretch" style={styles.cardActionsBtn}>
                                <Text style={styles.viewDetailsBtnText}>View Details</Text>
                            </ImageBackground>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : isPendingStatus(item.status) ? (
                // PENDING CARD — shows applicant count + view/accept buttons
                <View>
                    <View style={styles.errandCardMain}>
                        <View style={styles.errandCardLeft}>
                            <Text style={styles.errandCardTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.errandCardDate}> - {formatDate(item.createdAt)}</Text>
                        </View>
                        <View style={styles.errandCardRight}>
                            <Text style={styles.errandCardPrice}>₦{item.price.toLocaleString()}</Text>
                            <Image source={require('../../assets/images/chevron_right.png')}
                                   style={{ width: 5, height: 12, alignSelf: 'center' }} />
                        </View>
                    </View>
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={styles.viewDetailsBtn}
                            onPress={() => openDetail(item)}
                        >
                            <ImageBackground source={require('../../assets/images/btn_5.png')}
                                             resizeMode="stretch" style={styles.cardActionsBtn}>
                                <Text style={styles.viewDetailsBtnText}>View Details</Text>
                            </ImageBackground>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.completeCardBtn}
                            onPress={() => {
                                setSelectedPendingErrand(item);
                                fetchApplications(item.id);
                                setShowApplications(true);
                            }}
                        >
                            <ImageBackground source={require('../../assets/images/btn_6.png')}
                                             resizeMode="stretch" style={styles.cardActionsBtn}>
                                <Text style={styles.completeCardBtnText}>View Pals</Text>
                            </ImageBackground>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity style={styles.errandCardMain} onPress={() => openDetail(item)}>
                    <View style={styles.errandCardLeft}>
                        <Text style={styles.errandCardTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.errandCardDate}> - {formatDate(item.createdAt)}</Text>
                    </View>
                    <View style={styles.errandCardRight}>
                        <Text style={[styles.errandCardPrice, isCancelStatus(item.status) && { color: COLORS.red }]}>
                            ₦{item.price.toLocaleString()}
                        </Text>
                        <Image source={require('../../assets/images/chevron_right.png')}
                               style={{ width: 5, height: 12, alignSelf: 'center' }} />
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
/*
    const renderErrandCard = ({ item }: { item: Errand }) => {
        const isExpanded = expandedErrandId === item.id;
        const apps = errandApplications[item.id] || [];
        const isLoadingApps = loadingApplications[item.id];

        return (
            <View style={[styles.errandCard,
                isActiveStatus(item.status) && { borderWidth: 1, borderColor: COLORS.secondary, borderRadius: 20 },
                isPendingStatus(item.status) && isExpanded && { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 20 }
            ]}>
                {isActiveStatus(item.status) ? (
                    // ── ACTIVE CARD ──
                    <TouchableOpacity onPress={() => openDetail(item)}>
                        <View style={styles.errandCardMain}>
                            <View style={styles.errandCardLeft}>
                                <Text style={styles.errandCardTitle} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.errandCardDate}> - {formatDate(item.createdAt)}</Text>
                            </View>
                            <View style={styles.errandCardRight}>
                                <Text style={styles.errandCardPrice}>₦{item.price.toLocaleString()}</Text>
                                <Image source={require('../../assets/images/chevron_right.png')}
                                       style={{ width: 5, height: 12, alignSelf: 'center' }} />
                            </View>
                        </View>
                        {/!* Active meta info *!/}
                        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 8 }}>
                            <Text style={styles.metaText}>
                                🕐 Active {item.acceptedAt ? formatTimeAgo(item.acceptedAt) : ''}
                            </Text>
                            {item.pal && customerLocation && item.latitude && item.longitude && (
                                <Text style={styles.metaText}>
                                    📍 {calculateDistance(customerLocation.latitude, customerLocation.longitude, item.latitude, item.longitude)} away
                                </Text>
                            )}
                        </View>
                        <View style={styles.cardActions}>
                            <TouchableOpacity style={styles.completeCardBtn} onPress={() => handleCompleteErrand(item)}>
                                <ImageBackground source={require('../../assets/images/btn_6.png')}
                                                 resizeMode="stretch" style={styles.cardActionsBtn}>
                                    <Text style={styles.completeCardBtnText}>Completed</Text>
                                </ImageBackground>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.viewDetailsBtn} onPress={() => openDetail(item)}>
                                <ImageBackground source={require('../../assets/images/btn_5.png')}
                                                 resizeMode="stretch" style={styles.cardActionsBtn}>
                                    <Text style={styles.viewDetailsBtnText}>View Details</Text>
                                </ImageBackground>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                ) : isPendingStatus(item.status) ? (
                    // ── PENDING CARD with inline applicants ──
                    <View>
                        <TouchableOpacity
                            style={styles.errandCardMain}
                            onPress={() => {
                                if (isExpanded) {
                                    setExpandedErrandId(null);
                                } else {
                                    setExpandedErrandId(item.id);
                                    if (!errandApplications[item.id]) {
                                        fetchApplicationsForErrand(item.id);
                                    }
                                }
                            }}
                        >
                            <View style={styles.errandCardLeft}>
                                <Text style={styles.errandCardTitle} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.errandCardDate}> - {formatDate(item.createdAt)}</Text>
                            </View>
                            <View style={styles.errandCardRight}>
                                <Text style={styles.errandCardPrice}>₦{item.price.toLocaleString()}</Text>
                                <Image
                                    source={require('../../assets/images/chevron_right.png')}
                                    style={{
                                        width: 5, height: 12, alignSelf: 'center',
                                        transform: [{ rotate: isExpanded ? '90deg' : '0deg' }]
                                    }}
                                />
                            </View>
                        </TouchableOpacity>

                        {/!* Applicants inline *!/}
                        {isExpanded && (
                            <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                                {isLoadingApps ? (
                                    <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 16 }} />
                                ) : apps.length === 0 ? (
                                    <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'Nunito_500Medium' }}>
                                            No applications yet. Pals will appear here once they apply.
                                        </Text>
                                    </View>
                                ) : (
                                    apps.map(app => (
                                        <View key={app.applicationId} style={styles.applicantCard}>
                                            {/!* Pal avatar + info *!/}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                                <View style={styles.applicantAvatar}>
                                                    {app.profileImageUrl ? (
                                                        <Image source={{ uri: app.profileImageUrl }}
                                                               style={{ width: 40, height: 40, borderRadius: 20 }} />
                                                    ) : (
                                                        <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: 'white' }}>
                                                            {app.firstName.charAt(0)}
                                                        </Text>
                                                    )}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 13, fontFamily: 'Nunito_700Bold', color: COLORS.header }}>
                                                        {app.firstName} {app.lastName}
                                                    </Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                        <Text style={{ color: '#F59E0B', fontSize: 11 }}>★</Text>
                                                        <Text style={{ fontSize: 11, fontFamily: 'Nunito_600SemiBold', color: '#6B7280' }}>
                                                            {app.totalReviews > 0
                                                                ? `${Number(app.averageRating).toFixed(1)} (${app.totalReviews})`
                                                                : 'No reviews'}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                                                    {app.palLatitude && app.palLongitude && item.latitude && item.longitude && (
                                                        <Text style={styles.metaText}>
                                                            📍 {calculateDistance(item.latitude, item.longitude, app.palLatitude, app.palLongitude)}
                                                        </Text>
                                                    )}
                                                    <Text style={styles.metaText}>
                                                        🕐 {formatTimeAgo(app.appliedAt)}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/!* Message *!/}
                                            {app.message ? (
                                                <View style={styles.applicantMessage}>
                                                    <Text style={{ fontSize: 11, fontFamily: 'Nunito_400Regular', color: '#374151', fontStyle: 'italic' }}>
                                                        "{app.message}"
                                                    </Text>
                                                </View>
                                            ) : null}

                                            {/!* Buttons *!/}
                                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                                <TouchableOpacity
                                                    style={styles.viewDetailsBtn}
                                                    onPress={() => openDetail(item)}
                                                >
                                                    <ImageBackground source={require('../../assets/images/btn_5.png')}
                                                                     resizeMode="stretch" style={styles.cardActionsBtn}>
                                                        <Text style={styles.viewDetailsBtnText}>View Details</Text>
                                                    </ImageBackground>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.completeCardBtn}
                                                    onPress={() => handleAcceptPalApplication(item.id, app.applicationId)}
                                                    disabled={acceptingPal === app.applicationId}
                                                >
                                                    <ImageBackground source={require('../../assets/images/btn_6.png')}
                                                                     resizeMode="stretch" style={styles.cardActionsBtn}>
                                                        {acceptingPal === app.applicationId ? (
                                                            <ActivityIndicator color="white" size="small" />
                                                        ) : (
                                                            <Text style={styles.completeCardBtnText}>Accept</Text>
                                                        )}
                                                    </ImageBackground>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>
                        )}

                        {/!* Bottom buttons row *!/}
                        <View style={styles.cardActions}>
                            <TouchableOpacity style={styles.viewDetailsBtn} onPress={() => openDetail(item)}>
                                <ImageBackground source={require('../../assets/images/btn_5.png')}
                                                 resizeMode="stretch" style={styles.cardActionsBtn}>
                                    <Text style={styles.viewDetailsBtnText}>View Details</Text>
                                </ImageBackground>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.completeCardBtn}
                                onPress={() => {
                                    if (isExpanded) {
                                        setExpandedErrandId(null);
                                    } else {
                                        setExpandedErrandId(item.id);
                                        if (!errandApplications[item.id]) {
                                            fetchApplicationsForErrand(item.id);
                                        }
                                    }
                                }}
                            >
                                <ImageBackground source={require('../../assets/images/btn_6.png')}
                                                 resizeMode="stretch" style={styles.cardActionsBtn}>
                                    <Text style={styles.completeCardBtnText}>
                                        {isExpanded ? 'Hide Pals' : `View Pals`}
                                    </Text>
                                </ImageBackground>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    // ── OTHER CARDS (Completed, Cancelled) ──
                    <TouchableOpacity style={styles.errandCardMain} onPress={() => openDetail(item)}>
                        <View style={styles.errandCardLeft}>
                            <Text style={styles.errandCardTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.errandCardDate}> - {formatDate(item.createdAt)}</Text>
                        </View>
                        <View style={styles.errandCardRight}>
                            <Text style={[styles.errandCardPrice, isCancelStatus(item.status) && { color: COLORS.red }]}>
                                ₦{item.price.toLocaleString()}
                            </Text>
                            <Image source={require('../../assets/images/chevron_right.png')}
                                   style={{ width: 5, height: 12, alignSelf: 'center' }} />
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        );
    };
*/

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Errands</Text>
            </View>

            {/* Status Tabs */}
            <View style={styles.tabsWrapper}>
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
            </View>

            {/* Search + Filter Row */}
            <ImageBackground source={require('../../assets/images/input-bg.png')} resizeMode={"stretch"} style={{ margin: 16 }}>
                <View style={styles.searchContainer} >
                    <Image source={require('../../assets/images/search_icon.png')} style={{
                        width: 18, height: 18,
                    }}/>
                    <RNTextInput
                        placeholder="Search"
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
            </ImageBackground>

            {/*Filter Button*/}
            <TouchableOpacity
                style={styles.filterBtn}
                onPress={() => setShowFilter(true)}
            >
                <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={styles.filterBtnText}>Filter</Text>
                    <Image source={require('../../assets/images/filter_icon.png')} style={{
                        width: 14, height: 14,
                    }}/>
                </View>
            </TouchableOpacity>

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
                    {/*<Text style={styles.emptyStateIcon}>📋</Text>*/}
                    <Image source={require('../../assets/images/no_errands.png')} style={{
                        width: Platform.OS === 'ios' ? 334 : 274, height: Platform.OS === 'ios' ? 334 : 274,
                    }}/>
                    <Text style={styles.emptyStateHeader}>Nothing to see yet!</Text>
                    <Text style={styles.emptyStateText}>Once you initiate any errand, your{"\n"}
                        {activeTab.toLowerCase()} errands will appear here.</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredErrands}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderErrandCard}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 6 }}
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
                        <TouchableOpacity onPress={() => setShowFilter(false)} style={styles.backButton}>
                            {/*<Text style={styles.backBtn}>‹</Text>*/}
                            <Image
                                source={require('../../assets/images/back-button.png')}
                                style={{ width: 32, height: 32, }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        <Text style={styles.filterTitle}>Filter</Text>
                        {/*<View style={{ width: 40, backgroundColor: 'red' }} />*/}
                    </View>

                    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 }}>
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
                                    onPress={() => {
                                        setFilterStart(filterStartFinal || new Date());
                                        setShowStartPicker(true);
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <ImageBackground style={styles.dateInput}
                                        source={require('../../assets/images/input-bg-date.png')}
                                        resizeMode='stretch'
                                    >
                                        <View style={{ gap: Platform.OS === 'ios' ? 4 : 2 }}>
                                            <Text style={[styles.dateInputLabel, !filterStartFinal && { color: COLORS.header, fontSize: 12 }]}>Start date</Text>
                                            {filterStartFinal && (
                                                <Text style={styles.dateInputText}>
                                                    {filterStartFinal.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </Text>
                                            )}
                                        </View>
                                        <Image source={require('../../assets/images/calendar_icon.png')} style={{
                                            width: 13, height: 15,
                                        }}/>
                                    </ImageBackground>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => {
                                        setFilterEnd(filterEndFinal || new Date());
                                        setShowEndPicker(true);
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <ImageBackground style={styles.dateInput}
                                                     source={require('../../assets/images/input-bg-date.png')}
                                                     resizeMode='stretch'
                                    >
                                        <View style={{ gap: Platform.OS === 'ios' ? 4 : 2 }}>
                                            <Text style={[styles.dateInputLabel, !filterEndFinal && { color: COLORS.header, fontSize: 12 }]}>End date</Text>
                                            {filterEndFinal && (
                                                <Text style={styles.dateInputText}>
                                                    {filterEndFinal.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </Text>
                                            )}
                                        </View>
                                        <Image source={require('../../assets/images/calendar_icon.png')} style={{
                                            width: 13, height: 15,
                                        }}/>
                                    </ImageBackground>
                                </TouchableOpacity>




                            </>
                        )}

                        {/* Preview of selected preset */}
                        {filterPreset !== 'Custom Period' && (
                            <ImageBackground
                                // style={styles.dateInput}
                                             source={require('../../assets/images/input-bg-tall.png')}
                                             style={{ height: Platform.OS === 'ios' ? 85 : 75, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 21 : 19 }}
                                             resizeMode='stretch'
                            >
                            <View>
                                <Text style={styles.dateInputLabel}>Date range</Text>
                                <View style={styles.presetPreview}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, justifyContent: 'center' }}>
                                        {/*<Text style={styles.dateInputText}>
                                            {(() => {
                                                const { start, end } = getPresetDates(filterPreset);
                                                return `${start.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })} → ${end.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}`;
                                            })()}
                                        </Text>*/}
                                        <Text style={styles.dateInputText}>
                                            {(() => {
                                                const { start } = getPresetDates(filterPreset);
                                                return `${start.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}`;
                                            })()}
                                        </Text>
                                        <Image
                                            source={require('../../assets/images/chevron_down_2.png')}
                                            style={{ width: 6, height: 12, }}
                                            resizeMode="contain"
                                        />
                                        <Text style={styles.dateInputText}>
                                            {(() => {
                                                const { end } = getPresetDates(filterPreset);
                                                return `${end.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}`;
                                            })()}
                                        </Text>
                                    </View>
                                    <Image source={require('../../assets/images/calendar_icon.png')} style={{
                                        width: 13, height: 15,
                                    }}/>
                                </View>
                            </View>
                            </ImageBackground>
                        )}
                    </ScrollView>

                    {/* Bottom buttons */}
                    <View style={styles.filterFooter}>
                        <TouchableOpacity style={styles.clearAllBtn} onPress={clearFilter}>
                            <ImageBackground source={require('../../assets/images/btn_7.png')} resizeMode={"stretch"} style={styles.filterFooterBtn}>
                                <Text style={styles.clearAllBtnText}>Clear All</Text>
                            </ImageBackground>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyBtn} onPress={applyFilter}>
                            <ImageBackground source={require('../../assets/images/btn_5.png')} resizeMode={"stretch"} style={styles.filterFooterBtn}>
                                <Text style={styles.applyBtnText}>Apply</Text>
                            </ImageBackground>
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
                                        // console.log('date', date);
                                        if (Platform.OS === 'android') {
                                            setShowStartPicker(false);
                                            applySelectedDate(date);
                                        }
                                    }}
                                    maximumDate={filterEndFinal || new Date()}
                                    textColor="#111827"
                                    themeVariant="light"
                                    style={{ alignSelf: 'center' }}
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
                                    style={{ alignSelf: 'center' }}
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
                        <TouchableOpacity onPress={() => setShowDetail(false)} style={styles.backButton}>
                            <Image
                                source={require('../../assets/images/back-button.png')}
                                style={{ width: 32, height: 32, }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        <Text style={styles.detailHeaderTitle}>{selectedErrand?.status}</Text>
                    </View>
                    <ScrollView
                        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {selectedErrand && (
                            <>
                                {selectedErrand.pal && (
                                    <View>
                                        <View style={styles.palCard}>
                                            <View style={styles.palCardAvatar}>
                                                {selectedErrand.pal.profileImageUrl ? (
                                                    <Image source={{ uri: selectedErrand.pal.profileImageUrl }} style={styles.palAvatarImage} />
                                                ) : (
                                                    <Text style={styles.palAvatarInitial}>{selectedErrand.pal.firstName.charAt(0)}</Text>
                                                )}
                                            </View>
                                            <View style={{ flex: 1, gap: 7 }}>
                                                <Text style={styles.palName}>{selectedErrand.pal.firstName} {selectedErrand.pal.lastName}</Text>
                                                <ImageBackground source={require('../../assets/images/input-bg-tiny.png')}
                                                                 style={{ width: 57, height: 20 }}
                                                                 resizeMode="stretch">
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 20, }}>
                                                        {/*<Text style={{ color: '#F59E0B', fontSize: 13 }}>★</Text>*/}
                                                        <Image
                                                            source={require('../../assets/images/star_icon.png')}
                                                            style={{ width: 10, height: 10, }}
                                                            resizeMode="contain"
                                                        />
                                                        <Text style={{ fontSize: 10, fontFamily: 'Nunito_600SemiBold', color: COLORS.header }}>
                                                            {palRating
                                                                ? `${Number(palRating.averageRating).toFixed(1)}`
                                                                // ? `${Number(palRating.averageRating).toFixed(1)} (${Number(palRating.totalReviews)} reviews)`
                                                                : '0'
                                                            }
                                                        </Text>
                                                    </View>
                                                </ImageBackground>
                                                {/*<Text style={styles.palLabel}>Your Pal</Text>*/}
                                            </View>
                                            {/*<View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedErrand.status] }]}>
                                                <Text style={styles.statusBadgeText}>{selectedErrand.status}</Text>
                                            </View>*/}
                                        </View>
                                        <View style={styles.statusBadge}>
                                            <Text style={styles.statusBadgeText}>{selectedErrand.status}:</Text>
                                            <Text style={styles.statusBadgeText}>{selectedErrand.completedAt}</Text>
                                        </View>
                                    </View>
                                )}

                                <Text style={styles.sectionTitle}>Errand Details</Text>
                                <View style={styles.detailCard}>
                                    <View style={styles.detailRow}>
                                        <Image style={styles.detailIcon} resizeMode="contain"
                                            source={require('../../assets/images/bullet_icon.png')}/>
                                        <Text style={styles.detailText}>{selectedErrand.title}</Text>
                                    </View>
                                    {selectedErrand.description ? (
                                        <View style={styles.detailRow}>
                                            <Image style={styles.detailIcon} resizeMode="contain"
                                                   source={require('../../assets/images/bullet_icon.png')}/>
                                            <Text style={styles.detailText}>{selectedErrand.description}</Text>
                                        </View>
                                    ) : null}
                                    <View style={styles.detailRow}>
                                        <Image style={styles.detailIcon} resizeMode="contain"
                                               source={require('../../assets/images/bullet_icon.png')}/>
                                        <Text style={styles.detailText}>{selectedErrand.address}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Image style={styles.detailIcon} resizeMode="contain"
                                               source={require('../../assets/images/bullet_icon.png')}/>
                                        <Text style={styles.detailText}>
                                            {formatDate(selectedErrand.createdAt)} at {formatTime(selectedErrand.createdAt)}
                                        </Text>
                                    </View>
                                    {selectedErrand.completedAt && (
                                        <View style={styles.detailRow}>
                                            <Image style={styles.detailIcon} resizeMode="contain"
                                                   source={require('../../assets/images/bullet_icon.png')}/>
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

            {/* PAL APPLICATIONS MODAL */}
            <Modal
                visible={showApplications}
                animationType="slide"
                onRequestClose={() => setShowApplications(false)}
            >
                <View style={{ flex: 1, backgroundColor: COLORS.background }}>
                    {/* Header */}
                    {/*<View style={{
                        paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
                        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
                        flexDirection: 'row', alignItems: 'center',
                    }}>*/}
                    <View style={styles.palAppHeader}>
                        <TouchableOpacity onPress={() => setShowApplications(false)} style={styles.backButton}>
                            <Image source={require('../../assets/images/back-button.png')}
                                   style={{ width: 32, height: 32 }} resizeMode="contain" />
                        </TouchableOpacity>
                        <View style={{ paddingLeft: 20 }}>
                            <Text style={styles.palAppTitle}>
                                Pal Applicants
                            </Text>
                            <Text style={styles.palAppSubtitle}>
                                {selectedPendingErrand?.title}
                            </Text>
                        </View>
                    </View>

                    {loadingApplications ? (
                        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
                    ) : applications.length === 0 ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                            <Image source={require('../../assets/images/no_errands.png')} style={{
                                width: Platform.OS === 'ios' ? 334 : 274, height: Platform.OS === 'ios' ? 334 : 274,
                            }}/>
                            <Text style={styles.emptyStateHeader}>No applications yet</Text>
                            <Text style={styles.emptyStateText}>Pals will appear here once they apply</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={applications}
                            keyExtractor={item => item.applicationId.toString()}
                            contentContainerStyle={{ padding: 16 }}
                            renderItem={({ item }) => (
                                <View style={[styles.errandCard, { borderRadius: 20 }]}>
                                    {/* Pal info row */}
                                    <View style={styles.errandCardMain}>
                                        <View style={{
                                            width: 48, height: 48, borderRadius: 24,
                                            backgroundColor: '#10B981', alignItems: 'center',
                                            justifyContent: 'center', overflow: 'hidden',
                                        }}>
                                            {item.profileImageUrl ? (
                                                <Image source={{ uri: item.profileImageUrl }}
                                                       style={{ width: 48, height: 48, borderRadius: 24 }} />
                                            ) : (
                                                <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: 'white' }}>
                                                    {item.firstName.charAt(0)}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#111827' }}>
                                                {item.firstName} {item.lastName}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Text style={{ color: '#F59E0B', fontSize: 13 }}>★</Text>
                                                <Text style={{ fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: '#374151' }}>
                                                    {item.totalReviews > 0
                                                        ? `${Number(item.averageRating).toFixed(1)} (${item.totalReviews} reviews)`
                                                        : 'No reviews yet'
                                                    }
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={{ fontSize: 11, fontFamily: 'Nunito_400Regular', color: '#9CA3AF' }}>
                                            {formatTimeAgo(item.appliedAt)}
                                        </Text>
                                        {item.palLatitude && item.palLongitude && selectedPendingErrand?.latitude && selectedPendingErrand?.longitude && (
                                            <Text style={styles.metaText}>
                                                📍 {calculateDistance(selectedPendingErrand?.latitude, selectedPendingErrand?.longitude, item.palLatitude, item.palLongitude)}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Message */}
                                    {item.message ? (
                                        <View style={{
                                            backgroundColor: '#F9FAFB', borderRadius: 8,
                                            padding: 10, marginBottom: 12,
                                        }}>
                                            <Text style={{ fontSize: 12, fontFamily: 'Nunito_500Medium', color: '#374151', lineHeight: 18 }}>
                                                "{item.message}"
                                            </Text>
                                        </View>
                                    ) : null}

                                    {/* Action buttons */}
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TouchableOpacity
                                            style={{
                                                flex: 1, borderWidth: 1, borderColor: '#2563EB',
                                                borderRadius: 12, paddingVertical: 10, alignItems: 'center',
                                            }}
                                            onPress={() => {
                                                // TODO: View pal profile detail
                                                Alert.alert('Coming Soon', 'Full pal profile view coming soon!');
                                            }}
                                        >
                                            <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: '#2563EB' }}>
                                                View Profile
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{
                                                flex: 1, backgroundColor: '#10B981',
                                                borderRadius: 12, paddingVertical: 10, alignItems: 'center',
                                            }}
                                            onPress={() => handleAcceptPalApplication(item.applicationId)}
                                            disabled={acceptingPal === item.applicationId}
                                        >
                                            {acceptingPal === item.applicationId ? (
                                                <ActivityIndicator color="white" size="small" />
                                            ) : (
                                                <Text style={{ fontSize: 13, fontFamily: 'Nunito_700Bold', color: 'white' }}>
                                                    Accept ✓
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    backButton: { padding: 10, width: 52 },

    header: {
        backgroundColor: COLORS.background, paddingTop: 56, paddingBottom: 16,
        paddingHorizontal: 20,
    },
    headerTitle: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', color: COLORS.header },

    tabsContainer: {
        backgroundColor: COLORS.background,
        // flexGrow: 0, height: 50
    },
    tabsContent: {
        paddingHorizontal: 16,
        gap: 8, alignItems: 'center',
    },
    tabsWrapper: {
        height: 40,
        backgroundColor: COLORS.background,
    },
    tab: {
        paddingHorizontal: 14, paddingVertical: 4,
        borderRadius: 10, backgroundColor: 'white', marginRight: 0,
        borderWidth: 1, borderColor: COLORS.primary, width: 100, height: 28,
        alignItems: 'center', justifyContent: 'center'
    },
    tabActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
    tabText: { fontSize: 10, fontFamily: 'Nunito_600SemiBold', color: COLORS.primary },
    tabTextActive: { color: 'white' },

    searchContainer: {
        // flex: 1, flexDirection: 'row', alignItems: 'center',
        // backgroundColor: '#F3F4F6', borderRadius: 12,
        // paddingHorizontal: 12, height: 40,

        paddingHorizontal: 20,
        paddingVertical: Platform.OS === 'ios' ? 4 : 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    searchIcon: { fontSize: 14, marginRight: 6 },
    searchInput: {
        flex: 1, fontSize: 12,
        color: COLORS.header, paddingVertical: 10, alignItems: 'center',
        marginLeft: Platform.OS === 'ios' ? 10 : 2
    },
    filterBtn: {
        paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'flex-start', alignSelf: 'flex-start'
    },
    filterBtnText: { fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: COLORS.black },

    resultsCount: {
        fontSize: 12, fontFamily: 'Nunito_500Medium',
        color: '#6B7280', paddingHorizontal: 16, paddingTop: 8,
    },

    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, },
    emptyStateHeader: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: COLORS.primary },
    emptyStateText: { fontSize: 12, textAlign: 'center', color: COLORS.black, lineHeight: 20 },

    errandCard: {
        backgroundColor: 'white', borderRadius: 50, marginBottom: 10,
        // elevation: 2, shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
        // overflow: 'hidden',
    },
    errandCardMain: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    },
    errandCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', },
    errandCardTitle: { fontSize: 12, color: COLORS.black },
    errandCardAddress: { fontSize: 10, color: COLORS.header },
    errandCardDate: { fontSize: 10, fontFamily: 'Nunito_400Regular', color: COLORS.header },
    errandCardRight: { alignItems: 'flex-end', gap: 8, flexDirection: 'row', },
    errandCardPrice: { fontSize: 12, fontFamily: 'Nunito_700Bold', color: COLORS.black },
  /*  errandCardMain: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
    },
    errandCardLeft: { flex: 1 },
    errandCardTitle: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#111827', marginBottom: 4 },
    errandCardAddress: { fontSize: 12, fontFamily: 'Nunito_500Medium', color: '#6B7280', marginBottom: 2 },
    errandCardDate: { fontSize: 11, fontFamily: 'Nunito_400Regular', color: '#9CA3AF' },
    errandCardRight: { alignItems: 'flex-end', gap: 8 },
    errandCardPrice: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#2563EB' },
*/
    cardActions: {
        flexDirection: 'row', margin: 10
        // borderTopWidth: 1,
        // borderTopColor: '#F3F4F6',
    },
    cardActionsBtn: {
        width: Platform.OS === 'ios' ? 138 : 118, height: Platform.OS === 'ios' ? 30 : 26, justifyContent: 'center', alignItems: 'center'
    },
    completeCardBtn: {
        flex: 1,
        // backgroundColor: '#10B981',
        // paddingVertical: 12,
        alignItems: 'center', justifyContent: 'center'
    },
    completeCardBtnText: {
        fontSize: 10, fontFamily: 'Nunito_600SemiBold', color: 'white'
    },
    viewDetailsBtn: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        // backgroundColor: '#2563EB',
        //paddingVertical: 12,

    },
    viewDetailsBtnText: {
        fontSize: 10, fontFamily: 'Nunito_600SemiBold', color: 'white'
    },

    statusBadge: { flexDirection: 'row', },
    statusBadgeText: { fontSize: 13, fontFamily: 'Nunito_400Regular', color: COLORS.black },

    // Filter modal
    filterContainer: { flex: 1, backgroundColor: COLORS.background },
    filterHeader: {
        // flexDirection: 'row',
        // alignItems: 'center', justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 0, paddingBottom: 16,
    },
    filterTitle: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', color: COLORS.header, marginLeft: 20  },
    filterFooterContainer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        // flexDirection: 'row', gap: 12, padding: 20,
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    },
    filterFooter: {
        // position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', gap: 12, padding: 20, paddingBottom: 40,
        // borderTopWidth: 1, borderTopColor: '#F3F4F6',
    },
    filterFooterBtn: {
        width: Platform.OS === 'ios' ? 180 : 150, height: Platform.OS === 'ios' ? 40 : 35, justifyContent: 'center', alignItems: 'center'
    },
    clearAllBtn: {
        flex: 1, alignItems: 'center',
    },
    clearAllBtnText: { fontSize: 10, fontFamily: 'Nunito_600SemiBold', color: COLORS.primary },
    applyBtn: {
        flex: 1, alignItems: 'center',
    },
    applyBtnText: { fontSize: 10, fontFamily: 'Nunito_600SemiBold', color: 'white' },

    presetChip: {
        paddingHorizontal: 14, paddingVertical: 4, width: 110, height: 28,
        borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary,
        backgroundColor: 'white', alignItems: 'center', justifyContent: 'center'
    },
    presetChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
    presetChipText: { fontSize: 10, fontFamily: 'Nunito_600SemiBold', color: COLORS.primary },
    presetChipTextActive: { color: 'white' },

    dateInput: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 4 : 2,
        marginBottom: 12, height: Platform.OS === 'ios' ? 57 : 50,
    },
    dateInputLabel: { fontSize: 8, color: COLORS.header },
    dateInputText: { fontSize: 12, color: COLORS.header },

    presetPreview: { flexDirection: 'row', justifyContent: "space-between", alignItems: 'flex-end',  marginTop: 10,
        /*backgroundColor: '#EFF6FF', borderRadius: 12,
        padding: 16,*/
    },
    presetPreviewText: {
        fontSize: 12, fontFamily: 'Nunito_600SemiBold',
        color: COLORS.black, textAlign: 'center',
    },

    // Detail modal
    detailContainer: { flex: 1, backgroundColor: COLORS.background },
    detailHeader: {
        paddingTop: Platform.OS === 'ios' ? 50 : 0
    },
    detailHeaderTitle: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', color: COLORS.header, marginLeft: 20 },

    palCard: {
        // backgroundColor: 'white', borderRadius: 16, padding: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
    },
    palCardAvatar: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: '#2563EB',
        borderWidth: 2, borderColor: COLORS.primary,
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    palAvatarImage: { width: 60, height: 60, borderRadius: 30 },
    palAvatarInitial: { fontSize: 20, fontFamily: 'Nunito_700Bold', color: 'white' },
    palName: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', color: COLORS.black },
    palLabel: { fontSize: 12, fontFamily: 'Nunito_500Medium', color: '#6B7280' },

    sectionTitle: {
        fontSize: 13, fontFamily: 'Nunito_700Bold', color: COLORS.black,
        letterSpacing: 0, textDecorationLine: 'underline', marginBottom: 8, marginTop: 20,
    },
    detailCard: {
        backgroundColor: 'white', borderRadius: 16, padding: 16,
        marginBottom: 16, gap: 10, elevation: 1,
    },
    detailRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    detailIcon: { width: 24, height: 24, },
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

    // Pal Application
    palAppHeader: {
        paddingTop: Platform.OS === 'ios' ? 50 : 0, paddingBottom: 16,
    },
    palAppTitle: { fontSize: 18, fontFamily: 'Nunito_800ExtraBold', color: COLORS.header  },
    palAppSubtitle: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: COLORS.secondary  },


    metaText: {
        fontSize: 10, fontFamily: 'Nunito_500Medium', color: '#6B7280',
    },
    applicantCard: {
        backgroundColor: '#F9FAFB', borderRadius: 12,
        padding: 12, marginBottom: 8,
    },
    applicantAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
    },
    applicantMessage: {
        backgroundColor: 'white', borderRadius: 8,
        padding: 8, marginBottom: 4,
    },
});