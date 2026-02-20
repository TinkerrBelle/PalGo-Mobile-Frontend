import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#2563EB',
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="errands"
                options={{
                    title: 'Errands',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="list" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="wallet"
                options={{
                    title: 'Wallet',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="wallet" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="chat"
                options={{
                    title: 'Chat',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="chatbubble" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
