// app/auth/login.tsx
import {View, Text, TouchableOpacity, ImageBackground, Image, Alert, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import React, { useState } from 'react';
import { router } from 'expo-router';
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import Checkbox from "expo-checkbox";
import { useAuth } from '@/context/AuthContext';
import * as SecureStore from 'expo-secure-store';


export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login, user } = useAuth();

    const handleLogin = async () => {
        if (!email) {
            alert('Please enter an email');
            return;
        }

        if (!password) {
            alert('Please enter a password');
            return;
        }

        setLoading(true);

        try {
            await login(email, password, rememberMe);

            // Navigate to main app - adjust route as needed
            //router.replace('/(tabs)/home');
            //router.replace('/home');
            // Route based on role
            if (user?.role === 'Customer') {
                router.replace('/(customer)/home');
            } else if (user?.role === 'Runner') {
                router.replace('/(pal)/home');
            } else {
                router.replace('/(customer)/home'); // fallback
            }

        } catch (error: any) {
            let errorMessage = 'Login failed. Please try again.';

            if (error.response) {
                errorMessage = error.response.data?.message ||
                    `Server error: ${error.response.status}`;
            } else if (error.request) {
                errorMessage = 'Cannot connect to server. Please check your connection.';
            } else {
                errorMessage = error.message;
            }

            alert(errorMessage);
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
                {/* ADD KeyboardAvoidingView wrapping the ScrollView */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                    >
                        <View className="flex-1 px-8 pt-8">
                            <Text className="text-3xl font-nunito-bold text-black dark:text-white mb-2 text-center">
                                Login
                            </Text>

                            <Text className="text-accent-100 text-center text-xs font-nunito-medium pb-8">
                                Enter your email and password to securely access your account and manage your services.
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

                            <CustomInput
                                placeholder="Password"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                                editable={!loading}
                                icon={require('../../assets/images/password_icon.png')}
                                rightIcon={
                                    showPassword
                                        ? require('../../assets/images/visibility_off.png')
                                        : require('../../assets/images/visibility.png')
                                }
                                onRightIconPress={() => setShowPassword(!showPassword)}
                            />

                            <View className="flex-row justify-between mb-6">
                                <TouchableOpacity
                                    className="flex-row items-center"
                                    onPress={() => setRememberMe(!rememberMe)}
                                    disabled={loading}
                                >
                                    <Checkbox
                                        value={rememberMe}
                                        onValueChange={setRememberMe}
                                        color={rememberMe ? '#4F46E5' : undefined}
                                        disabled={loading}
                                    />
                                    <Text className="text-accent-100 text-xs font-nunito-medium ml-2">
                                        Remember me
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    //onPress={() => router.push('/auth/forgot-password')}
                                    disabled={loading}
                                >
                                    <Text className="text-accent-100 text-xs font-nunito-medium">
                                        Forgot Password?
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <CustomButton
                                title="Login"
                                onPress={handleLogin}
                                loading={loading}
                            />

                            <TouchableOpacity
                                onPress={() => router.push("/auth/create-account")}
                                className="mt-4"
                                disabled={loading}
                            >
                                <View className="flex-row justify-center">
                                    <Text className="text-center text-accent-100 text-xs font-nunito-medium">
                                        Don't have an account?
                                    </Text>
                                    <Text className="text-center text-primary text-xs font-nunito-bold ml-1">
                                        Sign Up Here
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            // Add a button temporarily just for testing:
                            <TouchableOpacity onPress={async () => {
                                await SecureStore.deleteItemAsync('hasSeenOnboarding');
                                await SecureStore.deleteItemAsync('rememberMe');
                                await SecureStore.deleteItemAsync('accessToken');
                                await SecureStore.deleteItemAsync('refreshToken');
                                Alert.alert('Cleared!', 'Restart the app now');
                            }}>
                                <Text>Reset App State (DEV ONLY)</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ImageBackground>
        </View>
    );
}