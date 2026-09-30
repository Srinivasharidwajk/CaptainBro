import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { RiderAuthProvider } from '../context/RiderAuthContext';
import { RiderOrderProvider } from '../context/RiderOrderContext';

export default function RiderRootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" translucent={false} />
      <RiderAuthProvider>
        <RiderOrderProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0F172A' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" options={{ animation: 'none' }} />
            <Stack.Screen name="auth/login" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="history" options={{ animation: 'slide_from_right' }} />
          </Stack>
        </RiderOrderProvider>
      </RiderAuthProvider>
    </SafeAreaProvider>
  );
}
