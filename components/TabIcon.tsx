import { View, Text, Image } from 'react-native';

interface TabIconProps {
    focused: boolean;
    activeIcon: any;
    inactiveIcon: any;
    label: string;
}

export default function TabIcon({ focused, activeIcon, inactiveIcon, label }: TabIconProps) {
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
                backgroundColor: focused ? '#EBF1FF' : 'transparent',
                borderRadius: 35,
                paddingHorizontal: 12,
                paddingVertical: 6,
                minWidth: 70, minHeight: 70,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
            }}>
                <Image
                    source={focused ? activeIcon : inactiveIcon}
                    style={{ width: 22, height: 22 }}
                    resizeMode="contain"
                />
                <Text style={{
                    fontSize: 11,
                    fontFamily: 'Nunito_700Bold',
                    color: focused ? '#10B981' : '#FFFFFF',
                }}>
                    {label}
                </Text>
            </View>
        </View>
    );
}