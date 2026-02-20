import { View, Text, TouchableOpacity } from "react-native";
import * as SecureStore from 'expo-secure-store';
import { router } from "expo-router";

export default function Onboarding() {
    const handleLoginNav = async () => {
        // When onboarding is done
        await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
        router.push('/auth/login');
    };
    return (
        <View className="flex-1 bg-white dark:bg-black px-6 justify-center">
            <Text className="text-3xl font-bold text-center text-black dark:text-white mb-4">
                Welcome to PalGo
            </Text>

            <Text className="text-gray-500 dark:text-gray-400 text-center mb-10">
                Let’s get you started
            </Text>

            <TouchableOpacity
                onPress={() => router.push("/auth/create-account")}
                className="bg-blue-600 py-4 rounded-xl mb-4"
            >
                <Text className="text-white text-center font-semibold text-lg">
                    Create Account
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={handleLoginNav}
                // onPress={() => router.push("/auth/login")}
                className="border border-blue-600 py-4 rounded-xl"
            >
                <Text className="text-blue-600 text-center font-semibold text-lg">
                    Login
                </Text>
            </TouchableOpacity>
        </View>
    );
}
