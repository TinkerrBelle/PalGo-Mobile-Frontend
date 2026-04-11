import { View, Text, TouchableOpacity, ImageBackground, Image, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import API from '@/services/api';

export default function ResetPassword() {
    const { email } = useLocalSearchParams<{ email: string }>();
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (!code) {
            alert('Please enter the reset code');
            return;
        }
        if (!newPassword) {
            alert('Please enter a new password');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        try {
            await API.post('/Auth/reset-password', {
                email,
                code,
                newPassword
            });

            alert('Password reset successful! Please login with your new password.');
            router.replace('/auth/login');
        } catch (error: any) {
            let message = 'Something went wrong. Please try again.';
            if (error.response?.data?.message) {
                message = error.response.data.message;
            }
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        try {
            await API.post('/Auth/forgot-password', { email });
            alert('A new code has been sent to your email.');
        } catch (error) {
            alert('Failed to resend code. Please try again.');
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
                                Reset Password
                            </Text>

                            <Text className="text-accent-100 text-center text-xs font-nunito-medium pb-8">
                                Enter the 6-digit code sent to {email} and your new password.
                            </Text>

                            <CustomInput
                                placeholder="6-Digit Code"
                                value={code}
                                onChangeText={setCode}
                                editable={!loading}
                                keyboardType="number-pad"
                                maxLength={6}
                                icon={require('../../assets/images/password_icon.png')}
                            />

                            <CustomInput
                                placeholder="New Password"
                                secureTextEntry={!showPassword}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                editable={!loading}
                                icon={require('../../assets/images/password_icon.png')}
                                rightIcon={
                                    showPassword
                                        ? require('../../assets/images/visibility_off.png')
                                        : require('../../assets/images/visibility.png')
                                }
                                onRightIconPress={() => setShowPassword(!showPassword)}
                            />

                            <CustomInput
                                placeholder="Confirm New Password"
                                secureTextEntry={!showConfirmPassword}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                editable={!loading}
                                icon={require('../../assets/images/password_icon.png')}
                                rightIcon={
                                    showConfirmPassword
                                        ? require('../../assets/images/visibility_off.png')
                                        : require('../../assets/images/visibility.png')
                                }
                                onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            />

                            <CustomButton
                                title="Reset Password"
                                onPress={handleReset}
                                loading={loading}
                            />

                            <TouchableOpacity
                                onPress={handleResendCode}
                                className="mt-4"
                                disabled={loading}
                            >
                                <Text className="text-center text-accent-100 text-xs font-nunito-medium">
                                    Didn't receive a code?{' '}
                                    <Text className="text-primary font-nunito-bold">Resend</Text>
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => router.replace('/auth/login')}
                                className="mt-2"
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