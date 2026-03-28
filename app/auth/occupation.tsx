import {
    View, Text, TouchableOpacity, ImageBackground, Image,
    ScrollView, Alert, Platform, KeyboardAvoidingView, TextInput
} from "react-native";
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import API from '../../services/api';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

// Add this constant at the top with SERVICE_OPTIONS:
const MAX_SERVICES = 6;
const SERVICE_OPTIONS = [
    'Errands', 'Deliveries', 'Car wash', 'Plumbing', 'Electrician',
    'House chores', 'Mechanic', 'Chef', 'Nanny', 'Security',
    'Hairstylist', 'Barber', 'Tailor',
];

export default function Occupation() {
    const { userId, email } = useLocalSearchParams<{ userId: string; email: string }>();

    const [occupation, setOccupation] = useState('');
    const [yearsOfExperience, setYearsOfExperience] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [otherServices, setOtherServices] = useState('');
    const [aboutMe, setAboutMe] = useState('');
    const [loading, setLoading] = useState(false);

    const toggleService = (service: string) => {
        setSelectedServices(prev =>
            prev.includes(service)
                ? prev.filter(s => s !== service)
                : [...prev, service]
        );
    };

    const removeService = (service: string) => {
        setSelectedServices(prev => prev.filter(s => s !== service));
    };

    const handleNext = async () => {
        if (!occupation.trim()) {
            Alert.alert('Error', 'Please enter your occupation/skillset');
            return;
        }
        if (!yearsOfExperience.trim()) {
            Alert.alert('Error', 'Please enter your years of experience');
            return;
        }
        if (selectedServices.length === 0) {
            Alert.alert('Error', 'Please select at least one preferred service');
            return;
        }
        if (!aboutMe.trim()) {
            Alert.alert('Error', 'Please tell us about yourself');
            return;
        }

        setLoading(true);
        try {
            await API.post('/Auth/update-occupation', {
                userId,
                occupation,
                yearsOfExperience,
                preferredServices: selectedServices.join(','),
                otherServices,
                aboutMe,
            });

            router.replace('/auth/pending-approval');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to save. Please try again.';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <ImageBackground
                source={require('../../assets/images/bckg_1.png')}
                style={{ flex: 1 }}
            >
                <Image
                    source={require('../../assets/images/bckg_drip_C.png')}
                    resizeMode="contain"
                />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={{
                            paddingHorizontal: 32,
                            paddingTop: 16,
                            paddingBottom: 80,
                        }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={{
                            fontSize: 28,
                            fontFamily: 'Nunito_700Bold',
                            color: '#111827',
                            marginBottom: 4,
                        }}>
                            Occupation & Experience
                        </Text>
                        <Text style={{
                            fontSize: 12,
                            fontFamily: 'Nunito_500Medium',
                            color: '#4C4C4C',
                            marginBottom: 24,
                            textAlign: 'center'
                        }}>
                            Create a new account to get started and enjoy seamless access to our features.
                        </Text>

                        {/* ── OCCUPATION ── */}
                        <Text style={{
                            fontSize: 12,
                            fontFamily: 'Nunito_600SemiBold',
                            color: '#374151',
                            marginBottom: 8,
                        }}>
                            Occupation/Skillset (enter as much skillset as you have)
                        </Text>
                        <CustomInput
                            placeholder="e.g. Errands, shopper, driver, delivery"
                            value={occupation}
                            onChangeText={setOccupation}
                            editable={!loading}
                        />

                        {/* ── YEARS OF EXPERIENCE ── */}
                        <Text style={{
                            fontSize: 12,
                            fontFamily: 'Nunito_600SemiBold',
                            color: '#374151',
                            marginBottom: 8,
                            marginTop: 8,
                        }}>
                            Years of Experience
                        </Text>
                        <CustomInput
                            placeholder="e.g. 2years, 1year - 4years"
                            value={yearsOfExperience}
                            onChangeText={setYearsOfExperience}
                            editable={!loading}
                        />

                        {/* ── PREFERRED SERVICE TYPE ── */}
                        <Text style={{
                            fontSize: 12,
                            fontFamily: 'Nunito_600SemiBold',
                            color: '#374151',
                            marginBottom: 8,
                            marginTop: 8,
                        }}>
                            Preferred Service Type (select all preferred services)
                        </Text>

                        {/* Dropdown trigger — shows selected chips + chevron */}
                        <TouchableOpacity
                            onPress={() => setShowServiceDropdown(!showServiceDropdown)}
                            disabled={loading}
                            activeOpacity={0.8}
                            style={{ marginBottom: 8 }}
                        >
                            <ImageBackground
                                source={
                                    selectedServices.length > 3
                                        ? require('../../assets/images/input-bg-tall.png')  // taller image when wrapping
                                        : require('../../assets/images/input-bg.png')        // normal image
                                }
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: Platform.OS === 'ios' ? 9 : 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: 6,
                                    minHeight: selectedServices.length > 3 ? 80 : 44,
                                }}
                                imageStyle={{ borderRadius: 28 }}
                            >
                                {selectedServices.length === 0 ? (
                                    <Text style={{
                                        fontSize: 12,
                                        fontFamily: 'Nunito_500Medium',
                                        color: '#4C4C4C',
                                        flex: 1,
                                        paddingHorizontal: 12,
                                        paddingVertical: 2
                                    }}>
                                        Select Preferred Services
                                    </Text>
                                ) : (
                                    selectedServices.map(service => (
                                        <View
                                            key={service}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: 'rgba(37,99,235,0.12)',
                                                borderRadius: 20,
                                                paddingHorizontal: 10,
                                                paddingVertical: 4,
                                                gap: 4,
                                            }}
                                        >
                                            <Text style={{
                                                fontSize: 11,
                                                fontFamily: 'Nunito_600SemiBold',
                                                color: '#2563EB',
                                            }}>
                                                {service}
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => removeService(service)}
                                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                                            >
                                                <Text style={{ fontSize: 12, color: '#2563EB', lineHeight: 16 }}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                )}

                                {/* Chevron — always on the right */}
                                <View style={{ marginLeft: 'auto', paddingRight: 8 }}>
                                    <Image
                                        source={require('../../assets/images/chevron_down.png')}
                                        style={{
                                            width: 16,
                                            height: 16,
                                            transform: [{ rotate: showServiceDropdown ? '180deg' : '0deg' }],
                                        }}
                                        resizeMode="contain"
                                    />
                                </View>
                            </ImageBackground>
                        </TouchableOpacity>


                        {/* Dropdown list */}
                        {showServiceDropdown && (
                            <ImageBackground
                                source={require('../../assets/images/input-bg-select.png')}
                                style={{ marginBottom: 8, paddingVertical: 8 }}
                                imageStyle={{ borderRadius: 20 }}
                            >
                                {/* Max selection hint */}
                                <Text style={{
                                    fontSize: 11,
                                    fontFamily: 'Nunito_500Medium',
                                    color: selectedServices.length >= MAX_SERVICES ? '#EF4444' : '#6B7280',
                                    paddingHorizontal: 20,
                                    paddingBottom: 8,
                                    paddingTop: 4,
                                }}>
                                    {selectedServices.length >= MAX_SERVICES
                                        ? `Maximum ${MAX_SERVICES} services selected`
                                        : `Select up to ${MAX_SERVICES} (${selectedServices.length}/${MAX_SERVICES} selected)`
                                    }
                                </Text>

                                {SERVICE_OPTIONS.map(service => {
                                    const isSelected = selectedServices.includes(service);
                                    const isDisabled = !isSelected && selectedServices.length >= MAX_SERVICES;

                                    return (
                                        <TouchableOpacity
                                            key={service}
                                            onPress={() => {
                                                if (!isDisabled) toggleService(service);
                                            }}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                paddingHorizontal: 20,
                                                paddingVertical: 12,
                                                opacity: isDisabled ? 0.4 : 1,  // grey out unavailable options
                                            }}
                                        >
                                            <Text style={{
                                                fontSize: 13,
                                                fontFamily: isSelected ? 'Nunito_700Bold' : 'Nunito_500Medium',
                                                color: isSelected ? '#2563EB' : '#374151',
                                            }}>
                                                {service}
                                            </Text>
                                            {isSelected && (
                                                <Text style={{ color: '#2563EB', fontSize: 14 }}>✓</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ImageBackground>
                        )}

                        {/* ── OTHER PREFERRED SERVICES ── */}
                        <Text style={{
                            fontSize: 12,
                            fontFamily: 'Nunito_600SemiBold',
                            color: '#374151',
                            marginBottom: 8,
                            marginTop: 26,
                        }}>
                            Other Preferred Services (optional)
                        </Text>
                        <CustomInput
                            placeholder="e.g. Carpenter, Bricklayer"
                            value={otherServices}
                            onChangeText={setOtherServices}
                            editable={!loading}
                        />

                        {/* ── ABOUT ME ── */}
                        <Text style={{
                            fontSize: 12,
                            fontFamily: 'Nunito_600SemiBold',
                            color: '#374151',
                            marginBottom: 8,
                            marginTop: 8,
                        }}>
                            About Me
                        </Text>
                        <ImageBackground
                            source={require('../../assets/images/input-bg-editor.png')}
                            style={{ marginBottom: 4 }}
                            imageStyle={{ borderRadius: 20 }}
                        >
                            <TextInput
                                placeholder="Tell customers about yourself..."
                                placeholderTextColor="#9C9C9C"
                                value={aboutMe}
                                onChangeText={(text) => {
                                    if (text.length <= 1000) setAboutMe(text);
                                }}
                                multiline
                                numberOfLines={5}
                                maxLength={1000}
                                editable={!loading}
                                style={{
                                    fontSize: 12,
                                    fontFamily: 'Nunito_500Medium',
                                    color: '#111827',
                                    paddingHorizontal: 20,
                                    paddingVertical: 14,
                                    minHeight: 109,
                                    textAlignVertical: 'top',
                                }}
                            />
                        </ImageBackground>

                        {/* Character counter */}
                        <Text style={{
                            textAlign: 'right',
                            fontSize: 11,
                            fontFamily: 'Nunito_400Regular',
                            color: '#6B7280',
                            marginBottom: 24,
                        }}>
                            {aboutMe.length}/1000
                        </Text>

                        <CustomButton
                            title="Next"
                            onPress={handleNext}
                            loading={loading}
                        />
                    </ScrollView>
                </KeyboardAvoidingView>
            </ImageBackground>
        </View>
    );
}