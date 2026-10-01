import '../../global.css';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
// Per-weight subpath imports so Metro bundles only the eight faces the app uses (see tokens.ts `font`).
import { PlayfairDisplay_900Black } from '@expo-google-fonts/playfair-display/900Black';
import { PlayfairDisplay_900Black_Italic } from '@expo-google-fonts/playfair-display/900Black_Italic';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono/700Bold';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { hydrateThemePreference, migrate, storage, useCourseStore, useHistoryStore, usePreferences, useProfileStore, useRoundStore } from '@/store';
import { Button, Text } from '@/components/ui';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { c, scheme } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_900Black,
    PlayfairDisplay_900Black_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });
  const roundHydrated = useRoundStore((s) => s.hydrated);
  const courseHydrated = useCourseStore((s) => s.hydrated);
  const historyHydrated = useHistoryStore((s) => s.hydrated);
  const profilesHydrated = useProfileStore((s) => s.hydrated);
  const hydrateRound = useRoundStore((s) => s.hydrate);
  const hydrateCourses = useCourseStore((s) => s.hydrate);
  const hydrateHistory = useHistoryStore((s) => s.hydrate);
  const hydratePreferences = usePreferences((s) => s.hydrate);
  const hydrateProfiles = useProfileStore((s) => s.hydrate);

  const [migrated, setMigrated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await migrate(storage);
      } catch {
        // Stores hydrate best-effort; an unreadable value is dropped there.
      }
      // Preferences first: the round store's fresh draft reads the default stake label and allowance.
      await hydratePreferences();
      if (cancelled) return;
      setMigrated(true);
      void hydrateRound();
      void hydrateCourses();
      void hydrateHistory();
      void hydrateProfiles();
      void hydrateThemePreference();
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateRound, hydrateCourses, hydrateHistory, hydratePreferences, hydrateProfiles]);

  const ready = (fontsLoaded || !!fontError) && migrated && roundHydrated && courseHydrated && historyHydrated && profilesHydrated;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: c.surface }} />;
  }

  return (
    <SafeAreaProvider>
      <PhoneFrame>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.surface },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="new-round" />
          <Stack.Screen name="round" options={{ gestureEnabled: false }} />
          <Stack.Screen name="settings" />
        </Stack>
      </PhoneFrame>
    </SafeAreaProvider>
  );
}

/**
 * Dev-only: on web, render inside a 402×874 iPhone-sized frame so browser previews match the
 * mockup frame. On iOS and in phone-sized windows this is a passthrough.
 */
function PhoneFrame({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  // Native, or a phone-sized browser (real mobile web, screenshot capture): no frame.
  if (Platform.OS !== 'web' || width < 500) return <>{children}</>;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.scrim }}>
      <View
        style={{
          width: 402,
          height: 874,
          maxHeight: '100%',
          overflow: 'hidden',
          borderRadius: 40,
          borderWidth: 6,
          borderColor: c.textPrimary,
          backgroundColor: c.surface,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * Last line of defence: a render error anywhere shows this instead of a white screen.
 * The round is already persisted on every tap, so "Try again" loses nothing.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <Text step="display" align="center">
        Something went wrong.
      </Text>
      <Text tone="secondary" align="center">
        Your scores are saved. Try again, and if it keeps happening, start from Home.
      </Text>
      <Text step="caption" tone="secondary" tabular={false} align="center" numberOfLines={3}>
        {error.message}
      </Text>
      <Button label="Try again" onPress={retry} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}
