import '../../global.css';
import { useEffect, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
// Per-weight subpath imports so Metro bundles only the four faces the app uses.
import { FamiljenGrotesk_700Bold } from '@expo-google-fonts/familjen-grotesk/700Bold';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useCourseStore, useRoundStore } from '@/store';
import { Button, Text } from '@/components/ui';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { c, scheme } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    FamiljenGrotesk_700Bold,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const roundHydrated = useRoundStore((s) => s.hydrated);
  const courseHydrated = useCourseStore((s) => s.hydrated);
  const hydrateRound = useRoundStore((s) => s.hydrate);
  const hydrateCourses = useCourseStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateRound();
    void hydrateCourses();
  }, [hydrateRound, hydrateCourses]);

  const ready = (fontsLoaded || !!fontError) && roundHydrated && courseHydrated;

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
          <Stack.Screen name="index" />
          <Stack.Screen name="new-round" />
          <Stack.Screen name="round" options={{ gestureEnabled: false }} />
        </Stack>
      </PhoneFrame>
    </SafeAreaProvider>
  );
}

/**
 * Dev-only: on web, render inside a 393×852 iPhone-sized frame so browser previews match the
 * design frame. On iOS this is a passthrough.
 */
function PhoneFrame({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.scrim }}>
      <View
        style={{
          width: 393,
          height: 852,
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
