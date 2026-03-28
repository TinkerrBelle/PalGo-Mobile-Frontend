import {
    View, Text, TextInput, TouchableOpacity, ImageBackground,
    Image, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import API from '../../services/api';
import CustomButton from '../../components/CustomButton';

export default function VerifyPhone() {
    const { email, userId, phone } = useLocalSearchParams<{
        email: string;
        userId: string;
        phone: string;
    }>();

    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [countdown, setCountdown] = useState(60); // resend cooldown
    const [canResend, setCanResend] = useState(false);

    const inputRefs = [
        useRef<TextInput>(null),
        useRef<TextInput>(null),
        useRef<TextInput>(null),
        useRef<TextInput>(null),
        useRef<TextInput>(null),
        useRef<TextInput>(null),
    ];

    // Countdown timer for resend button
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    // Auto-send OTP when screen loads
    useEffect(() => {
        sendOtp();
    }, []);

    const sendOtp = async () => {
        try {
            await API.post('/Auth/send-phone-otp', { email });
        } catch (error: any) {
            console.log('OTP send error:', error.message);
        }
    };

    const handleCodeChange = (text: string, index: number) => {
        if (!/^\d*$/.test(text)) return;

        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        if (text && index < 5) {
            inputRefs[index + 1].current?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !code[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
        }
    };

    const handleVerify = async () => {
        if (loading) return;  // ADD — blocks while already verifying

        const fullCode = code.join('');

        if (fullCode.length !== 6) {
            Alert.alert('Error', 'Please enter the complete 6-digit code');
            return;
        }

        setLoading(true);
        try {
            await API.post('/Auth/verify-phone', {
                phoneNumber: phone,
                code: fullCode
            });

            setShowSuccessModal(true);
        } catch (error: any) {
            const message = error.response?.data?.message || 'Verification failed. Please try again.';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;

        setResending(true);
        try {
            await API.post('/Auth/send-phone-otp', { email });
            Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
            setCode(['', '', '', '']);
            setCountdown(60);
            setCanResend(false);
            inputRefs[0].current?.focus();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to resend code.';
            Alert.alert('Error', message);
        } finally {
            setResending(false);
        }
    };

    const handleContinue = () => {
        setShowSuccessModal(false);
        router.replace({
            pathname: '/auth/id-verification',
            params: { userId, email }
        });
    };

    // Mask phone number for display e.g. +234******497
    const maskedPhone = phone
        ? phone.slice(0, 4) + '******' + phone.slice(-3)
        : '';

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
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: 32 }}>
                            <Text style={{
                                fontSize: 28,
                                fontFamily: 'Nunito_700Bold',
                                color: '#111827',
                                textAlign: 'center',
                                marginBottom: 8,
                            }}>
                                Verify Phone
                            </Text>

                            <Text style={{
                                fontSize: 12,
                                fontFamily: 'Nunito_500Medium',
                                color: '#6B7280',
                                textAlign: 'center',
                                marginBottom: 32,
                            }}>
                                Please enter the 4-digit code sent to{' '}
                                <Text style={{ fontFamily: 'Nunito_700Bold', color: '#111827' }}>
                                    {maskedPhone}
                                </Text>
                            </Text>

                            {/* 6 circular digit inputs */}
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 10,
                                marginBottom: 32,
                            }}>
                                {code.map((digit, index) => (
                                    <ImageBackground
                                        key={index}
                                        source={require('../../assets/images/input-bg-circle.png')}
                                        imageStyle={{
                                            borderRadius: 28,
                                            borderWidth: 2,
                                            borderColor: activeIndex === index ? '#10B981' : 'transparent',
                                        }}
                                        style={{
                                            width: 50,
                                            height: 50,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <TextInput
                                            ref={inputRefs[index]}
                                            value={digit}
                                            onChangeText={(text) => handleCodeChange(text, index)}
                                            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                                            onFocus={() => setActiveIndex(index)}
                                            onBlur={() => setActiveIndex(null)}
                                            keyboardType="numeric"
                                            maxLength={1}
                                            editable={!loading}
                                            placeholderTextColor="#4C4C4C"
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                textAlign: 'center',
                                                fontSize: 20,
                                                fontWeight: 'bold',
                                                color: '#111827',
                                            }}
                                        />
                                    </ImageBackground>
                                ))}
                            </View>

                            <CustomButton
                                title="Verify"
                                onPress={handleVerify}
                                loading={loading}
                            />

                            {/* Resend with countdown */}
                            <TouchableOpacity
                                onPress={handleResend}
                                disabled={!canResend || resending}
                                style={{ marginTop: 24 }}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                                    <Text style={{
                                        fontSize: 12,
                                        fontFamily: 'Nunito_500Medium',
                                        color: '#6B7280',
                                    }}>
                                        Didn't receive a code?{' '}
                                    </Text>
                                    <Text style={{
                                        fontSize: 12,
                                        fontFamily: 'Nunito_700Bold',
                                        color: canResend ? '#2563EB' : '#9CA3AF',
                                    }}>
                                        {resending
                                            ? 'Sending...'
                                            : canResend
                                                ? 'Resend'
                                                : `Resend in ${countdown}s`}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ImageBackground>

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 32,
                }}>
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 40,
                        paddingHorizontal: 40,
                        paddingVertical: 65,
                        alignItems: 'center',
                        width: '90%',
                    }}>
                        <Image
                            source={require('../../assets/images/email-verified.png')}
                            resizeMode="contain"
                        />
                        <Text style={{
                            fontSize: 22,
                            fontFamily: 'Nunito_700Bold',
                            color: '#111827',
                            marginTop: 36,
                        }}>
                            Phone Verified!
                        </Text>
                        <Text style={{
                            fontSize: 12,
                            fontFamily: 'Nunito_500Medium',
                            color: '#6B7280',
                            textAlign: 'center',
                            marginTop: 8,
                        }}>
                            Your phone number has been verified successfully.
                        </Text>
                    </View>

                    <View style={{ width: '100%', marginTop: 34 }}>
                        <CustomButton
                            title="Continue"
                            onPress={handleContinue}
                            loading={loading}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}