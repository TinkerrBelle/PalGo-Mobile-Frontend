import { View, Text, TouchableOpacity, Alert } from 'react-native';
import React from 'react';
import { useAuth } from '@/context/AuthContext';

export default function CustomerProfile() {
    const { logout, user } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout }
            ]
        );
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Customer Profile</Text>
            <Text>Welcome, {user?.firstName}</Text>
            <TouchableOpacity
                onPress={handleLogout}
                style={{ marginTop: 20, backgroundColor: '#EF4444', padding: 12, borderRadius: 8 }}
            >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}