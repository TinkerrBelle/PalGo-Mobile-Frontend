import { Stack } from 'expo-router';
import { useFonts, Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import './globals.css';
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
    const { isLoading, isAuthenticated, checkAuth, user } = useAuth();
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

    useEffect(() => {
        const initializeApp = async () => {
            const rememberMe = await SecureStore.getItemAsync('rememberMe');
            console.log('Remember me preference:', rememberMe);

            // Only clear tokens if user explicitly chose NOT to be remembered
            if (rememberMe === 'false') {
                console.log('Remember me is off - clearing tokens');
                await SecureStore.deleteItemAsync('accessToken');
                await SecureStore.deleteItemAsync('refreshToken');
            }

            const seen = await SecureStore.getItemAsync('hasSeenOnboarding');
            setHasSeenOnboarding(seen === 'true');

            await checkAuth();
        };

        initializeApp();
    }, []);

    useEffect(() => {
        if (!isLoading && hasSeenOnboarding !== null) {
            SplashScreen.hideAsync();

            if (isAuthenticated) {
                const role = user?.role;
                if (role === 'Customer') {
                    router.replace('/(customer)/home');
                } else if (role === 'Runner') {
                    if (user?.palStatus === 'Approved') {
                        router.replace('/(pal)/home');
                    } else if (user?.palStatus === 'Rejected') {
                        router.replace('/auth/rejected');
                    } else {
                        router.replace('/auth/pending-approval');
                    }
                }
            } else if (hasSeenOnboarding) {
                router.replace('/auth/login');
            } else {
                router.replace('/');
            }
        }
    }, [isLoading, isAuthenticated, hasSeenOnboarding]);

    if (isLoading || hasSeenOnboarding === null) {
        return null;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/create-account" />
            <Stack.Screen name="auth/verify-email" />
            <Stack.Screen name="(customer)" />
            <Stack.Screen name="(pal)" />
            <Stack.Screen name="auth/create-account-pal" />
            <Stack.Screen name="auth/verify-phone" />
            <Stack.Screen name="auth/id-verification" />
            <Stack.Screen name="auth/occupation" />
            <Stack.Screen name="auth/pending-approval" />
            <Stack.Screen name="auth/rejected" />
            <Stack.Screen name="auth/reapply" />
            <Stack.Screen name="auth/forgot-password" />
            <Stack.Screen name="auth/reset-password" />
        </Stack>
    );
}

export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        Nunito_400Regular,
        Nunito_600SemiBold,
        Nunito_700Bold,
        Nunito_500Medium,
    });

    if (!fontsLoaded && !fontError) {
        return null;
    }

    return (
        <AuthProvider>
            <RootLayoutNav />
        </AuthProvider>
    );
}