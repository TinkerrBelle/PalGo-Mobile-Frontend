import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ImageBackground, Image } from "react-native";
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import Checkbox from "expo-checkbox";
import API from '../../services/api'; // Adjust the path based on your folder structure
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';



export default function CreateAccount() {
    const [agreed, setAgreed] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const { role } = useLocalSearchParams<{ role: string }>();


    const handleCreateAccount = async () => {
        if (!name || !email || !password || !confirmPassword) {
            alert("All fields are required");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        if (!agreed) {
            alert("You must agree to the Terms & Conditions and Privacy Policy");
            return;
        }

        setLoading(true);

        try {
            // Split the full name
            const nameParts = name.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || nameParts[0]; // Fallback to firstName if no last name
            console.log('Attempting registration with:', { firstName, lastName, email });
            console.log('API URL:', API.defaults.baseURL);

            const response = await API.post('/Auth/register', {
                email: email,
                password: password,
                firstName: firstName,
                lastName: lastName,
                phoneNumber: "0000000000", // You'll need to add a phone input field later
                role: role === '1' ? 1 : 0  // Use the role from onboarding // 0 for Customer, 1 for Runner - you'll need to add role selection
            });

            console.log('Registration successful:', response.data);

            // Store the token (we'll set up proper storage next)
            const { token } = response.data;

            alert('Account created successfully!');
            // Navigate to verify screen, passing the email
            router.push({
                pathname: '/auth/verify-email',
                params: { email: email }
            });
            //router.push('/auth/login'); // Or navigate to home screen

        } catch (error: any) {
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

            console.error('Registration error:', errorMessage);
            alert(errorMessage);
        } finally {
            setLoading(false); // STOP LOADING
        }

    };

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
                        Create Account
                    </Text>

                    <Text className="text-accent-100 text-center text-xs font-nunito-medium pb-8"
                    >Create a new account to get started and enjoy seamless access to our features.</Text>

                    <CustomInput
                        placeholder="Full Name"
                        placeholderTextColor="#4C4C4C"
                        value={name}
                        onChangeText={setName}
                        editable={!loading}
                        icon={require('../../assets/images/user_icon.png')}
                    />

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

                    <CustomInput
                        placeholder="Confirm Password"
                        secureTextEntry={!showPasswordConfirm}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        editable={!loading}
                        icon={require('../../assets/images/password_icon.png')}
                        rightIcon={
                            showPassword
                                ? require('../../assets/images/visibility_off.png')
                                : require('../../assets/images/visibility.png')
                        }
                        onRightIconPress={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    />


                    <View className="flex-row items-center mb-14 mt-2" >
                        <Checkbox
                            value={agreed}
                            onValueChange={setAgreed}
                            color={agreed ? "#2563eb" : undefined}
                            disabled={loading}
                        />

                        <Text className="text-accent-100 dark:text-gray-400 text-xs font-nunito-medium ml-3 flex-1 ">
                            I agree to the{" "}
                            <Text
                                //onPress={() => router.push("/terms")}
                                className="text-blue-600 font-nunito underline"
                            >
                                Terms & Conditions
                            </Text>
                            {" "}and{" "}
                            <Text
                                //onPress={() => router.push("/privacy")}
                                className="text-blue-600 font-nunito underline"
                            >
                                Privacy Policy
                            </Text>
                        </Text>
                    </View>

                    <CustomButton title="SignUp" onPress={handleCreateAccount} loading={loading} />

                    <TouchableOpacity
                        onPress={() => router.push("/auth/login")}
                        className="mt-6"
                        disabled={loading}
                    >
                        <View className="flex-row justify-center">
                            <Text className="text-center text-accent-100 text-xs font-nunito-medium ">
                                Have an account? </Text>
                            <Text className="text-center text-primary text-xs font-nunito-bold ml-0.5 ">
                                Sign In Here</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </ImageBackground>
        </View>
    );
}
