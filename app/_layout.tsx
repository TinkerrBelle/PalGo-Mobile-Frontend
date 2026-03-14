import { Stack } from 'expo-router';
import { useFonts, Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import './globals.css';
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';



// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutNav(){
    //const { isLoading, isAuthenticated } = useAuth();
    const { isLoading, isAuthenticated, checkAuth, user } = useAuth();
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

    useEffect(() => {
        const initializeApp = async () => {
            // Step 1: Check if user had "remember me" turned on
            const rememberMe = await SecureStore.getItemAsync('rememberMe');
            console.log('Remember me preference:', rememberMe);

            // Step 2: If remember me is NOT 'true', clear their tokens
            // This forces them to log in again but they won't see onboarding
            if (rememberMe !== 'true') {
                console.log('Remember me is off - clearing tokens');
                await SecureStore.deleteItemAsync('accessToken');
                await SecureStore.deleteItemAsync('refreshToken');
                // NOTE: We do NOT delete 'rememberMe' or 'hasSeenOnboarding'
                // We keep those so we know they've used the app before
            }

            // Step 3: Check if they've seen onboarding before
            const seen = await SecureStore.getItemAsync('hasSeenOnboarding');
            setHasSeenOnboarding(seen === 'true');

            // NOW trigger auth check, after tokens are cleared if needed
            await checkAuth();
        };

        initializeApp();
    }, []);

    useEffect(() => {
        // Wait for both checks to complete
        if (!isLoading && hasSeenOnboarding !== null) {
            SplashScreen.hideAsync();

            if (isAuthenticated) {
                //router.replace('/(tabs)/home');
                const role = user?.role;
                if (role === 'Customer') {
                    router.replace('/(customer)/home');
                } else if (role === 'Runner') {
                    router.replace('/(pal)/home');  // we'll create this next
                }
            } else if (hasSeenOnboarding) {
                // Seen onboarding before, go straight to login
                router.replace('/auth/login');
                //router.replace('/');
            } else {
                // First time user, show onboarding
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
            {/*<Stack.Screen name="(tabs)" options={{ headerShown: false }} />*/}
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
            {/*<Stack.Screen name="index" />*/}
            {/*<Stack.Screen name="auth" />*/}
            {/*<Stack.Screen name="(tabs)" />*/}
        </Stack>
    );
}

export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        Nunito_400Regular,
        Nunito_600SemiBold,
        Nunito_700Bold,
        Nunito_500Medium,
        // You can add more Nunito weights if needed:
        // Nunito_300Light,
        // Nunito_800ExtraBold,
        // Nunito_900Black,
    });


    if (!fontsLoaded && !fontError) {
        return null;
    }

    return (
        <AuthProvider>
            <RootLayoutNav />
        </AuthProvider>
        // <Stack>
        //     <Stack.Screen name="index" options={{ headerShown: false }} />
        //     <Stack.Screen name="auth" options={{ headerShown: false }} />
        // </Stack>
    );
}

// import { Stack } from "expo-router";
// import './globals.css';
//
// export default function RootLayout() {
//   return <Stack />;
// }
