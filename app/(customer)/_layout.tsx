import { Tabs } from 'expo-router';
import { Image, View, Text } from 'react-native';

function TabIcon({
                     focused,
                     activeIcon,
                     inactiveIcon,
                     label,
                 }: {
    focused: boolean;
    activeIcon: any;
    inactiveIcon: any;
    label: string;
}) {
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {/* Pill contains BOTH icon and label */}
            <View style={{
                backgroundColor: focused ? '#EBF1FF' : 'transparent',
                borderRadius: 35,
                paddingHorizontal: 12,
                paddingVertical: 6,
                minWidth: 70, minHeight: 70,   // ensures text never wraps
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
            }}>
                <Image
                    source={focused ? activeIcon : inactiveIcon}
                    // style={{ width: 18, height: 18 }}
                    resizeMode="contain"
                />
                <Text style={{
                    fontSize: 11,
                    fontFamily: 'Nunito_700Bold',
                    color: focused ? '#10B981' : '#FFFFFF',  // white text inside blue pill
                }}>
                    {label}
                </Text>
            </View>
        </View>
    );
}

export default function CustomerLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,   // we render our own label in TabIcon
                tabBarStyle: {
                    backgroundColor: '#2563EB',
                    borderTopWidth: 1,
                    borderTopColor: '#F3F4F6',
                    height: 97,
                    paddingBottom: 0,
                    paddingTop: 0,

                },
                tabBarIconStyle: {
                    flex: 1,            // stretch icon container to full tab height
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