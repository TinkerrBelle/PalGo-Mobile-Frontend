import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, Alert, Dimensions, PanResponder,
    Image, ImageBackground, ActivityIndicator
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/context/AuthContext';
import API from '@/services/api';

const { height } = Dimensions.get('window');

const SNAP_COLLAPSED = height * 0.18;
const SNAP_HALF = height * 0.45;
const SNAP_FULL = height * 0.82;

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
    customer?: {
        id: string;
        firstName: string;
        lastName: string;
        profileImageUrl?: string;
    };
}

export default function PalHome() {
    const { user, logout } = useAuth();

    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [availableErrands, setAvailableErrands] = useState<Errand[]>([]);
    const [myActiveErrand, setMyActiveErrand] = useState<Errand | null>(null);
    const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    const sheetHeight = useRef(SNAP_HALF);
    const [sheetHeightState, setSheetHeightState] = useState(SNAP_HALF);
    const dragStartY = useRef(0);
    const dragStartHeight = useRef(SNAP_HALF);

    const mapRef = useRef<MapView>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (_, gestureState) => {
                dragStartY.current = gestureState.y0;
                dragStartHeight.current = sheetHeight.current;
            },
            onPanResponderMove: (_, gestureState) => {
                const newHeight = dragStartHeight.current - gestureState.dy;
                const clamped = Math.max(SNAP_COLLAPSED, Math.min(SNAP_FULL, newHeight));
                sheetHeight.current = clamped;
                setSheetHeightState(clamped);
            },
            onPanResponderRelease: (_, gestureState) => {
                const velocity = gestureState.vy;
                let snapTo = SNAP_HALF;
                if (velocity < -0.5) snapTo = SNAP_FULL;
                else if (velocity > 0.5) snapTo = SNAP_COLLAPSED;
                else {
                    const distToCollapsed = Math.abs(sheetHeight.current - SNAP_COLLAPSED);
                    const distToHalf = Math.abs(sheetHeight.current - SNAP_HALF);
                    const distToFull = Math.abs(sheetHeight.current - SNAP_FULL);
                    const min = Math.min(distToCollapsed, distToHalf, distToFull);
                    if (min === distToCollapsed) snapTo = SNAP_COLLAPSED;
                    else if (min === distToHalf) snapTo = SNAP_HALF;
                    else snapTo = SNAP_FULL;
                }
                sheetHeight.current = snapTo;
                setSheetHeightState(snapTo);
            },
        })
    ).current;

    useEffect(() => {
        requestLocation();
        fetchData();

        // Poll every 10 seconds for new errands
        pollingRef.current = setInterval(() => {
            fetchData();
        }, 10000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const requestLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
        } catch { }
    };

    const fetchData = async () => {
        try {
            const [availableRes, palErrandsRes] = await Promise.all([
                API.get('/Errand/available'),
                API.get('/Errand/pal-errands'),
            ]);

            setAvailableErrands(availableRes.data);

            // Find if pal has an active/matched errand
            const active = palErrandsRes.data.find((e: Errand) =>
                ['Matched', 'Active'].includes(e.status)
            );
            setMyActiveErrand(active || null);
        } catch (error) {
            console.log('Error fetching errands:', error);
        }
    };

    const handleAcceptErrand = async (errand: Errand) => {
        setActionLoading(true);
        try {
            await API.post(`/Errand/${errand.id}/pal-accept`);
            Alert.alert(
                'Errand Accepted!',
                'Waiting for the customer to confirm. You\'ll be notified once they accept.'
            );
            setSelectedErrand(null);
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to accept errand');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeclineErrand = async (errand: Errand) => {
        setActionLoading(true);
        try {
            await API.post(`/Errand/${errand.id}/pal-decline`);
            setSelectedErrand(null);
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to decline errand');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCompleteErrand = async () => {
        if (!myActiveErrand) return;
        Alert.alert(
            'Mark as Completed',
            'Are you sure you want to mark this errand as completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete', onPress: async () => {
                        try {
                            await API.post(`/Errand/${myActiveErrand.id}/complete`);
                            fetchData();
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed');
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Matched': return '#3B82F6';
            case 'Active': return '#10B981';
            default: return '#6B7280';
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ago`;
    };

    return (
        <View style={styles.container}>
            {/* MAP */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                showsUserLocation
                showsMyLocationButton={false}
                initialRegion={{
                    latitude: location?.coords.latitude || 6.5244,
                    longitude: location?.coords.longitude || 3.3792,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                region={location ? {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                } : undefined}
            >
                {/* Show markers for available errands */}
                {availableErrands.map(errand => (
                    <Marker
                        key={errand.id}
                        coordinate={{ latitude: errand.latitude, longitude: errand.longitude }}
                        title={errand.title}
                        description={`₦${errand.price.toLocaleString()}`}
                        pinColor="#2563EB"
                        onPress={() => setSelectedErrand(errand)}
                    />
                ))}

                {/* Show active errand marker */}
                {myActiveErrand?.latitude && myActiveErrand?.longitude && (
                    <Marker
                        coordinate={{
                            latitude: myActiveErrand.latitude,
                            longitude: myActiveErrand.longitude,
                        }}
                        title={myActiveErrand.title}
                        pinColor="#10B981"
                    />
                )}

                {/* Route line to active errand */}
                {myActiveErrand?.status === 'Active' && location && myActiveErrand.latitude && (
                    <Polyline
                        coordinates={[
                            { latitude: location.coords.latitude, longitude: location.coords.longitude },
                            { latitude: myActiveErrand.latitude, longitude: myActiveErrand.longitude },
                        ]}
                        strokeColor="#2563EB"
                        strokeWidth={3}
                        lineDashPattern={[10, 5]}
                    />
                )}
            </MapView>

            {/* TOP BAR */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.profilePic}>
                    <ImageBackground
                        source={require('../../assets/images/profile-picture-holder.png')}
                        style={styles.ProfilePicBG}
                    >
                        <View style={styles.ProfileCircle}>
                            {user?.profileImageUrl ? (
                                <Image
                                    source={{ uri: user.profileImageUrl }}
                                    style={styles.profileImage}
                                />
                            ) : (
                                <View style={styles.profilePlaceholder}>
                                    <Text style={styles.profileInitial}>
                                        {user?.firstName?.charAt(0) || 'P'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </ImageBackground>
                </TouchableOpacity>

                {/* Online/Offline toggle */}
                <TouchableOpacity
                    style={[styles.onlineToggle, { backgroundColor: isOnline ? '#10B981' : '#6B7280' }]}
                    onPress={() => setIsOnline(!isOnline)}
                >
                    <View style={[styles.onlineDot, { backgroundColor: 'white' }]} />
                    <Text style={styles.onlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.notificationBtn}>
                    <Image
                        source={require('../../assets/images/notification-icon.png')}
                        style={styles.notificationIcon}
                    />
                </TouchableOpacity>
            </View>

            {/* BOTTOM SHEET */}
            <View style={[styles.bottomSheet, { height: sheetHeightState }]}>
                <View {...panResponder.panHandlers} style={styles.dragArea}>
                    <View style={styles.handle} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    scrollEnabled={sheetHeightState >= SNAP_HALF}
                >
                    {/* If pal has an active/matched errand, show that first */}
                    {myActiveErrand ? (
                        <>
                            <View style={[styles.statusBanner,
                                { borderLeftColor: getStatusColor(myActiveErrand.status) }]}>
                                <Text style={styles.statusBannerText}>
                                    {myActiveErrand.status === 'Matched' && '⏳ Waiting for customer to confirm...'}
                                    {myActiveErrand.status === 'Active' && '🚀 You\'re on an errand!'}
                                </Text>
                            </View>

                            <View style={styles.activeErrandCard}>
                                <Text style={styles.activeErrandTitle}>{myActiveErrand.title}</Text>
                                <Text style={styles.activeErrandDetail}>
                                    📍 {myActiveErrand.address}
                                </Text>
                                <Text style={styles.activeErrandDetail}>
                                    👤 {myActiveErrand.customer?.firstName} {myActiveErrand.customer?.lastName}
                                </Text>
                                <Text style={styles.activeErrandPrice}>
                                    ₦{myActiveErrand.price.toLocaleString()}
                                </Text>

                                <View style={[styles.statusBadge,
                                    { backgroundColor: getStatusColor(myActiveErrand.status) }]}>
                                    <Text style={styles.statusBadgeText}>{myActiveErrand.status}</Text>
                                </View>
                            </View>

                            {myActiveErrand.status === 'Active' && (
                                <TouchableOpacity
                                    style={styles.completeBtn}
                                    onPress={handleCompleteErrand}
                                >
                                    <Text style={styles.completeBtnText}>✓ Mark as Completed</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Available errands list */}
                            <Text style={styles.sectionTitle}>
                                {isOnline
                                    ? `${availableErrands.length} Errand${availableErrands.length !== 1 ? 's' : ''} Near You`
                                    : 'You are offline'}
                            </Text>

                            {!isOnline && (
                                <Text style={styles.offlineText}>
                                    Go online to see and accept errands.
                                </Text>
                            )}

                            {isOnline && availableErrands.length === 0 && (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateIcon}>🔍</Text>
                                    <Text style={styles.emptyStateText}>No errands available right now.</Text>
                                    <Text style={styles.emptyStateSubtext}>Check back soon!</Text>
                                </View>
                            )}

                            {isOnline && availableErrands.map(errand => (
                                <TouchableOpacity
                                    key={errand.id}
                                    style={[
                                        styles.errandCard,
                                        selectedErrand?.id === errand.id && styles.errandCardSelected
                                    ]}
                                    onPress={() => setSelectedErrand(
                                        selectedErrand?.id === errand.id ? null : errand
                                    )}
                                >
                                    <View style={styles.errandCardTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.errandCardTitle}>{errand.title}</Text>
                                            <Text style={styles.errandCardAddress} numberOfLines={1}>
                                                📍 {errand.address}
                                            </Text>
                                            <Text style={styles.errandCardTime}>
                                                🕐 {formatTimeAgo(errand.createdAt)}
                                            </Text>
                                        </View>
                                        <Text style={styles.errandCardPrice}>
                                            ₦{errand.price.toLocaleString()}
                                        </Text>
                                    </View>

                                    {/* Expanded details + actions */}
                                    {selectedErrand?.id === errand.id && (
                                        <View style={styles.errandCardExpanded}>
                                            {errand.description ? (
                                                <Text style={styles.errandCardDescription}>
                                                    {errand.description}
                                                </Text>
                                            ) : null}

                                            <Text style={styles.errandCardCustomer}>
                                                👤 {errand.customer?.firstName} {errand.customer?.lastName}
                                            </Text>

                                            <View style={styles.errandActions}>
                                                <TouchableOpacity
                                                    style={styles.declineBtn}
                                                    onPress={() => handleDeclineErrand(errand)}
                                                    disabled={actionLoading}
                                                >
                                                    {actionLoading ? (
                                                        <ActivityIndicator color="#EF4444" size="small" />
                                                    ) : (
                                                        <Text style={styles.declineBtnText}>Decline</Text>
                                                    )}
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.acceptBtn}
                                                    onPress={() => handleAcceptErrand(errand)}
                                                    disabled={actionLoading}
                                                >
                                                    {actionLoading ? (
                                                        <ActivityIndicator color="white" size="small" />
                                                    ) : (
                                                        <Text style={styles.acceptBtnText}>Accept ✓</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { ...StyleSheet.absoluteFillObject },

    topBar: {
        position: 'absolute',
        top: 56,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    profilePic: {
        width: 59,
        height: 59,
        borderRadius: 23,
        overflow: 'hidden',
        elevation: 4,
    },
    ProfilePicBG: {
        width: 59,
        height: 59,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ProfileCircle: {
        backgroundColor: '#FFFFFF',
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -6,
    },
    profileImage: { width: 28, height: 28, borderRadius: 14 },
    profilePlaceholder: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInitial: {
        fontSize: 14,
        fontFamily: 'Nunito_700Bold',
        color: 'white',
    },

    onlineToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        elevation: 4,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    onlineText: {
        fontSize: 13,
        fontFamily: 'Nunito_700Bold',
        color: 'white',
    },

    notificationBtn: {
        width: 59,
        height: 59,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
    },
    notificationIcon: { width: 59, height: 59 },

    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#EBF1FF',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    dragArea: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    handle: {
        width: 50,
        height: 4,
        backgroundColor: '#10B981',
        borderRadius: 2,
    },

    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Nunito_700Bold',
        color: '#111827',
        marginBottom: 12,
    },
    offlineText: {
        fontSize: 12,
        fontFamily: 'Nunito_500Medium',
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 20,
    },

    emptyState: {
        alignItems: 'center',
        paddingVertical: 32,
        gap: 8,
    },
    emptyStateIcon: { fontSize: 40 },
    emptyStateText: {
        fontSize: 14,
        fontFamily: 'Nunito_600SemiBold',
        color: '#374151',
    },
    emptyStateSubtext: {
        fontSize: 12,
        fontFamily: 'Nunito_500Medium',
        color: '#9CA3AF',
    },

    errandCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    errandCardSelected: {
        borderColor: '#2563EB',
        elevation: 4,
    },
    errandCardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    errandCardTitle: {
        fontSize: 14,
        fontFamily: 'Nunito_700Bold',
        color: '#111827',
        marginBottom: 4,
    },
    errandCardAddress: {
        fontSize: 11,
        fontFamily: 'Nunito_500Medium',
        color: '#6B7280',
        marginBottom: 2,
    },
    errandCardTime: {
        fontSize: 11,
        fontFamily: 'Nunito_400Regular',
        color: '#9CA3AF',
    },
    errandCardPrice: {
        fontSize: 16,
        fontFamily: 'Nunito_700Bold',
        color: '#2563EB',
        marginLeft: 12,
    },
    errandCardExpanded: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 8,
    },
    errandCardDescription: {
        fontSize: 12,
        fontFamily: 'Nunito_500Medium',
        color: '#374151',
        lineHeight: 18,
    },
    errandCardCustomer: {
        fontSize: 12,
        fontFamily: 'Nunito_600SemiBold',
        color: '#374151',
    },
    errandActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    declineBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#EF4444',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    declineBtnText: {
        fontSize: 14,
        fontFamily: 'Nunito_600SemiBold',
        color: '#EF4444',
    },
    acceptBtn: {
        flex: 1,
        backgroundColor: '#10B981',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    acceptBtnText: {
        fontSize: 14,
        fontFamily: 'Nunito_700Bold',
        color: 'white',
    },

    statusBanner: {
        borderLeftWidth: 4,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    statusBannerText: {
        fontSize: 13,
        fontFamily: 'Nunito_600SemiBold',
        color: '#374151',
    },
    activeErrandCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        gap: 6,
        elevation: 2,
    },
    activeErrandTitle: {
        fontSize: 15,
        fontFamily: 'Nunito_700Bold',
        color: '#111827',
        marginBottom: 4,
    },
    activeErrandDetail: {
        fontSize: 12,
        fontFamily: 'Nunito_500Medium',
        color: '#6B7280',
    },
    activeErrandPrice: {
        fontSize: 18,
        fontFamily: 'Nunito_700Bold',
        color: '#10B981',
        marginTop: 4,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginTop: 8,
    },
    statusBadgeText: {
        fontSize: 11,
        fontFamily: 'Nunito_700Bold',
        color: 'white',
    },
    completeBtn: {
        backgroundColor: '#10B981',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
    },
    completeBtnText: {
        fontSize: 15,
        fontFamily: 'Nunito_700Bold',
        color: 'white',
    },
});