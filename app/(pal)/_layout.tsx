import { Tabs } from 'expo-router';
import TabIcon from '@/components/TabIcon';
import {Platform} from "react-native";

export default function PalLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: '#2563EB',
                    borderTopWidth: 1,
                    borderTopColor: '#F3F4F6',
                    height: Platform.OS === 'ios' ? 90 : 100,
                    paddingBottom: Platform.OS === 'ios' ? 0 : 30,
                    paddingTop: 0,
                },
                tabBarIconStyle: {
                    flex: 1,
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            activeIcon={require('../../assets/images/tab-home-active.png')}
                            inactiveIcon={require('../../assets/images/tab-home.png')}
                            label="Home"
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="errands"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            activeIcon={require('../../assets/images/tab-errands-active.png')}
                            inactiveIcon={require('../../assets/images/tab-errands.png')}
                            label="Errands"
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="wallet"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            activeIcon={require('../../assets/images/tab-earnings-active.png')}
                            inactiveIcon={require('../../assets/images/tab-earnings.png')}
                            label="Wallet"
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            activeIcon={require('../../assets/images/tab-profile-active.png')}
                            inactiveIcon={require('../../assets/images/tab-profile.png')}
                            label="Profile"
                        />
                    ),
                }}
            />
        </Tabs>
    );
}