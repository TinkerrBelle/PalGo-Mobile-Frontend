import {
    View, Text, TextInput, TouchableOpacity, ImageBackground, Image, Alert, Modal, ScrollView, KeyboardAvoidingView,
    Platform
} from "react-native";
import { useState, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import API from '../../services/api';
import CustomButton from '../../components/CustomButton';

export default function VerifyEmail() {
    // const { email } = useLocalSearchParams<{ email: string }>();
    const { email, userId, nextScreen, phone } = useLocalSearchParams<{
        email: string;
        userId: string;
        nextScreen?: string;
        phone?: string;
    }>();
    const [code, setCode] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false); // ADD THIS

    const inputRefs = [
        useRef<TextInput>(null),
        useRef<TextInput>(null),
        useRef<TextInput>(null),
        useRef<TextInput>(null),
    ];

    const handleCodeChange = (text: string, index: number) => {
        if (!/^\d*$/.test(text)) return;

        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        if (text && index < 3) {
            inputRefs[index + 1].current?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !code[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
        }
    };

    const handleVerify = async () => {
        const fullCode = code.join('');

        if (fullCode.length !== 4) {
            Alert.alert('Error', 'Please enter the complete 4-digit code');
            return;
        }

        setLoading(true);
        try {
            await API.post('/Auth/verify-email', {
                email: email,
                code: fullCode
            });

            setShowSuccessModal(true); // SHOW MODAL instead of Alert
        } catch (error: any) {
            const message = error.response?.data?.message || 'Verification failed. Please try again.';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await API.post('/Auth/resend-code', { email });
            Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
            setCode(['', '', '', '']);
            inputRefs[0].current?.focus();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to resend code.';
            Alert.alert('Error', message);
        } finally {
            setResending(false);
        }
    };

    const handleLogin = () => {
        setShowSuccessModal(false);

        if (nextScreen === 'verify-phone') {
            // Pal flow — go to phone verification
            router.replace({
                pathname: '/auth/verify-phone',
                params: { email, userId, phone }
            });
        } else {
            router.replace('/auth/login');
        }
    };

    return (
        <View className="flex-1">
            <ImageBackground
                source={require('../../assets/images/bckg_1.png')}
                className="flex-1"
            >
                <Image
                    source={require('../../assets/images/bckg_drip_C.png')}
                    resizeMode="contain"
                />
                {/* ADD KeyboardAvoidingView wrapping the ScrollView */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        // contentContainerStyle={{
                        //     paddingHorizontal: 32,
                        //     paddingTop: 16,
                        //     paddingBottom: 80,   // plenty of space at bottom
                        // }}
                        showsVerticalScrollIndicator={false}
                    >
                        <View className="flex-1 px-8 pt-8">
                            <Text className="text-3xl font-nunito-bold text-black mb-2 text-center">
                                Verify Email
                            </Text>

                            <Text className="text-accent-100 text-center text-xs font-nunito-medium pb-8">
                                Please check your inbox & enter the verification code we just sent to{' '}
                                <Text className="font-nunito-bold text-black">{email}</Text>
                            </Text>

                            {/* 4 circular digit inputs */}
                            <View className="flex-row justify-center gap-4 mb-8">
                                {code.map((digit, index) => (
                                    <ImageBackground
                                        key={index}
                                        source={require('../../assets/images/input-bg-circle.png')}
                                        imageStyle={{
                                            borderRadius: 32,
                                            borderWidth: 2,
                                            borderColor: activeIndex === index ? '#10B981' : 'transparent',
                                        }}
                                        style={{
                                            width: 64,
                                            height: 64,
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
                                                fontSize: 24,
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

                            <TouchableOpacity
                                onPress={handleResend}
                                disabled={resending || loading}
                                className="mt-6"
                            >
                                <View className="flex-row justify-center">
                                    <Text className="text-center text-accent-100 text-xs font-nunito-medium">
                                        Didn't receive a code?{' '}
                                    </Text>
                                    <Text className="text-primary text-xs font-nunito-bold">
                                        {resending ? 'Sending...' : 'Resend'}
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
                {/* Dark overlay behind the modal */}
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 32,
                }}>

                    {/* White box */}
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 40,
                        paddingHorizontal: 40,
                        paddingVertical: 65,
                        alignItems: 'center',
                        width: '90%',
                    }}>
                        {/* Verified image */}
                        <Image
                            source={require('../../assets/images/email-verified.png')}
                            resizeMode="contain"
                        />

                        {/* Email Verified text */}
                        <Text style={{
                            fontSize: 22,
                            fontWeight: '700',
                            color: '#111827',
                            marginTop: 36,
                            fontFamily: 'Nunito_700Bold',
                        }}>
                            Email Verified
                        </Text>
                    </View>

                    {/* Login button OUTSIDE the white box, below it */}
                    <View style={{ width: '100%', marginTop: 34 }}>
                        <CustomButton
                            title="Login"
                            onPress={handleLogin}
                            loading={loading}
                        />
                    </View>

                </View>
            </Modal>
        </View>
    );
}