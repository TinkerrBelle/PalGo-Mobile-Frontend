/** @type {import('tailwindcss').Config} */
module.exports = {
  // content: ["./app/**/*.{js,jsx,ts,tsx}"],
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
  theme: {
    extend: {
        fontFamily: {
            nunito: ['Nunito_400Regular'],
            'nunito-medium': ['Nunito_500Medium'],
            'nunito-semibold': ['Nunito_600SemiBold'],
            'nunito-bold': ['Nunito_700Bold'],
        },
        colors: {
            primary: '#2563EB',
            secondary: '#030014',
            light: {
                100: '#030014',
                200: '#030014',
            },
            accent: {
                100: '#4C4C4C',
            }
        }
    },
  },
  plugins: [],
}

