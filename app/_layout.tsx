// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import * as SplashScreen from 'expo-splash-screen';
import { SessionProvider, useSession } from '../lib/session-context';
import { FONT_BEBAS } from '../lib/constants';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [FONT_BEBAS]: BebasNeue_400Regular,
  });

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <AppShell fontsReady={fontsLoaded || !!fontError} />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function AppShell({ fontsReady }: { fontsReady: boolean }) {
  const { loading: sessionLoading } = useSession();

  // Hide splash only when both fonts AND session state are resolved.
  useEffect(() => {
    if (fontsReady && !sessionLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady, sessionLoading]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
