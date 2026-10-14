const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Sentry's Expo config is Expo's default plus debug IDs, so crash stack traces map back to source.
module.exports = getSentryExpoConfig(__dirname);
