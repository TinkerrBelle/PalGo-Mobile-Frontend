import {
    View, Text, TouchableOpacity, ImageBackground, Image,
    ScrollView, Alert, Platform, Modal, KeyboardAvoidingView,
    ActivityIndicator
} from "react-native";
import React, { useState } from "react";
import { router } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

const ID_TYPES = [
    { label: 'National Identification Number (NIN)', value: 'NIN' },
    { label: "Driver's Licence", value: 'Drivers Licence' },
    { label: 'International Passport', value: 'International Passport' },
];

export default function Reapply() {
    const { user } = useAuth();

    const [address, setAddress] = useState('');
    const [idType, setIdType] = useState('');
    const [showIdTypePicker, setShowIdTypePicker] = useState(false);

    const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
    const [uploadingProfile, setUploadingProfile] = useState(false);
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

    const [idDocName, setIdDocName] = useState<string | null>(null);
    const [uploadingIdDoc, setUploadingIdDoc] = useState(false);
    const [idDocProgress, setIdDocProgress] = useState(0);
    const [idDocUploaded, setIdDocUploaded] = useState(false);
    const [idDocUrl, setIdDocUrl] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);

    const uploadImage = async (
        uri: string,
        filename: string,
        endpoint: string,
        setUploading: (v: boolean) => void,
        setUrl: (v: string) => void,
        onProgress?: (p: number) => void,
        onComplete?: () => void,
    ) => {
        setUploading(true);
        onProgress?.(0);
        try {
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            const formData = new FormData();
            formData.append('file', { uri, name: filename, type } as any);

            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 10;
                if (progress <= 90) onProgress?.(progress);
                else clearInterval(progressInterval);
            }, 200);

            const response = await API.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            clearInterval(progressInterval);
            onProgress?.(100);
            setUrl(response.data.url);
            onComplete?.();
        } catch (error) {
            onProgress?.(0);
            Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const requestPermission = async (type: 'camera' | 'gallery') => {
        if (type === 'camera') {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Camera permission is required.');
                return false;
            }
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Gallery permission is required.');
                return false;
            }
        }
        return true;
    };

    const handleProfileCamera = async () => {
        if (!await requestPermission('camera')) return;
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            const filename = uri.split('/').pop() || 'profile.jpg';
            setProfileImageUri(uri);
            await uploadImage(uri, filename, '/Upload/profile-image',
                setUploadingProfile, setProfileImageUrl);
        }
    };

    const handleProfileGallery = async () => {
        if (!await requestPermission('gallery')) return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            const filename = uri.split('/').pop() || 'profile.jpg';
            setProfileImageUri(uri);
            await uploadImage(uri, filename, '/Upload/profile-image',
                setUploadingProfile, setProfileImageUrl);
        }
    };

    const handleIdDocCamera = async () => {
        if (!await requestPermission('camera')) return;
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            allowsEditing: false,
            quality: 0.9,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            const filename = uri.split('/').pop() || 'id-doc.jpg';
            setIdDocName(filename);
            setIdDocUploaded(false);
            await uploadImage(uri, filename, '/Upload/id-document',
                setUploadingIdDoc, setIdDocUrl,
                setIdDocProgress, () => setIdDocUploaded(true));
        }
    };

    const handleIdDocGallery = async () => {
        if (!await requestPermission('gallery')) return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: false,
            quality: 0.9,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            const filename = uri.split('/').pop() || 'id-doc.jpg';
            setIdDocName(filename);
            setIdDocUploaded(false);
            await uploadImage(uri, filename, '/Upload/id-document',
                setUploadingIdDoc, setIdDocUrl,
                setIdDocProgress, () => setIdDocUploaded(true));
        }
    };

    const handleClearIdDoc = () => {
        setIdDocName(null);
        setIdDocUploaded(false);
        setIdDocProgress(0);
        setIdDocUrl(null);
    };

    const handleSubmit = async () => {
        if (!profileImageUrl && !idDocUrl && !address && !idType) {
            Alert.alert('Error', 'Please update at least one piece of information before reapplying');
            return;
        }

        setLoading(true);
        try {
            await API.post('/Auth/reapply', {
                userId: user?.id,
                profileImageUrl,
                address,
                idType,
                idDocumentUrl: idDocUrl,
            });

            router.replace('/auth/pending-approval');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to submit. Please try again.';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

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
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginBottom: 16, alignSelf: 'flex-start', position: 'absolute',
                        zIndex: 10, top: 42, padding: 8
                    }}
                >
                    <Image
                        source={require('../../assets/images/back-button.png')}
                        style={{ width: 32, height: 32 }}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={{
                            paddingHorizontal: 32,
                            paddingTop: 16,
                            paddingBottom: 80,
                        }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={{
                            fontSize: 28,
                            fontFamily: 'Nunito_700Bold',
                            color: '#111827',
                            textAlign: 'center',
                            marginBottom: 8,
                        }}>
                            Reapply
                        </Text>
                        <Text style={{
                            fontSize: 12,
                            fontFamily: 'Nunito_500Medium',
                            color: '#6B7280',
                            textAlign: 'center',
                            marginBottom: 8,
                        }}>
                            Please update your information and resubmit your application.
                        </Text>

                        {/* Note */}
                        <View style={{
                            backgroundColor: 'rgba(239,68,68,0.08)',
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 24,
                        }}>
                            <Text style={{
                                fontSize: 12,
                                fontFamily: 'Nunito_500Medium',
                                color: '#EF4444',
                                textAlign: 'center',
                            }}>
                                You only need to update the information that caused your rejection. Everything else will remain the same.
                            </Text>
                        </View>

                        {/* Profile picture, address, ID type, ID doc
                            — same UI as id-verification.tsx, copy those sections here */}

                        {/* ── PROFILE PICTURE ── */}
                        <Text style={{
                            fontSize: 13,
                            fontFamily: 'Nunito_600SemiBold',
                            color: '#374151',
                            marginBottom: 10,
                            textAlign: 'center'
                        }}>
                            Update Profile Image (optional)
                        </Text>

                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <View style={{ position: 'relative' }}>
                                <ImageBackground
                                    source={require('../../assets/images/input-bg-circle.png')}
                                    style={{
                                        width: 70, height: 70, borderRadius: 35,
                                        overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
                                    }}
                                    imageStyle={{ borderRadius: 45 }}
                                >
                                    {uploadingProfile ? (
                                        <ActivityIndicator color="#2563EB" />
                                    ) : profileImageUri ? (
                                        <Image
                                            source={{ uri: profileImageUri }}
                                            style={{ width: 60, height: 60, borderRadius: 30 }}
                                        />
                                    ) : (
                                        <Image
                                            source={require('../../assets/images/user_upload_icon.png')}
                                            style={{ width: 60, height: 60 }}
                                            resizeMode="contain"
                                        />
                                    )}
                                </ImageBackground>
                                <TouchableOpacity
                                    onPress={() => Alert.alert('Profile Picture', 'Choose an option', [
                                        { text: 'Take Photo', onPress: handleProfileCamera },
                                        { text: 'Choose from Gallery', onPress: handleProfileGallery },
                                        { text: 'Cancel', style: 'cancel' },
                                    ])}
                                    disabled={uploadingProfile || loading}
                                    style={{
                                        position: 'absolute', top: 0, right: 0,
                                        width: 26, height: 26, borderRadius: 13,
                                        alignItems: 'center', justifyContent: 'center',
                                    }}
                                >
                                    <Image
                                        source={require('../../assets/images/plus_icon.png')}
                                        style={{ width: 28, height: 28 }}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ── ADDRESS ── */}
                        <Text style={{
                            fontSize: 13,
                            fontFamily: 'Nunito_600SemiBold',
                            color: '#374151',
                            marginBottom: 10,
                        }}>
                            Update Address (optional)
                        </Text>
                        <CustomInput
                            placeholder="Enter your full home address"
                            value={address}
                            onChangeText={setAddress}
                            editable={!loading}
                        />

                        {/* ── ID TYPE ── */}
                        <Text style={{
                            fontSize: 13,
                            fontFamily: 'Nunito_600SemiBold',
                            color: '#374151',
                            marginBottom: 10,
                            marginTop: 8,
                        }}>
                            Update ID Type (optional)
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowIdTypePicker(true)}
                            disabled={loading}
                            style={{ marginBottom: 24 }}
                        >
                            <ImageBackground
                                source={require('../../assets/images/input-bg.png')}
                                style={{
                                    paddingHorizontal: 24,
                                    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}
                                imageStyle={{ borderRadius: 28 }}
                            >
                                <Text style={{
                                    fontSize: 12,
                                    fontFamily: 'Nunito_500Medium',
                                    color: idType ? '#111827' : '#4C4C4C',
                                    flex: 1,
                                }}>
                                    {idType
                                        ? ID_TYPES.find(t => t.value === idType)?.label
                                        : 'Select ID Type'
                                    }
                                </Text>
                                <Image
                                    source={require('../../assets/images/chevron_down.png')}
                                    style={{ width: 16, height: 16 }}
                                    resizeMode="contain"
                                />
                            </ImageBackground>
                        </TouchableOpacity>

                        {/* ── ID DOCUMENT ── */}
                        <Text style={{
                            fontSize: 13,
                            fontFamily: 'Nunito_600SemiBold',
                            color: '#374151',
                            marginBottom: 10,
                        }}>
                            Update ID Document (optional)
                        </Text>

                        <ImageBackground
                            source={require('../../assets/images/input-bg-upload.png')}
                            style={{
                                width: '100%',
                                // minHeight: 278,
                                minHeight: Platform.OS === 'ios' ? 278 : 225,
                                marginBottom: 12,
                                justifyContent: 'center',
                            }}
                            imageStyle={{ borderRadius: 16 }}
                        >
                            {/* Inner content wrapper — this is what gives the ImageBackground its height */}
                            <View style={{ paddingHorizontal: 15, alignItems: 'center' }}>
                                <Text style={{
                                    fontSize: 12,
                                    fontFamily: 'Nunito_400Regular',
                                    color: '#4C4C4C',
                                    textAlign: 'center',
                                    marginBottom: 5,
                                }}>
                                    Upload a photo of yourself holding your valid ID.
                                </Text>
                                {!idDocName ? (
                                    // ── EMPTY STATE — description + both buttons inside the image ──
                                    <>


                                        {/* Tap to upload */}
                                        <TouchableOpacity
                                            onPress={handleIdDocGallery}
                                            disabled={loading}
                                            style={{
                                                width: '100%',
                                                // flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 10,
                                                marginBottom: 8,
                                                paddingVertical: 12,
                                            }}
                                        >
                                            <Image
                                                source={require('../../assets/images/upload_file_icon.png')}
                                                style={{ width: 50, height: 50 }}
                                                resizeMode="contain"
                                            />
                                            {/*<View>*/}
                                            <Text style={{
                                                fontSize: 12,
                                                fontFamily: 'Nunito_500Medium',
                                                color: '#2563EB',
                                                textAlign: 'center',
                                            }}>
                                                Tap to upload Photo
                                            </Text>
                                            <Text style={{
                                                fontSize: 12,
                                                fontFamily: 'Nunito_400Regular',
                                                color: '#4C4C4C',
                                                textAlign: 'center',
                                            }}>
                                                PNG, JPEG or PDF (max 800x400px)
                                            </Text>
                                            {/*</View>*/}
                                        </TouchableOpacity>

                                        <Text style={{
                                            textAlign: 'center',
                                            fontSize: 12,
                                            fontFamily: 'Nunito_400Regular',
                                            color: '#4C4C4C',
                                            marginBottom: 16,
                                        }}>
                                            OR
                                        </Text>

                                        {/* Open Camera */}
                                        <View style={{ width: 106, height: 38, backgroundColor: '#10B981', borderRadius: 10 }}>
                                            <TouchableOpacity
                                                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                                                disabled={loading}
                                                onPress={handleIdDocCamera}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator color="#ffffff" size="small" />
                                                ) : (
                                                    <Text style={{ fontSize: 12, fontFamily: 'Nunito_400Regular', color: '#ffffff' }}>
                                                        Open Camera
                                                    </Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </>

                                ) : uploadingIdDoc ? (
                                    // ── UPLOADING STATE ──
                                    <View style={{ alignItems: 'center', gap: 8, width: '100%' }}>
                                        <Image
                                            source={require('../../assets/images/file_icon.png')}
                                            style={{ width: 40, height: 40 }}
                                            resizeMode="contain"
                                        />
                                        <Text style={{
                                            fontSize: 11,
                                            fontFamily: 'Nunito_500Medium',
                                            color: '#374151',
                                        }}>
                                            {idDocProgress}%
                                        </Text>
                                        <View style={{
                                            width: '100%',
                                            height: 6,
                                            backgroundColor: '#E5E7EB',
                                            borderRadius: 3,
                                        }}>
                                            <View style={{
                                                width: `${idDocProgress}%`,
                                                height: 6,
                                                backgroundColor: '#2563EB',
                                                borderRadius: 3,
                                            }} />
                                        </View>
                                        <Text style={{
                                            fontSize: 12,
                                            fontFamily: 'Nunito_600SemiBold',
                                            color: '#374151',
                                        }}>
                                            Uploading Document...
                                        </Text>
                                        <Text style={{
                                            fontSize: 11,
                                            fontFamily: 'Nunito_400Regular',
                                            color: '#6B7280',
                                        }}>
                                            {idDocName}
                                        </Text>
                                    </View>

                                ) : idDocUploaded ? (
                                    // ── COMPLETED STATE ──
                                    <View style={{ alignItems: 'center', gap: 8 }}>
                                        <Image
                                            source={require('../../assets/images/success_icon.png')}
                                            style={{
                                                width: Platform.OS === 'ios' ? 80 : 70,
                                                height: Platform.OS === 'ios' ? 80 : 70,
                                                marginTop: Platform.OS === 'ios' ? 10 : 7,
                                                marginBottom: Platform.OS === 'ios' ? 5 : 2,
                                            }}
                                            resizeMode="contain"
                                        />
                                        {/*<View style={{*/}
                                        {/*    width: 56,*/}
                                        {/*    height: 56,*/}
                                        {/*    borderRadius: 28,*/}
                                        {/*    backgroundColor: '#10B981',*/}
                                        {/*    alignItems: 'center',*/}
                                        {/*    justifyContent: 'center',*/}
                                        {/*}}>*/}
                                        {/*    <Text style={{ fontSize: 28, color: 'white' }}>✓</Text>*/}
                                        {/*</View>*/}
                                        <Text style={{
                                            fontSize: 12,
                                            fontFamily: 'Nunito_500Medium',
                                            color: '#0A0A0A',
                                        }}>
                                            Upload Completed
                                        </Text>
                                        <Text style={{
                                            fontSize: 10,
                                            marginTop: 3,
                                            fontFamily: 'Nunito_400Regular',
                                            color: '#5C5C5C',
                                        }}>
                                            {idDocName}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={handleClearIdDoc}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 4,
                                                marginTop: Platform.OS === 'ios' ? 24 : 18,

                                            }}
                                        >
                                            {/*<Text style={{ color: '#EF4444', fontSize: 14 }}>🗑</Text>*/}
                                            <Image
                                                source={require('../../assets/images/delete_icon.png')}
                                                style={{ width: 14, height: 14 }}
                                                resizeMode="contain"
                                            />
                                            <Text style={{
                                                fontSize: 12,
                                                fontFamily: 'Nunito_400Regular',
                                                color: '#0A0A0A',
                                            }}>
                                                Clear Upload
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : null}

                            </View>
                        </ImageBackground>

                        <View style={{ marginTop: 24 }}>
                            <CustomButton
                                title="Submit Reapplication"
                                onPress={handleSubmit}
                                loading={loading}
                            />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ImageBackground>

            {/* ID Type Picker Modal */}
            <Modal
                visible={showIdTypePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowIdTypePicker(false)}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
                    activeOpacity={1}
                    onPress={() => setShowIdTypePicker(false)}
                />
                <View style={{
                    backgroundColor: 'white',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    paddingBottom: 40,
                }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F3F4F6',
                    }}>
                        <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#111827' }}>
                            Select ID Type
                        </Text>
                        <TouchableOpacity onPress={() => setShowIdTypePicker(false)}>
                            <Text style={{ fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: '#2563EB' }}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {ID_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type.value}
                            onPress={() => {
                                setIdType(type.value);
                                setShowIdTypePicker(false);
                            }}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 24,
                                paddingVertical: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: '#F9FAFB',
                            }}
                        >
                            <Text style={{
                                fontSize: 14,
                                fontFamily: idType === type.value ? 'Nunito_700Bold' : 'Nunito_500Medium',
                                color: idType === type.value ? '#2563EB' : '#111827',
                            }}>
                                {type.label}
                            </Text>
                            {idType === type.value && (
                                <Text style={{ color: '#2563EB', fontSize: 16 }}>✓</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </Modal>
        </View>
    );
}