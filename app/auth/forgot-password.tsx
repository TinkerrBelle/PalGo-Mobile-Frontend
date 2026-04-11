import { View, Text, TouchableOpacity, ImageBackground, Image, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import React, { useState } from 'react';
import { router } from 'expo-router';
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import API from '@/services/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!email) {
            alert('Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            await API.post('/Auth/forgot-password', { email });
            // Always navigate to reset screen regardless
            // (backend returns same message whether email exists or not)
            router.push({
                pathname: '/auth/reset-password.tsx',
                params: { email }
            });
        } catch (error: any) {
            alert('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
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
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View className="flex-1 px-8 pt-8">
                            <Text className="text-3xl font-nunito-bold text-black dark:text-white mb-2 text-center">
                                Forgot Password
                            </Text>

                            <Text className="text-accent-100 text-center text-xs font-nunito-medium pb-8">
                                Enter your email address and we'll send you a code to reset your password.
                            </Text>

                            <CustomInput
                                placeholder="Email Address"
                                value={email}
                                onChangeText={setEmail}
                                editable={!loading}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                icon={require('../../assets/images/mail.png')}
                            />

                            <CustomButton
                                title="Send Reset Code"
                                onPress={handleSubmit}
                                loading={loading}
                            />

                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="mt-4"
                                disabled={loading}
                            >
                                <Text className="text-center text-accent-100 text-xs font-nunito-medium">
                                    Back to Login
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ImageBackground>
        </View>
    );
}