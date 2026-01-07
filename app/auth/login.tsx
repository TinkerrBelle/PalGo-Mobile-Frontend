import {View, Text, TextInput, ActivityIndicator, TouchableOpacity} from 'react-native';
import React, {useState} from 'react';
import API from '../../services/api';
import {router} from 'expo-router';


export default function login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

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
        <View className="justify-center flex-1 bg-white dark:bg-black">
            <Text className="text-center color-amber-600">login</Text>
            <TextInput
                placeholder="Email Address"
                placeholderTextColor="#9ca3af"
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 mb-4 text-black dark:text-white"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TextInput
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 mb-4 text-black dark:text-white"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
            />

            <TouchableOpacity
                disabled={loading}
                onPress={handleLogin}
                className="bg-blue-600 py-4 rounded-lg">
                {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                    <Text className="text-white text-center font-semibold text-lg">
                        Login
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

//const styles = StyleSheet.create({});
