import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { OrderProvider } from '../context/OrderContext';

export default function RootLayout() {
  const stackContent = (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="products" options={{ animation: 'none' }} />
      <Stack.Screen name="product/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="explore" options={{ animation: 'none' }} />
      <Stack.Screen name="cart" options={{ animation: 'none' }} />
      <Stack.Screen name="checkout" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="orders" options={{ animation: 'none' }} />
      <Stack.Screen name="order-tracking/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="profile" options={{ animation: 'none' }} />
      <Stack.Screen name="auth/login" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="auth/register" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <AuthProvider>
        <CartProvider>
          <OrderProvider>
            {Platform.OS === 'web' ? (
              <View style={webStyles.outerWrapper}>
                <View style={webStyles.mobileFrame}>
                  {stackContent}
                </View>
              </View>
            ) : (
              stackContent
            )}
          </OrderProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const webStyles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  mobileFrame: {
    width: '100%',
    maxWidth: 480,
    height: '100%',
    maxHeight: 932,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    borderRadius: Platform.OS === 'web' ? 12 : 0,
    overflow: 'hidden',
  },
});

