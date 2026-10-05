import type { ExpoConfig, ConfigContext } from 'expo/config';

// Store display name is "Birdies & Bets: Golf Scorecard" (set in App Store Connect).
// The home-screen name is the short brand.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Birdies & Bets',
  slug: 'birdies-and-bets',
  owner: 'dodger1123s-team',
  version: '1.0.0',
  scheme: 'birdiesandbets',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.birdiesandbets.app',
    supportsTablet: false,
    infoPlist: {
      UIRequiresFullScreen: true,
      ITSAppUsesNonExemptEncryption: false,
    },
    // AsyncStorage/MMKV touch UserDefaults and file timestamps; declare the approved reasons.
    privacyManifests: {
      NSPrivacyTracking: false,
      // Anonymous crash reports (Sentry, on by default) and opt-in usage counts (Aptabase). Neither is linked to the user or used for tracking.
      NSPrivacyCollectedDataTypes: [
        { NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeCrashData', NSPrivacyCollectedDataTypeLinked: false, NSPrivacyCollectedDataTypeTracking: false, NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] },
        { NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeProductInteraction', NSPrivacyCollectedDataTypeLinked: false, NSPrivacyCollectedDataTypeTracking: false, NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAnalytics'] },
      ],
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1'] },
      ],
    },
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#F5F4EC',
      },
    ],
    // Source maps and debug symbols upload at build time when SENTRY_AUTH_TOKEN is set (SENTRY_DISABLE_AUTO_UPLOAD skips it).
    ['@sentry/react-native', { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT }],
    ['expo-image-picker', { photosPermission: 'Birdies & Bets uses a photo you pick as your profile picture. It stays on this device.', cameraPermission: false, microphonePermission: false }],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: { projectId: 'f833d42f-93f8-4a00-ba9d-fae063662729' },
  },
  updates: {
    url: 'https://u.expo.dev/f833d42f-93f8-4a00-ba9d-fae063662729',
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  },
  // Fingerprint: an OTA update can only reach binaries with the same native modules.
  // EXPO_GO_UPDATE=1 (npm run update:expo-go) targets Expo Go instead, which only loads "exposdk:<sdk>" runtimes.
  runtimeVersion: process.env.EXPO_GO_UPDATE === '1' ? 'exposdk:57.0.0' : { policy: 'fingerprint' },
});
