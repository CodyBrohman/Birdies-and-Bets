import type { ExpoConfig, ConfigContext } from 'expo/config';

// Store display name is "Birdies & Bets: Golf Scorecard" (set in App Store Connect).
// The home-screen name is the short brand.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Birdies & Bets',
  slug: 'birdies-and-bets',
  owner: 'dodger1123s-team',
  version: '0.1.0',
  scheme: 'birdiesandbets',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.birdiesandbets.app',
    supportsTablet: false,
    infoPlist: {
      UIRequiresFullScreen: true,
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
        backgroundColor: '#EEF0F7',
        dark: { backgroundColor: '#161826' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: { projectId: 'f833d42f-93f8-4a00-ba9d-fae063662729' },
  },
  updates: {
    url: 'https://u.expo.dev/f833d42f-93f8-4a00-ba9d-fae063662729',
  },
  runtimeVersion: {
    policy: 'sdkVersion',
  },
});
