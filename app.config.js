export default {
    "expo": {
        "name": "pal_go",
        "slug": "pal_go",
        "version": "1.0.0",
        "orientation": "portrait",
        "icon": "./assets/images/icon.png",
        "scheme": "palgo",
        "userInterfaceStyle": "light",
        "newArchEnabled": true,
        "ios": {
            "supportsTablet": true,
            config: {
                googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
            }
        },
        "android": {
            "adaptiveIcon": {
                "backgroundColor": "#E6F4FE",
                "foregroundImage": "./assets/images/android-icon-foreground.png",
                "backgroundImage": "./assets/images/android-icon-background.png",
                "monochromeImage": "./assets/images/android-icon-monochrome.png"
            },
            "edgeToEdgeEnabled": true,
            "predictiveBackGestureEnabled": false,
            config: {
                googleMaps: {
                    apiKey: process.env.GOOGLE_MAPS_API_KEY,
                }
            }
        },
        "web": {
            "output": "static",
            "favicon": "./assets/images/favicon.png"
        },
        "plugins": [
            "expo-router",
            [
                "expo-location",
                {
                    locationAlwaysAndWhenInUsePermission: "PalGo needs your location to show nearby Pals and track your errand.",
                    locationWhenInUsePermission: "PalGo needs your location to show nearby Pals and track your errand."
                }
            ],
            [
                "expo-splash-screen",
                {
                    "image": "./assets/images/splash-icon.png",
                    "imageWidth": 200,
                    "resizeMode": "contain",
                    "backgroundColor": "#ffffff",
                    "dark": {
                        "backgroundColor": "#000000"
                    }
                }
            ],
            [
                "expo-image-picker",
                {
                    "photosPermission": "PalGo needs access to your photos to upload your profile picture and ID document.",
                    "cameraPermission": "PalGo needs camera access to take your profile picture and scan your ID document."
                }
            ],
            "expo-font",
            "expo-secure-store",
            "@react-native-community/datetimepicker"
        ],
        "experiments": {
            "typedRoutes": true,
            "reactCompiler": true
        }
    }
}

