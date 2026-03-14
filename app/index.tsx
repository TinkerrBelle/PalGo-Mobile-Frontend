import { View, Text, Image, ImageBackground, TouchableOpacity, Modal, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useState, useRef, useEffect } from "react";
import * as SecureStore from 'expo-secure-store';
import { router } from "expo-router";
import CustomButton from "@/components/CustomButton";

const { width } = Dimensions.get('window');

const slides = [
    {
        id: '1',
        image: require('../assets/images/onboarding-slide1.png'), // replace with your actual images
        text: 'Payments Are Safe.',
    },
    {
        id: '2',
        image: require('../assets/images/onboarding-slide2.png'),
        text: 'All Runners Are verified.',
    },
    {
        id: '3',
        image: require('../assets/images/onboarding-slide3.png'),
        text: 'All Runners Are Tracked in Real-Time.',
    },
];

export default function Index() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMode, setModalMode] = useState<'signup' | 'login'>('signup');
    const flatListRef = useRef<FlatList>(null);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentSlide(index);
    };

    const handleSignUpPress = () => {
        setModalMode('signup');
        setModalVisible(true);
    };

    const handleLoginPress = () => {
        setModalMode('login');
        setModalVisible(true);
    };

    const handleRoleSelect = async (role: 0 | 1) => {
        setModalVisible(false);
        await SecureStore.setItemAsync('hasSeenOnboarding', 'true');

        if (modalMode === 'signup') {

            if (role === 0) {
                router.push({
                    pathname: '/auth/create-account',
                    params: { role: role.toString() }
                });
                //router.push('/auth/create-account');         // customer
            } else {
                router.push('/auth/create-account-pal');     // pal
            }
        } else {
            router.push({
                pathname: '/auth/login',
                params: { role: role.toString() }
            });
        }
    };

    // Inside your component, after your existing state:
    useEffect(() => {
        const interval = setInterval(() => {
            const nextSlide = (currentSlide + 1) % slides.length;
            flatListRef.current?.scrollToIndex({ index: nextSlide, animated: true });
            setCurrentSlide(nextSlide);
        }, 3000); // slides every 3 seconds

        return () => clearInterval(interval); // cleanup on unmount
    }, [currentSlide]);

    return (
        <View style={{ flex: 1 }}>
            <ImageBackground
                source={require('../assets/images/bckg_2.png')}
                style={{ flex: 1 }}
            >
                {/* Top drip image */}
                {/*<Image*/}
                {/*    source={require('../assets/images/bckg_drip_C.png')}*/}
                {/*    resizeMode="contain"*/}
                {/*    style={{ width: '100%' }}*/}
                {/*/>*/}

                {/* Logo */}
                <View style={{ alignItems: 'center', marginTop: 80 }}>
                    <Image
                        source={require('../assets/images/logo1.png')}
                        resizeMode="contain"

                    />
                </View>

                {/* Carousel */}
                <FlatList
                    ref={flatListRef}
                    data={slides}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    renderItem={({ item }) => (
                        <View style={{
                            width: width,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 32,
                            paddingBottom: 24,
                        }}>
                            <Image
                                source={item.image}
                                resizeMode="contain"
                                style={{ width: 220, height: 220 }}
                            />
                            <Text style={{
                                fontSize: 20,
                                fontFamily: 'Nunito_700Bold',
                                color: '#111827',
                                textAlign: 'center',
                                marginTop: 50,
                            }}>
                                {item.text}
                            </Text>
                        </View>
                    )}
                />

                {/* Dot indicators */}
                {/*<View style={{*/}
                {/*    flexDirection: 'row',*/}
                {/*    justifyContent: 'center',*/}
                {/*    alignItems: 'center',*/}
                {/*    gap: 8,*/}
                {/*    marginVertical: 16,*/}
                {/*}}>*/}
                {/*    {slides.map((_, index) => (*/}
                {/*        <View*/}
                {/*            key={index}*/}
                {/*            style={{*/}
                {/*                width: currentSlide === index ? 20 : 8,*/}
                {/*                height: 8,*/}
                {/*                borderRadius: 4,*/}
                {/*                backgroundColor: currentSlide === index ? '#2563eb' : '#D1D5DB',*/}
                {/*            }}*/}
                {/*        />*/}
                {/*    ))}*/}
                {/*</View>*/}

                {/* Bottom buttons */}
                <View style={{
                    flexDirection: 'row',
                    paddingHorizontal: 32,
                    gap: 10,
                    paddingBottom: 60,
                }}>
                    <View style={{ flex: 1 }}>
                        <CustomButton
                            title="Sign Up"
                            backgroundImage={require('../assets/images/btn_2.png')}
                            resizeMode="contain"
                            onPress={handleSignUpPress}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <CustomButton
                            title="Login"
                            backgroundImage={require('../assets/images/btn_2.png')}
                            resizeMode="contain"
                            onPress={handleLoginPress}
                        />
                    </View>
                </View>
            </ImageBackground>

            {/* Role Selection Modal - slides up from bottom */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                {/* Tap outside to dismiss */}
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                />

                <View style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    {/* Modal sheet */}
                    <View style={{
                        backgroundColor: '#EBF1FF',
                        borderTopLeftRadius: 40,
                        borderTopRightRadius: 40,
                        paddingHorizontal: 32,
                        paddingVertical: 35,
                        // paddingTop: 32,
                        // paddingBottom: 48,
                        gap: 30,
                    }}>
                        {/*<Text style={{*/}
                        {/*    textAlign: 'center',*/}
                        {/*    fontSize: 16,*/}
                        {/*    fontFamily: 'Nunito_700Bold',*/}
                        {/*    color: '#111827',*/}
                        {/*    marginBottom: 8,*/}
                        {/*}}>*/}
                        {/*    {modalMode === 'signup' ? 'Sign up as' : 'Login as'}*/}
                        {/*</Text>*/}

                        {/* User button - role 0 */}
                        <CustomButton
                            title="User"
                            backgroundImage={require('../assets/images/btn_3.png')}
                            resizeMode="contain"
                            width={256}
                            height={61}
                            onPress={() => handleRoleSelect(0)}
                        />

                        {/* Pal button - role 1 */}
                        <CustomButton
                            title="Pals"
                            backgroundImage={require('../assets/images/btn_3.png')}
                            resizeMode="contain"
                            width={256}
                            height={61}
                            onPress={() => handleRoleSelect(1)}
                        />

                        <Text style={{
                            textAlign: 'center',
                            fontSize: 11,
                            fontFamily: 'Nunito_400Regular',
                            color: '#6B7280',
                            marginBottom: 6,
                        }}>
                            Each role requires a separate account
                        </Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}