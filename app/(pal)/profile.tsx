import {View, Text, TouchableOpacity, Alert} from 'react-native';
import * as SecureStore from "expo-secure-store";
import React from "react";

export default function PalProfile() {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Pal Profile</Text>
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
    );
}