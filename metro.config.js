const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Permite que o bundler do Expo leia os binários WASM que o expo-sqlite usa na web
config.resolver.assetExts.push('wasm');

module.exports = config;
