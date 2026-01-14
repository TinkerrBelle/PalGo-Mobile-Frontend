import {View, Text, TextInput, ActivityIndicator, TouchableOpacity, ImageBackground, Image} from 'react-native';
import React, {useState} from 'react';
import API from '../../services/api';
import {router} from 'expo-router';
import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import Checkbox from "expo-checkbox";


export default function login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);


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
            const response = await API.post('Auth/login', {
                email: email,
                password: password,
            });

            const { token } = response.data;
            router.push('/auth/create-account');
        }
        catch (error:any) {
            // BETTER ERROR LOGGING
            console.log('Full error object:', error);
            console.log('Error response:', error.response);
            console.log('Error response data:', error.response?.data);
            console.log('Error message:', error.message);

            // More detailed error message
            let errorMessage = 'Registration failed. Please try again.';

            if (error.response) {
                // Server responded with error
                errorMessage = error.response.data?.message ||
                    JSON.stringify(error.response.data) ||
                    `Server error: ${error.response.status}`;
            } else if (error.request) {
                // Request was made but no response
                errorMessage = 'Cannot connect to server. Please check your connection.';
            } else {
                // Something else happened
                errorMessage = error.message;
            }

            //console.error('Registration error:', errorMessage);
            alert(errorMessage);
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <View className="flex-1">
            <ImageBackground source={require('../../assets/images/bckg_1.png')}
                             className="flex-1"
            >
                <Image source={require('../../assets/images/bckg_drip_C.png')}
                       resizeMode="contain"
                />
                <View className="flex-1 px-8 pt-8">
                    <Text className="text-3xl font-nunito-bold text-black dark:text-white mb-2 text-center">
                        Login
                    </Text>

                    <Text className="text-accent-100 text-center text-xs font-nunito-medium pb-8"
                    >Enter your email and password to securely access your account amd manage your services.</Text>

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
                        rightIcon={require('../../assets/images/visibility_off.png')}
                        onRightIconPress={() => setShowPassword(!showPassword)}
                    />

                    <View className="flex-row justify-between">
                        <View className="flex-row">
                            <Checkbox />
                            <Text className="text-accent-100 text-center text-xs font-nunito-medium ml-2">Remember me</Text>
                        </View>
                        <TouchableOpacity>
                            <Text className="text-accent-100 text-center text-xs font-nunito-medium pb-8 ml-2">Forgot Password</Text>
                        </TouchableOpacity>
                    </View>

                    <CustomButton title="Login" onPress={handleLogin} loading={loading} />


                    <TouchableOpacity
                        onPress={() => router.push("/auth/create-account")}
                        className="mt-4"
                        disabled={loading}
                    >
                        <View className="flex-row justify-center">
                            <Text className="text-center text-accent-100 text-xs font-nunito-medium ">
                                Don't have an account? </Text>
                            <Text className="text-center text-primary text-xs font-nunito-bold ml-0.5 ">
                                Sign Up Here</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </ImageBackground>
        </View>
    );
}

//const styles = StyleSheet.create({});
