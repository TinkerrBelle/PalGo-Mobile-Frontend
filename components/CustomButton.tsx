import React from 'react';
import {ActivityIndicator, ImageBackground, ImageSourcePropType, Text, TouchableOpacity, View} from 'react-native';

interface CustomButtonProps {
    loading?: boolean;
    disabled?: boolean;
    onPress?: () => void;
    width?: number;
    height?: number;
    backgroundImage?: ImageSourcePropType;
    textClassName?: string;
    title: string;
    loadingColor?: string;
    resizeMode?: 'stretch' | 'cover' | 'contain' | 'repeat' | 'center'; // ADD THIS
}

export default function CustomButton({
    loading = false,
    disabled = false,
    onPress,
    title,
    width = 258,
    height = 40,
    backgroundImage = require('../assets/images/btn.png'),
    loadingColor = "#ffffff",
     resizeMode = "stretch", // default keeps existing buttons working
     textClassName = "text-white text-center font-nunito-semibold text-xs",
     }  : CustomButtonProps)
{
    return (
        <View className="items-center">
            <ImageBackground source={backgroundImage}
                             resizeMode={resizeMode}
                             style={{width,
                                 height}}
            >
                <TouchableOpacity
                    className="flex-1 items-center justify-center"
                    disabled={loading || disabled}
                    onPress={onPress}>
                    {loading ? (
                        <ActivityIndicator color={loadingColor} size="small" />
                    ) : (
                        <Text className={textClassName}>
                            {title}
                        </Text>
                    )}
                </TouchableOpacity>
            </ImageBackground>
        </View>

    )
}