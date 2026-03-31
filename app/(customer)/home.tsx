import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, Modal, TextInput, Alert,
    KeyboardAvoidingView, Platform, ActivityIndicator,
    Animated, Dimensions
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/context/AuthContext';
import API from '@/services/api';
import CustomButton from '@/components/CustomButton';
import CustomInput from '@/components/CustomInput';

const { height } = Dimensions.get('window');

const POPULAR_SERVICES = [
    'Get groceries', 'Wash my car', 'Do house chores',
    'Run errands', 'Food delivery', 'Laundry',
];

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
    pal?: {
        id: string;
        firstName: string;
        lastName: string;
        profileImageUrl?: string;
    };
}

export default function CustomerHome() {
    const { user } = useAuth();

    // Location
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [locationError, setLocationError] = useState(false);

    // Errands
    const [myErrands, setMyErrands] = useState<Errand[]>([]);
    const [activeErrand, setActiveErrand] = useState<Errand | null>(null);
    const [loadingErrands, setLoadingErrands] = useState(false);

    // Request form
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formLoading, setFormLoading] = useState(false);

    // Form fields
    const [errandTitle, setErrandTitle] = useState('');
    const [errandDetails, setErrandDetails] = useState('');
    const [errandAddress, setErrandAddress] = useState('');
    const [errandPrice, setErrandPrice] = useState('');
    const [errandCategory, setErrandCategory] = useState('');
    const [usingGPS, setUsingGPS] = useState(false);

    const mapRef = useRef<MapView>(null);
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        requestLocation();
        fetchMyErrands();
    }, []);

    useEffect(() => {
        // Find active errand (Pending, Matched or Active)
        const active = myErrands.find(e =>
            ['Pending', 'Matched', 'Active'].includes(e.status)
        );
        setActiveErrand(active || null);
    }, [myErrands]);

    const requestLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError(true);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
        } catch {
            setLocationError(true);
        }
    };

    const fetchMyErrands = async () => {
        setLoadingErrands(true);
        try {
            const response = await API.get('/Errand/my-errands');
            setMyErrands(response.data);
        } catch (error) {
            console.log('Error fetching errands:', error);
        } finally {
            setLoadingErrands(false);
        }
    };

    const handleUseGPS = async () => {
        setUsingGPS(true);
        try {
            const loc = await Location.getCurrentPositionAsync({});
            const geocode = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
            if (geocode[0]) {
                const addr = `${geocode[0].street || ''} ${geocode[0].city || ''} ${geocode[0].region || ''}`.trim();
                setErrandAddress(addr);
            }
        } catch {
            Alert.alert('Error', 'Could not get your location. Please type your address.');
        } finally {
            setUsingGPS(false);
        }
    };

    const handleSubmitErrand = async () => {
        if (!errandTitle.trim()) {
            Alert.alert('Error', 'Please enter an errand title');
            return;
        }
        if (!errandAddress.trim()) {
            Alert.alert('Error', 'Please enter a location');
            return;
        }
        if (!errandPrice.trim() || isNaN(Number(errandPrice))) {
            Alert.alert('Error', 'Please enter a valid price');
            return;
        }

        setFormLoading(true);
        try {
            // Geocode address to coordinates
            let lat = location?.coords.latitude || 6.5244;
            let lng = location?.coords.longitude || 3.3792;

            try {
                const geocoded = await Location.geocodeAsync(errandAddress);
                if (geocoded[0]) {
                    lat = geocoded[0].latitude;
                    lng = geocoded[0].longitude;
                }
            } catch {
                // Use current location coords if geocoding fails
            }

            await API.post('/Errand', {
                title: errandTitle,
                description: errandDetails,
                address: errandAddress,
                latitude: lat,
                longitude: lng,
                price: parseFloat(errandPrice),
                category: errandCategory,
            });

            setShowRequestForm(false);
            setShowSuccess(true);

            // Reset form
            setErrandTitle('');
            setErrandDetails('');
            setErrandAddress('');
            setErrandPrice('');
            setErrandCategory('');

            // Refresh errands
            fetchMyErrands();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to post errand. Please try again.';
            Alert.alert('Error', message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleAcceptPal = async () => {
        if (!activeErrand) return;
        try {
            await API.post(`/Errand/${activeErrand.id}/customer-accept`);
            fetchMyErrands();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to accept');
        }
    };

    const handleDeclinePal = async () => {
        if (!activeErrand) return;
        try {
            await API.post(`/Errand/${activeErrand.id}/customer-decline`);
            fetchMyErrands();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to decline');
        }
    };

    const handleCompleteErrand = async () => {
        if (!activeErrand) return;
        Alert.alert(
            'Mark as Completed',
            'Are you sure you want to mark this errand as completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete', onPress: async () => {
                        try {
                            await API.post(`/Errand/${activeErrand.id}/complete`);
                            fetchMyErrands();
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to complete');
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return '#F59E0B';
            case 'Matched': return '#3B82F6';
            case 'Active': return '#10B981';
            case 'Completed': return '#6B7280';
            default: return '#6B7280';
        }
    };

    const getStatusMessage = (status: string) => {
        switch (status) {
            case 'Pending': return '🔍 Looking for a Pal...';
            case 'Matched': return '🙋 A Pal wants to help! Review below.';
            case 'Active': return '🚀 Your Pal is on the way!';
            default: return '';
        }
    };

    const recentErrands = myErrands
        .filter(e => e.status === 'Completed')
        .slice(0, 5);

    return (
        <View style={styles.container}>
            {/* ── MAP ── */}
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
                {/* Customer location marker */}
                {location && (
                    <Marker
                        coordinate={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        }}
                        title="You are here"
                        pinColor="#2563EB"
                    />
                )}

                {/* Active errand location marker */}
                {activeErrand && activeErrand.latitude && activeErrand.longitude && (
                    <Marker
                        coordinate={{
                            latitude: activeErrand.latitude,
                            longitude: activeErrand.longitude,
                        }}
                        title={activeErrand.title}
                        pinColor="#10B981"
                    />
                )}

                {/* Line between customer and errand location when active */}
                {activeErrand?.status === 'Active' && location && activeErrand.latitude && (
                    <Polyline
                        coordinates={[
                            {
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude,
                            },
                            {
                                latitude: activeErrand.latitude,
                                longitude: activeErrand.longitude,
                            },
                        ]}
                        strokeColor="#2563EB"
                        strokeWidth={3}
                        lineDashPattern={[10, 5]}
                    />
                )}
            </MapView>

            {/* ── TOP BAR ── */}
            <View style={styles.topBar}>
                <View style={styles.greeting}>
                    <Text style={styles.greetingText}>
                        Hi, {user?.firstName} 👋
                    </Text>
                    <Text style={styles.greetingSubtext}>
                        What do you need help with?
                    </Text>
                </View>
            </View>

            {/* ── BOTTOM SLIDER ── */}
            <View style={styles.bottomSheet}>
                <View style={styles.bottomSheetHandle} />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                >
                    {!activeErrand ? (
                        // ── NO ACTIVE ERRAND — show request button ──
                        <>
                            <TouchableOpacity
                                style={styles.requestButton}
                                onPress={() => setShowRequestForm(true)}
                            >
                                <Text style={styles.requestButtonText}>
                                    + Request an Errand
                                </Text>
                            </TouchableOpacity>

                            {/* Popular Services */}
                            {myErrands.length > 0 && (
                                <>
                                    <Text style={styles.sectionTitle}>Popular Services</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                                    >
                                        {POPULAR_SERVICES.map(service => (
                                            <TouchableOpacity
                                                key={service}
                                                style={styles.serviceChip}
                                                onPress={() => {
                                                    setErrandCategory(service);
                                                    setErrandTitle(service);
                                                    setShowRequestForm(true);
                                                }}
                                            >
                                                <Text style={styles.serviceChipText}>{service}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </>
                            )}

                            {/* Recent Errands */}
                            {recentErrands.length > 0 && (
                                <>
                                    <Text style={styles.sectionTitle}>Recent Errands</Text>
                                    {recentErrands.map(errand => (
                                        <View key={errand.id} style={styles.recentErrandCard}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.recentErrandTitle}>{errand.title}</Text>
                                                <Text style={styles.recentErrandDate}>
                                                    {new Date(errand.createdAt).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <Text style={styles.recentErrandPrice}>
                                                ₦{errand.price.toLocaleString()}
                                            </Text>
                                            <Text style={styles.recentErrandArrow}>›</Text>
                                        </View>
                                    ))}
                                </>
                            )}
                        </>
                    ) : (
                        // ── ACTIVE ERRAND ──
                        <>
                            {/* Status banner */}
                            <View style={[styles.statusBanner, { borderLeftColor: getStatusColor(activeErrand.status) }]}>
                                <Text style={styles.statusBannerText}>
                                    {getStatusMessage(activeErrand.status)}
                                </Text>
                            </View>

                            {/* Errand card */}
                            <View style={styles.activeErrandCard}>
                                <Text style={styles.activeErrandTitle}>{activeErrand.title}</Text>
                                <Text style={styles.activeErrandDetail}>📍 {activeErrand.address}</Text>
                                <Text style={styles.activeErrandDetail}>💰 ₦{activeErrand.price.toLocaleString()}</Text>
                                {activeErrand.description ? (
                                    <Text style={styles.activeErrandDetail}>📝 {activeErrand.description}</Text>
                                ) : null}

                                {/* Status badge */}
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activeErrand.status) }]}>
                                    <Text style={styles.statusBadgeText}>{activeErrand.status}</Text>
                                </View>
                            </View>

                            {/* Matched — show pal info + accept/decline */}
                            {activeErrand.status === 'Matched' && activeErrand.pal && (
                                <View style={styles.palCard}>
                                    <Text style={styles.palCardTitle}>
                                        {activeErrand.pal.firstName} {activeErrand.pal.lastName} wants to help!
                                    </Text>
                                    <View style={styles.palActions}>
                                        <TouchableOpacity
                                            style={styles.declineBtn}
                                            onPress={handleDeclinePal}
                                        >
                                            <Text style={styles.declineBtnText}>Decline</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.acceptBtn}
                                            onPress={handleAcceptPal}
                                        >
                                            <Text style={styles.acceptBtnText}>Accept</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Active — show complete button */}
                            {activeErrand.status === 'Active' && (
                                <TouchableOpacity
                                    style={styles.completeBtn}
                                    onPress={handleCompleteErrand}
                                >
                                    <Text style={styles.completeBtnText}>✓ Mark as Completed</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </ScrollView>
            </View>

            {/* ── REQUEST ERRAND FORM MODAL ── */}
            <Modal
                visible={showRequestForm}
                animationType="slide"
                transparent
                onRequestClose={() => setShowRequestForm(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowRequestForm(false)}
                />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.formSheet}>
                        <View style={styles.bottomSheetHandle} />

                        <Text style={styles.formTitle}>Request an Errand</Text>
                        <Text style={styles.formSubtitle}>
                            Tell us what you need help with
                        </Text>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Errand Name */}
                            <Text style={styles.fieldLabel}>Errand Name</Text>
                            <CustomInput
                                placeholder="e.g. Wash my car, Get groceries"
                                value={errandTitle}
                                onChangeText={setErrandTitle}
                            />

                            {/* Category chips */}
                            <Text style={styles.fieldLabel}>Category (optional)</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8, marginBottom: 16 }}
                            >
                                {POPULAR_SERVICES.map(service => (
                                    <TouchableOpacity
                                        key={service}
                                        style={[
                                            styles.serviceChip,
                                            errandCategory === service && styles.serviceChipActive
                                        ]}
                                        onPress={() => setErrandCategory(
                                            errandCategory === service ? '' : service
                                        )}
                                    >
                                        <Text style={[
                                            styles.serviceChipText,
                                            errandCategory === service && styles.serviceChipTextActive
                                        ]}>
                                            {service}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Details */}
                            <Text style={styles.fieldLabel}>Additional Details (optional)</Text>
                            <View style={styles.textAreaWrapper}>
                                <TextInput
                                    placeholder="Describe what you need in more detail..."
                                    placeholderTextColor="#9CA3AF"
                                    value={errandDetails}
                                    onChangeText={setErrandDetails}
                                    multiline
                                    numberOfLines={3}
                                    style={styles.textArea}
                                />
                            </View>

                            {/* Location */}
                            <Text style={styles.fieldLabel}>Location</Text>
                            <CustomInput
                                placeholder="Enter your address"
                                value={errandAddress}
                                onChangeText={setErrandAddress}
                            />
                            <TouchableOpacity
                                style={styles.gpsButton}
                                onPress={handleUseGPS}
                                disabled={usingGPS}
                            >
                                {usingGPS ? (
                                    <ActivityIndicator color="#2563EB" size="small" />
                                ) : (
                                    <Text style={styles.gpsButtonText}>
                                        📍 Use my current location
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* Price */}
                            <Text style={styles.fieldLabel}>Offered Price (₦)</Text>
                            <CustomInput
                                placeholder="e.g. 5000"
                                value={errandPrice}
                                onChangeText={setErrandPrice}
                                keyboardType="numeric"
                            />

                            <CustomButton
                                title="Submit Request"
                                onPress={handleSubmitErrand}
                                loading={formLoading}
                            />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── SUCCESS MODAL ── */}
            <Modal
                visible={showSuccess}
                animationType="fade"
                transparent
            >
                <View style={styles.successOverlay}>
                    <View style={styles.successCard}>
                        <Text style={styles.successIcon}>✅</Text>
                        <Text style={styles.successTitle}>Successful!</Text>
                        <Text style={styles.successMessage}>
                            Your errand request has been posted. Check for updates in your notifications.
                        </Text>
                        <CustomButton
                            title="OK"
                            onPress={() => setShowSuccess(false)}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    topBar: {
        position: 'absolute',
        top: 56,
        left: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    greeting: {},
    greetingText: {
        fontSize: 16,
        fontFamily: 'Nunito_700Bold',
        color: '#111827',
    },
    greetingSubtext: {
        fontSize: 12,
        fontFamily: 'Nunito_400Regular',
        color: '#6B7280',
        marginTop: 2,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: height * 0.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    bottomSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    requestButton: {
        backgroundColor: '#2563EB',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    requestButtonText: {
        fontSize: 16,
        fontFamily: 'Nunito_700Bold',
        color: 'white',
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Nunito_700Bold',
        color: '#111827',
        marginBottom: 12,
    },
    serviceChip: {
        backgroundColor: '#EFF6FF',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    serviceChipActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    serviceChipText: {
        fontSize: 12,
        fontFamily: 'Nunito_600SemiBold',
        color: '#2563EB',
    },
    serviceChipTextActive: {
        color: 'white',
    },
    recentErrandCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
    },
    recentErrandTitle: {
        fontSize: 13,
        fontFamily: 'Nunito_600SemiBold',
        color: '#111827',
    },
    recentErrandDate: {
        fontSize: 11,
        fontFamily: 'Nunito_400Regular',
        color: '#6B7280',
        marginTop: 2,
    },
    recentErrandPrice: {
        fontSize: 13,
        fontFamily: 'Nunito_700Bold',
        color: '#111827',
        marginRight: 8,
    },
    recentErrandArrow: {
        fontSize: 18,
        color: '#9CA3AF',
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
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        gap: 6,
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
    palCard: {
        backgroundColor: '#EFF6FF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    palCardTitle: {
        fontSize: 14,
        fontFamily: 'Nunito_600SemiBold',
        color: '#1E40AF',
        marginBottom: 12,
        textAlign: 'center',
    },
    palActions: {
        flexDirection: 'row',
        gap: 12,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    formSheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: height * 0.85,
    },
    formTitle: {
        fontSize: 20,
        fontFamily: 'Nunito_700Bold',
        color: '#111827',
        marginBottom: 4,
    },
    formSubtitle: {
        fontSize: 12,
        fontFamily: 'Nunito_500Medium',
        color: '#6B7280',
        marginBottom: 20,
    },
    fieldLabel: {
        fontSize: 12,
        fontFamily: 'Nunito_600SemiBold',
        color: '#374151',
        marginBottom: 8,
    },
    textAreaWrapper: {
        backgroundColor: 'rgba(0,0,0,0.04)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
    },
    textArea: {
        fontSize: 12,
        fontFamily: 'Nunito_500Medium',
        color: '#111827',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    gpsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -8,
        marginBottom: 16,
        paddingVertical: 8,
    },
    gpsButtonText: {
        fontSize: 12,
        fontFamily: 'Nunito_600SemiBold',
        color: '#2563EB',
    },
    successOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    successCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        gap: 12,
    },
    successIcon: {
        fontSize: 56,
    },
    successTitle: {
        fontSize: 24,
        fontFamily: 'Nunito_700Bold',
        color: '#111827',
    },
    successMessage: {
        fontSize: 13,
        fontFamily: 'Nunito_500Medium',
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 8,
    },
});