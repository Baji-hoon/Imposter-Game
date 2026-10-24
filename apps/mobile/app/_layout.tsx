import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
} from '@expo-google-fonts/archivo';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { tokens } from '@imposter/shared';

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutContent() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: tokens.colors.cream,
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="gallery" options={{ headerShown: false }} />
        <Stack.Screen name="design-gallery" options={{ headerShown: false }} />
        <Stack.Screen
          name="spike"
          options={{
            headerShown: true,
            title: 'LAN Spike Diagnostics',
            headerStyle: {
              backgroundColor: tokens.colors.paper,
            },
            headerTintColor: tokens.colors.ink,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    AbrilFatface_400Regular,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Archivo_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);



  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}
