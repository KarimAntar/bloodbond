// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

const InitialLayout = () => {
  const { user, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log('=== ROOT LAYOUT NAVIGATION CHECK ===');
    console.log('Initializing:', initializing);
    console.log('User exists:', !!user);
    console.log('User email verified:', user?.emailVerified);
    console.log('Current segments:', segments);

    // Wait until the auth state is no longer initializing.
    if (initializing) {
      console.log('Still initializing, skipping navigation logic');
      return;
    }

    const inAppGroup = segments[0] === '(app)';
    console.log('In app group:', inAppGroup);

    if (user) {
      console.log('User is authenticated');
      if (!user.emailVerified) {
        console.log('User email not verified');
        // BUT, their email is not verified.
        // If they are trying to access a protected part of the app,
        // send them back to the login screen, which will prompt for verification.
        if (inAppGroup) {
          console.log('Redirecting to login for email verification');
          router.replace('/(auth)/login');
        }
      } else if (!inAppGroup) {
        console.log('User verified but not in app group, redirecting to app');
        // User is authenticated AND verified.
        // If they are on a page in the (auth) group (e.g., login), send them into the app.
        router.replace('/(app)/(tabs)');
      } else {
        console.log('User is authenticated and verified, staying in app');
      }
    } else if (inAppGroup) {
      console.log('User not authenticated but in app group, redirecting to login');
      // User is not authenticated.
      // If they are trying to access a protected part of the app, redirect to login.
      router.replace('/(auth)/login');
    } else {
      console.log('User not authenticated and not in app group, staying on auth screens');
    }
  }, [user, initializing, segments, router]);

  // Show a loading screen while we determine the correct route
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
})
