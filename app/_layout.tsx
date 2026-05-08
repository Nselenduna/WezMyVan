import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/store/auth.store';

SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const { session, profile, isLoading, loadSession } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/' as any);
      return;
    }

    // Session exists but profile not yet loaded — wait for next render.
    if (!profile) return;

    if (profile.role === 'customer' && segments[0] !== '(customer)') {
      router.replace('/(customer)/' as any);
    } else if (profile.role === 'van_operator' && segments[0] !== '(van)') {
      router.replace('/(van)/' as any);
    }
  }, [session, profile, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(van)" />
    </Stack>
  );
}
