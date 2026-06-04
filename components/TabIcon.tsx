import {View, Text, Image, Platform} from 'react-native';

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
                paddingHorizontal: Platform.OS === 'ios' ? 10 : 8,
                paddingVertical: 6,
                minWidth: Platform.OS === 'ios' ? 65 : 50,
                minHeight: Platform.OS === 'ios' ? 65 : 50,
                alignItems: 'center',
                justifyContent: 'center',
                gap: Platform.OS === 'ios' ? 3 : 2,
            }}>
                <Image
                    source={focused ? activeIcon : inactiveIcon}
                    style={{
                        width: Platform.OS === 'ios' ? 20 : 17,
                        height: Platform.OS === 'ios' ? 20 : 17
                    }}
                    resizeMode="contain"
                />
                <Text style={{
                    fontSize: Platform.OS === 'ios' ? 10 : 9,
                    fontFamily: 'Nunito_700Bold',
                    color: focused ? '#10B981' : '#FFFFFF',
                }}>
                    {label}
                </Text>
            </View>
        </View>
    );
}