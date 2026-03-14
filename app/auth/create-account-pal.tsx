import { View, Text, TouchableOpacity, ImageBackground, Image, ScrollView, Alert, Platform, Modal, KeyboardAvoidingView  } from "react-native";
import { useState, useRef  } from "react";
import { router } from "expo-router";
import Checkbox from "expo-checkbox";
import DateTimePicker from '@react-native-community/datetimepicker';
import API from '../../services/api';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

export default function CreateAccountPal() {
    const [showGenderPicker, setShowGenderPicker] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    const [dobDate, setDobDate] = useState(new Date(2000, 0, 1));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [gender, setGender] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);

    const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setDobDate(selectedDate);
            setDob(formatDate(selectedDate));
        }
    };

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/[A-Z]/.test(pwd)) {
            return 'Password must contain at least one uppercase letter';
        }
        if (!/[0-9]/.test(pwd)) {
            return 'Password must contain at least one number';
        }
        return null; // null means valid
    };

    const handleCreateAccount = async () => {
        if (!name || !email || !phone || !dob || !gender || !password || !confirmPassword) {
            Alert.alert('Error', 'All fields are required');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            Alert.alert('Weak Password', passwordError);
            return;
        }

        if (!agreed) {
            Alert.alert('Error', 'You must agree to the Terms & Conditions');
            return;
        }

        setLoading(true);
        try {
            const nameParts = name.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || nameParts[0];

            const response = await API.post('/Auth/register-pal', {
                email,
                password,
                firstName,
                lastName,
                phoneNumber: phone,
                dateOfBirth: dob,
                gender,
            });

            router.push({
                pathname: '/auth/verify-email',
                params: {
                    email,
                    userId: response.data.userId,
                    nextScreen: 'verify-phone',
                    phone,
                }
            });

        } catch (error: any) {
            const message = error.response?.data?.message || 'Registration failed. Please try again.';
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
                {/* ADD KeyboardAvoidingView wrapping the ScrollView */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={{
                            paddingHorizontal: 32,
                            paddingTop: 16,
                            paddingBottom: 80,   // plenty of space at bottom
                        }}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={{
                            fontSize: 28,
                            fontFamily: 'Nunito_700Bold',
                            color: '#111827',
                            textAlign: 'center',
                            marginBottom: 8,
                        }}>
                            Create Pal Account
                        </Text>

                        <Text style={{
                            fontSize: 12,
                            fontFamily: 'Nunito_500Medium',
                            color: '#6B7280',
                            textAlign: 'center',
                            marginBottom: 4,
                        }}>
                            Join PalGo as an errand Pal and start earning today.
                        </Text>

                        <Text style={{
                            fontSize: 12,
                            fontFamily: 'Nunito_500Medium',
                            color: '#6B7280',
                            textAlign: 'center',
                            marginBottom: 24,
                        }}>
                            Note: Pal accounts require a separate email from your User account.
                        </Text>

                        <CustomInput
                            placeholder="Full Name"
                            value={name}
                            onChangeText={setName}
                            editable={!loading}
                            icon={require('../../assets/images/user_icon.png')}
                        />

                        <CustomInput
                            placeholder="Email Address"
                            value={email}
                            onChangeText={setEmail}
                            editable={!loading}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            icon={require('../../assets/images/mail.png')}
                        />

                        <CustomInput
                            placeholder="Phone Number"
                            value={phone}
                            onChangeText={setPhone}
                            editable={!loading}
                            keyboardType="phone-pad"
                            icon={require('../../assets/images/phone_icon.png')}
                        />

                        {/* Date of Birth — tappable field that opens native picker */}
                        <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            disabled={loading}
                            style={{ marginBottom: 16 }}
                        >
                            <ImageBackground
                                source={require('../../assets/images/input-bg.png')}
                                style={{ paddingHorizontal: 24, paddingVertical: Platform.OS === 'ios' ? 11 : 8, flexDirection: 'row', alignItems: 'center' }}
                                imageStyle={{ borderRadius: 28 }}
                            >
                                <Image
                                    source={require('../../assets/images/calendar_icon.png')}
                                    style={{ width: 20, height: 20 }}
                                    resizeMode="contain"
                                />
                                <Text style={{
                                    fontSize: 12,
                                    fontFamily: 'Nunito_500Medium',
                                    color: dob ? '#111827' : '#4C4C4C',
                                    marginLeft: 16,
                                    flex: 1,
                                }}>
                                    {dob || 'Date of Birth'}
                                </Text>
                            </ImageBackground>
                        </TouchableOpacity>

                        {/* Android: inline picker */}
                        {showDatePicker && Platform.OS === 'android' && (
                            <DateTimePicker
                                value={dobDate}
                                mode="date"
                                display="default"
                                maximumDate={new Date()}
                                onChange={handleDateChange}
                            />
                        )}

                        {/* iOS: picker inside a modal with a Done button */}
                        {Platform.OS === 'ios' && (
                            <Modal
                                visible={showDatePicker}
                                transparent={true}
                                animationType="slide"
                            >
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
                                    activeOpacity={1}
                                    onPress={() => setShowDatePicker(false)}
                                />
                                <View style={{
                                    backgroundColor: 'white',
                                    borderTopLeftRadius: 20,
                                    borderTopRightRadius: 20,
                                    paddingBottom: 32,
                                }}>
                                    <TouchableOpacity
                                        onPress={() => setShowDatePicker(false)}
                                        style={{ alignSelf: 'flex-end', padding: 16 }}
                                    >
                                        <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#2563EB' }}>
                                            Done
                                        </Text>
                                    </TouchableOpacity>
                                    <DateTimePicker
                                        value={dobDate}
                                        mode="date"
                                        display="spinner"
                                        maximumDate={new Date()}
                                        minimumDate={new Date(1940, 0, 1)}
                                        onChange={handleDateChange}
                                        style={{ height: 200, backgroundColor: 'white' }}  // ADD backgroundColor
                                        textColor="black"   // ADD textColor — this is what was invisible
                                    />
                                </View>
                            </Modal>
                        )}

                        {/* Gender — tappable field, same pattern as date picker */}
                        <TouchableOpacity
                            onPress={() => !loading && setShowGenderPicker(true)}
                            disabled={loading}
                            style={{ marginBottom: 16 }}
                        >
                            <ImageBackground
                                source={require('../../assets/images/input-bg.png')}
                                style={{
                                    paddingHorizontal: 24,
                                    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
                                    flexDirection: 'row',
                                    alignItems: 'center'
                                }}
                                imageStyle={{ borderRadius: 28 }}
                            >
                                <Image
                                    source={require('../../assets/images/user_icon.png')}
                                    style={{ width: 20, height: 20 }}
                                    resizeMode="contain"
                                />
                                <Text style={{
                                    fontSize: 12,
                                    fontFamily: 'Nunito_500Medium',
                                    color: gender ? '#111827' : '#4C4C4C',
                                    marginLeft: 16,
                                    flex: 1,
                                }}>
                                    {gender || 'Select Gender'}
                                </Text>
                                <Image
                                    source={require('../../assets/images/chevron_down.png')}
                                    style={{ width: 16, height: 16 }}
                                    resizeMode="contain"
                                />
                            </ImageBackground>
                        </TouchableOpacity>

                        {/* Gender picker modal */}
                        <Modal
                            visible={showGenderPicker}
                            transparent={true}
                            animationType="slide"
                            onRequestClose={() => setShowGenderPicker(false)}
                        >
                            {/* Tap outside to dismiss */}
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
                                activeOpacity={1}
                                onPress={() => setShowGenderPicker(false)}
                            />

                            {/* Bottom sheet */}
                            <View style={{
                                backgroundColor: 'white',
                                borderTopLeftRadius: 24,
                                borderTopRightRadius: 24,
                                paddingBottom: 40,
                            }}>
                                {/* Header */}
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 16,
                                    borderBottomWidth: 1,
                                    borderBottomColor: '#F3F4F6',
                                }}>
                                    <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#111827' }}>
                                        Select Gender
                                    </Text>
                                    <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                                        <Text style={{ fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: '#2563EB' }}>
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Options */}
                                {['Male', 'Female'].map((option) => (
                                    <TouchableOpacity
                                        key={option}
                                        onPress={() => {
                                            setGender(option);
                                            setShowGenderPicker(false);
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
                                            fontFamily: gender === option ? 'Nunito_700Bold' : 'Nunito_500Medium',
                                            color: gender === option ? '#2563EB' : '#111827',
                                        }}>
                                            {option}
                                        </Text>
                                        {/* Checkmark for selected option */}
                                        {gender === option && (
                                            <Text style={{ color: '#2563EB', fontSize: 16 }}>✓</Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Modal>

                        <CustomInput
                            placeholder="Password"
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                            editable={!loading}
                            icon={require('../../assets/images/password_icon.png')}
                            rightIcon={
                                showPassword
                                    ? require('../../assets/images/visibility_off.png')
                                    : require('../../assets/images/visibility.png')
                            }
                            onRightIconPress={() => setShowPassword(!showPassword)}
                        />
                        {/* Password hint shown while typing */}
                        {password.length > 0 && (
                            <View style={{ marginTop: -8, marginBottom: 12, paddingHorizontal: 8 }}>
                                <Text style={{
                                    fontSize: 11,
                                    fontFamily: 'Nunito_500Medium',
                                    color: password.length >= 8 ? '#10B981' : '#EF4444',
                                }}>
                                    {password.length >= 8 ? '✓' : '✗'} At least 8 characters
                                </Text>
                                <Text style={{
                                    fontSize: 11,
                                    fontFamily: 'Nunito_500Medium',
                                    color: /[A-Z]/.test(password) ? '#10B981' : '#EF4444',
                                }}>
                                    {/[A-Z]/.test(password) ? '✓' : '✗'} At least one uppercase letter
                                </Text>
                                <Text style={{
                                    fontSize: 11,
                                    fontFamily: 'Nunito_500Medium',
                                    color: /[0-9]/.test(password) ? '#10B981' : '#EF4444',
                                }}>
                                    {/[0-9]/.test(password) ? '✓' : '✗'} At least one number
                                </Text>
                            </View>
                        )}

                        <CustomInput
                            placeholder="Confirm Password"
                            secureTextEntry={!showConfirmPassword}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            editable={!loading}
                            icon={require('../../assets/images/password_icon.png')}
                            rightIcon={
                                showConfirmPassword
                                    ? require('../../assets/images/visibility_off.png')
                                    : require('../../assets/images/visibility.png')
                            }
                            onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        />

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
                            <Checkbox
                                value={agreed}
                                onValueChange={setAgreed}
                                color={agreed ? '#2563eb' : undefined}
                                disabled={loading}
                            />
                            <Text style={{ fontSize: 12, fontFamily: 'Nunito_500Medium', color: '#6B7280', marginLeft: 12, flex: 1 }}>
                                I agree to the{' '}
                                <Text style={{ color: '#2563EB', fontFamily: 'Nunito_700Bold' }}>Terms & Conditions</Text>
                                {' '}and{' '}
                                <Text style={{ color: '#2563EB', fontFamily: 'Nunito_700Bold' }}>Privacy Policy</Text>
                            </Text>
                        </View>

                        <CustomButton
                            title="Create Pal Account"
                            onPress={handleCreateAccount}
                            loading={loading}
                        />

                        <TouchableOpacity
                            onPress={() => router.push('/auth/login')}
                            style={{ marginTop: 16 }}
                            disabled={loading}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 12, fontFamily: 'Nunito_500Medium', color: '#6B7280' }}>
                                    Already have an account?{' '}
                                </Text>
                                <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: '#2563EB' }}>
                                    Sign In Here
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ImageBackground>
        </View>
    );
}