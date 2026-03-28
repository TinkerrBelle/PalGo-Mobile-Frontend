import { View, Text, ImageBackground, Image, TouchableOpacity, Linking } from "react-native";
import { router } from "expo-router";
import CustomButton from "../../components/CustomButton";

export default function Rejected() {
    return (
        <View style={{ flex: 1 }}>
            <ImageBackground
                source={require('../../assets/images/bckg_1.png')}
                style={{ flex: 1 }}
            >
                <Image
                    source={require('../../assets/images/bckg_drip_C.png')}
                    resizeMode="contain"
                />

                <View style={{
                    flex: 1,
                    paddingHorizontal: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingBottom: 40,
                }}>
                    {/* Icon */}
                    <View style={{
                        width: 120,
                        height: 120,
                        borderRadius: 60,
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 32,
                    }}>
                        <Text style={{ fontSize: 56 }}>❌</Text>
                    </View>

                    {/* Title */}
                    <Text style={{
                        fontSize: 26,
                        fontFamily: 'Nunito_700Bold',
                        color: '#111827',
                        textAlign: 'center',
                        marginBottom: 16,
                    }}>
                        Application Rejected
                    </Text>

                    {/* Description */}
                    <Text style={{
                        fontSize: 13,
                        fontFamily: 'Nunito_500Medium',
                        color: '#6B7280',
                        textAlign: 'center',
                        lineHeight: 22,
                        marginBottom: 12,
                    }}>
                        Unfortunately your application to become a PalGo Pal was not successful at this time.
                    </Text>

                    <Text style={{
                        fontSize: 13,
                        fontFamily: 'Nunito_500Medium',
                        color: '#6B7280',
                        textAlign: 'center',
                        lineHeight: 22,
                        marginBottom: 40,
                    }}>
                        This may be due to incomplete or unclear documents. You can reapply with updated information or contact our support team for more details.
                    </Text>

                    {/* Reasons card */}
                    <View style={{
                        width: '100%',
                        backgroundColor: 'rgba(255,255,255,0.5)',
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 40,
                        gap: 14,
                    }}>
                        <Text style={{
                            fontSize: 13,
                            fontFamily: 'Nunito_700Bold',
                            color: '#374151',
                            marginBottom: 4,
                        }}>
                            Common reasons for rejection:
                        </Text>

                        {[
                            { icon: '📄', text: 'Blurry or unclear ID document' },
                            { icon: '🖼️', text: 'Profile photo did not meet requirements' },
                            { icon: '📝', text: 'Incomplete or incorrect information' },
                            { icon: '🔞', text: 'Does not meet age requirements' },
                        ].map((item, index) => (
                            <View
                                key={index}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                }}
                            >
                                <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                                <Text style={{
                                    fontSize: 12,
                                    fontFamily: 'Nunito_500Medium',
                                    color: '#6B7280',
                                    flex: 1,
                                }}>
                                    {item.text}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Contact support */}
                    <CustomButton
                        title="Contact Support"
                        onPress={() => {
                            // TODO: link to support email or chat
                            // For now just go back to login
                            Linking.openURL('mailto:patricianonye@gmail.com')
                            //Linking.openURL('mailto:support@palgo.com')
                            //router.replace('/auth/login');
                        }}
                    />

                    <TouchableOpacity
                        onPress={() => router.replace('/auth/create-account-pal')}
                        style={{ marginTop: 16 }}
                    >
                        <Text style={{
                            fontSize: 12,
                            fontFamily: 'Nunito_600SemiBold',
                            color: '#2563EB',
                            textAlign: 'center',
                        }}>
                            Reapply with updated information
                        </Text>
                    </TouchableOpacity>
                </View>
            </ImageBackground>
        </View>
    );
}