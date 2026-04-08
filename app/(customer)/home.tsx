import {
    View, Text, ImageBackground, TouchableOpacity, StyleSheet,
    ScrollView, Modal, TextInput, Alert,
    KeyboardAvoidingView, Platform, ActivityIndicator,
    Dimensions, PanResponder, Image
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

const ERRAND_DURATIONS = [
    '30 mins', '1 hour', '2 hours', '3 hours', '4 hours', 'Half day', 'Full day'
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

// Sheet snap points as % of screen height from bottom
const SNAP_COLLAPSED = height * 0.18;  // just handle + button visible
const SNAP_HALF = height * 0.45;       // half screen
const SNAP_FULL = height * 0.82;       // almost full screen

export default function CustomerHome() {
    const { user } = useAuth();

    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [myErrands, setMyErrands] = useState<Errand[]>([]);
    const [activeErrand, setActiveErrand] = useState<Errand | null>(null);
    const [loadingErrands, setLoadingErrands] = useState(false);

    const [showRequestForm, setShowRequestForm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formLoading, setFormLoading] = useState(false);

    // Form fields
    const [errandTitle, setErrandTitle] = useState('');
    const [errandDetails, setErrandDetails] = useState('');
    const [errandAddress, setErrandAddress] = useState('');
    const [errandTime, setErrandTime] = useState('');           // Choose Time
    const [errandDuration, setErrandDuration] = useState('');   // Estimated Errand Time
    const [errandBudget, setErrandBudget] = useState('');       // Budget Range
    const [specialNotes, setSpecialNotes] = useState('');       // Special Notes
    const [errandCategory, setErrandCategory] = useState('');
    const [usingGPS, setUsingGPS] = useState(false);
    const [showDurationPicker, setShowDurationPicker] = useState(false);

    // Bottom sheet drag
    const sheetHeight = useRef(SNAP_HALF);
    const [sheetHeightState, setSheetHeightState] = useState(SNAP_HALF);
    const dragStartY = useRef(0);
    const dragStartHeight = useRef(SNAP_HALF);

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
                // Snap to nearest point
                const velocity = gestureState.vy;
                let snapTo = SNAP_HALF;

                if (velocity < -0.5) {
                    snapTo = SNAP_FULL;
                } else if (velocity > 0.5) {
                    snapTo = SNAP_COLLAPSED;
                } else {
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

    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        requestLocation();
        fetchMyErrands();
    }, []);

    useEffect(() => {
        const active = myErrands.find(e =>
            ['Pending', 'Matched', 'Active'].includes(e.status)
        );
        setActiveErrand(active || null);
    }, [myErrands]);

    const requestLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
        } catch { }
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
            Alert.alert('Error', 'Please enter an errand name');
            return;
        }
        if (!errandAddress.trim()) {
            Alert.alert('Error', 'Please enter a location');
            return;
        }
        if (!errandBudget.trim() || isNaN(Number(errandBudget))) {
            Alert.alert('Error', 'Please enter a valid budget');
            return;
        }

        setFormLoading(true);
        try {
            let lat = location?.coords.latitude || 6.5244;
            let lng = location?.coords.longitude || 3.3792;

            try {
                const geocoded = await Location.geocodeAsync(errandAddress);
                if (geocoded[0]) {
                    lat = geocoded[0].latitude;
                    lng = geocoded[0].longitude;
                }
            } catch { }

            // Combine all details into description
            const fullDescription = [
                errandDetails,
                errandTime ? `Preferred Time: ${errandTime}` : '',
                errandDuration ? `Estimated Duration: ${errandDuration}` : '',
                specialNotes ? `Special Notes: ${specialNotes}` : '',
            ].filter(Boolean).join('\n');

            await API.post('/Errand', {
                title: errandTitle,
                description: fullDescription,
                address: errandAddress,
                latitude: lat,
                longitude: lng,
                price: parseFloat(errandBudget),
                category: errandCategory,
            });

            setShowRequestForm(false);
            setShowSuccess(true);

            // Reset form
            setErrandTitle('');
            setErrandDetails('');
            setErrandAddress('');
            setErrandTime('');
            setErrandDuration('');
            setErrandBudget('');
            setSpecialNotes('');
            setErrandCategory('');

            fetchMyErrands();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to post errand.';
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
                            Alert.alert('Error', error.response?.data?.message || 'Failed');
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
            default: return '#6B7280';
        }
    };

    const recentErrands = myErrands
        .filter(e => e.status === 'Completed')
        .slice(0, 5);

    return (
        <View style={styles.container}>
            {/* ── MAP (fullscreen) ── */}
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
                {location && (
                    <Marker
                        coordinate={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        }}
                        title="You"
                        pinColor="#2563EB"
                    />
                )}

                {activeErrand?.latitude && activeErrand?.longitude && (
                    <Marker
                        coordinate={{
                            latitude: activeErrand.latitude,
                            longitude: activeErrand.longitude,
                        }}
                        title={activeErrand.title}
                        pinColor="#10B981"
                    />
                )}

                {activeErrand?.status === 'Active' && location && activeErrand.latitude && (
                    <Polyline
                        coordinates={[
                            { latitude: location.coords.latitude, longitude: location.coords.longitude },
                            { latitude: activeErrand.latitude, longitude: activeErrand.longitude },
                        ]}
                        strokeColor="#2563EB"
                        strokeWidth={3}
                        lineDashPattern={[10, 5]}
                    />
                )}
            </MapView>

            {/* ── TOP BAR — profile pic left, notification right ── */}
            <View style={styles.topBar}>
                {/* Profile picture */}
                <TouchableOpacity style={styles.profilePic}>

                <ImageBackground source={require('../../assets/images/profile-picture-holder.png')}
                    style={styles.ProfilePicBG}>
                    <View style={styles.ProfileCircle}>
                        {user?.profileImageUrl ? (
                            <Image
                                source={{ uri: user.profileImageUrl }}
                                style={styles.profileImage}
                            />
                        ) : (
                            <View style={styles.profilePlaceholder}>
                                <Text style={styles.profileInitial}>
                                    {user?.firstName?.charAt(0) || 'U'}
                                </Text>
                            </View>
                        )}
                    </View>
                </ImageBackground>
                </TouchableOpacity>

                {/* Notification button */}
                <TouchableOpacity style={styles.notificationBtn}>
                    <Image source={require('../../assets/images/notification-icon.png')} style={styles.notificationIcon} />
                </TouchableOpacity>
            </View>

            {/* ── DRAGGABLE BOTTOM SHEET ── */}
            <View style={[styles.bottomSheet, { height: sheetHeightState }]}>
                {/* Drag handle */}
                <View
                    {...panResponder.panHandlers}
                    style={styles.dragArea}
                >
                    <View style={styles.handle} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    scrollEnabled={sheetHeightState >= SNAP_HALF}
                >
                    {!activeErrand ? (
                        <>
                            {/* Request button */}
                            <TouchableOpacity
                                style={styles.requestButton}
                                onPress={() => setShowRequestForm(true)}
                            >
                                <Text style={styles.requestButtonText}>+ Request an Errand</Text>
                            </TouchableOpacity>

                            {/* Popular Services — only show if user has previous errands */}
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
                        <>
                            {/* Active errand card */}
                            <View style={[styles.statusBanner,
                                { borderLeftColor: getStatusColor(activeErrand.status) }]}>
                                <Text style={styles.statusBannerText}>
                                    {activeErrand.status === 'Pending' && '🔍 Looking for a Pal...'}
                                    {activeErrand.status === 'Matched' && '🙋 A Pal wants to help!'}
                                    {activeErrand.status === 'Active' && '🚀 Your Pal is on the way!'}
                                </Text>
                            </View>

                            <View style={styles.activeErrandCard}>
                                <Text style={styles.activeErrandTitle}>{activeErrand.title}</Text>
                                <View style={styles.activeErrandRowDetail}>
                                    <Image source={require('../../assets/images/location-icon.png')} />
                                    <Text style={styles.activeErrandDetail}>{activeErrand.address}</Text>
                                </View>
                                <View style={styles.activeErrandRowDetail}>
                                    <Image source={require('../../assets/images/cash-icon.png')} />
                                    <Text style={styles.activeErrandDetail}>
                                         ₦{activeErrand.price.toLocaleString()}
                                    </Text>
                                </View>


                                <View style={[styles.statusBadge,
                                    { backgroundColor: getStatusColor(activeErrand.status) }]}>
                                    <Text style={styles.statusBadgeText}>{activeErrand.status}</Text>
                                </View>
                            </View>

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

            {/* ── REQUEST FORM MODAL ── */}
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
                        <View style={styles.handle} />

                        <Text style={styles.formTitle}>Request an Errand</Text>
                        <Text style={styles.formSubtitle}>Tell us what you need help with</Text>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: 40 }}
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

                            {/* Add Details */}
                            <Text style={styles.fieldLabel}>Add Details</Text>
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

                            {/* Choose Time */}
                            <Text style={styles.fieldLabel}>Choose Time</Text>
                            <CustomInput
                                placeholder="e.g. 10:00 AM, Anytime today"
                                value={errandTime}
                                onChangeText={setErrandTime}
                            />

                            {/* Estimated Errand Time */}
                            <Text style={styles.fieldLabel}>Estimated Errand Time</Text>
                            <TouchableOpacity
                                onPress={() => setShowDurationPicker(true)}
                                style={{ marginBottom: 16 }}
                            >
                                <View style={{
                                    backgroundColor: 'rgba(0,0,0,0.04)',
                                    borderRadius: 28,
                                    paddingHorizontal: 20,
                                    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        fontSize: 12,
                                        fontFamily: 'Nunito_500Medium',
                                        color: errandDuration ? '#111827' : '#9CA3AF',
                                    }}>
                                        {errandDuration || 'Select estimated duration'}
                                    </Text>
                                    <Text style={{ color: '#9CA3AF' }}>›</Text>
                                </View>
                            </TouchableOpacity>

                            {/* Budget Range */}
                            <Text style={styles.fieldLabel}>Enter Budget Range (₦)</Text>
                            <CustomInput
                                placeholder="e.g. 5000"
                                value={errandBudget}
                                onChangeText={setErrandBudget}
                                keyboardType="numeric"
                            />

                            {/* Special Notes */}
                            <Text style={styles.fieldLabel}>Special Notes</Text>
                            <View style={styles.textAreaWrapper}>
                                <TextInput
                                    placeholder="Any special instructions for the Pal..."
                                    placeholderTextColor="#9CA3AF"
                                    value={specialNotes}
                                    onChangeText={setSpecialNotes}
                                    multiline
                                    numberOfLines={3}
                                    style={styles.textArea}
                                />
                            </View>

                            <CustomButton
                                title="Submit Request"
                                onPress={handleSubmitErrand}
                                loading={formLoading}
                            />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── DURATION PICKER MODAL ── */}
            <Modal
                visible={showDurationPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDurationPicker(false)}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
                    activeOpacity={1}
                    onPress={() => setShowDurationPicker(false)}
                />
                <View style={{
                    backgroundColor: 'white',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    paddingBottom: 40,
                }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F3F4F6',
                    }}>
                        <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#111827' }}>
                            Estimated Duration
                        </Text>
                        <TouchableOpacity onPress={() => setShowDurationPicker(false)}>
                            <Text style={{ fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: '#2563EB' }}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {ERRAND_DURATIONS.map(duration => (
                        <TouchableOpacity
                            key={duration}
                            onPress={() => {
                                setErrandDuration(duration);
                                setShowDurationPicker(false);
                            }}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 24,
                                paddingVertical: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: '#F9FAFB',
                            }}
                        >
                            <Text style={{
                                fontSize: 14,
                                fontFamily: errandDuration === duration ? 'Nunito_700Bold' : 'Nunito_500Medium',
                                color: errandDuration === duration ? '#2563EB' : '#374151',
                            }}>
                                {duration}
                            </Text>
                            {errandDuration === duration && (
                                <Text style={{ color: '#2563EB' }}>✓</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
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
    container: { flex: 1 },
    map: { ...StyleSheet.absoluteFillObject },

    // Top bar
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
        shadowColor: '#ffffff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
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
    profileImage: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    profilePlaceholder: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInitial: {
        fontSize: 14,
        fontFamily: 'Nunito_700Bold',
        color: 'white',
    },
    notificationBtn: {
        width: 59,
        height: 59,
        borderRadius: 23,
        //backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    notificationIcon: {
        width: 59,
        height: 59,
    },

    // Bottom sheet
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

    // Request button
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

    // Section
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Nunito_700Bold',
        color: '#111827',
        marginBottom: 12,
    },

    // Service chips
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
    serviceChipTextActive: { color: 'white' },

    // Recent errands
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
    recentErrandArrow: { fontSize: 18, color: '#9CA3AF' },

    // Active errand
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
    activeErrandRowDetail: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
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

    // Pal card
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
    palActions: { flexDirection: 'row', gap: 12 },
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

    // Form modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    formSheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: height * 0.90,
    },
    formTitle: {
        fontSize: 20,
        fontFamily: 'Nunito_700Bold',
        color: '#111827',
        marginBottom: 4,
        marginTop: 8,
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

    // Success modal
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
    successIcon: { fontSize: 56 },
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