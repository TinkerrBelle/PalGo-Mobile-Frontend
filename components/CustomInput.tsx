import React from 'react';
import { View, TextInput, Image, ImageBackground, TextInputProps, ImageSourcePropType, TouchableOpacity } from 'react-native';

interface CustomInputProps extends TextInputProps {
    icon?: ImageSourcePropType;
    rightIcon?: ImageSourcePropType;
    onRightIconPress?: () => void;
}

export default function CustomInput({
                                        icon,
                                        rightIcon,
                                        onRightIconPress,
                                        ...textInputProps
                                    }: CustomInputProps) {
    return (
        <View className="mb-4">
            <ImageBackground
                source={require('../assets/images/input-bg.png')}
                className="w-full flex-row items-center"
                imageStyle={{borderRadius: 28}}
                style={{paddingHorizontal: 24}}
            >
                {icon && (
                    <Image
                        source={icon}
                        className="w-5 h-5"
                        //style={{ width: icon ? 20 : 0, height: icon ? 20 : 0 }}

                    />
                )}

                <TextInput
                    placeholderTextColor="#9C9C9C"
                    className={`flex-1 ${icon ? 'px-4' : 'pr-4 pl-0'} py-3 android:py-2.5 text-black dark:text-white text-xs font-nunito-medium`}
                    {...textInputProps}
                />

                {rightIcon && (
                    <TouchableOpacity onPress={onRightIconPress}
                        //className="p-2"
                    >
                        <Image
                            source={rightIcon}
                            //className="w-5 h-5"
                        />
                    </TouchableOpacity>
                )}
            </ImageBackground>
        </View>
    );
}