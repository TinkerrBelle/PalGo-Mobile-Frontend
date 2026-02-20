// app/(tabs)/profile.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
    const { user, logout } = useAuth();

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Profile Screen</Text>
            <Text>Welcome, {user?.firstName} {user?.lastName}</Text>
            <Text>Email: {user?.email}</Text>

            <TouchableOpacity
                onPress={logout}
                style={{
                    marginTop: 20,
                    backgroundColor: '#EF4444',
                    padding: 15,
                    borderRadius: 8
                }}
            >
                <Text style={{ color: 'white' }}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}