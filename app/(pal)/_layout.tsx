
import { Tabs } from 'expo-router';

export default function PalLayout() {
    return (
        <Tabs screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="home" options={{ title: 'Home' }} />
            <Tabs.Screen name="errands" options={{ title: 'Errands' }} />
            <Tabs.Screen name="earnings" options={{ title: 'Earnings' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        </Tabs>
    );
}