const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
    input: "./app/globals.css", // path to your global.css (required)
    configPath: "./tailwind.config.js", // optional: custom path to tailwind config
    inlineRem: 16, // optional: base rem size (default is 16)
});




// // Learn more https://docs.expo.io/guides/customizing-metro
// const { getDefaultConfig } = require('expo/metro-config');
//
// /** @type {import('expo/metro-config').MetroConfig} */
// const config = getDefaultConfig(__dirname);
//
// module.exports = config;
