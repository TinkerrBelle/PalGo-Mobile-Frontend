import { Stack } from 'expo-router';
import { useFonts, Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import './globals.css';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

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

    useEffect(() => {
        if (fontsLoaded || fontError) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError]);

    if (!fontsLoaded && !fontError) {
        return null;
    }

    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            {/* Add other screens as needed */}
        </Stack>
    );
}

// import { Stack } from "expo-router";
// import './globals.css';
//
// export default function RootLayout() {
//   return <Stack />;
// }
