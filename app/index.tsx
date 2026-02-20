import { Text, View, ActivityIndicator  } from "react-native";
import {Link, router } from "expo-router";
import { useAuth } from '@/context/AuthContext';
import { useEffect } from "react";

export default function Index() {
    const { isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            if (isAuthenticated){
                // User is logged in, redirect to home
                //router.replace('//(tabs)/home');
                router.replace('/home');

            } else {
                // User not logged in, stay on this page or show onboarding
                // You can add onboarding UI here
            }
        }
    }, [isLoading, isAuthenticated]);

    if (isLoading) {
        return (
            <View className="flex-1 justify-center align-middle ">
                <ActivityIndicator size="large" />
            </View>
        )
    }
  return (
    <View className="flex-1 justify-center items-center">
      <Text className="text-5xl text-light-200 font-bold">Edit app/index.tsx to edit this screen.</Text>
        <Link href="/onboarding">Onboarding</Link>
    </View>
  );
}
