const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

// Sentry's Expo config is Expo's default plus debug IDs, so crash stack traces map back to source.
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
