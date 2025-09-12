// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { UserStatsProvider } from '../contexts/UserStatsContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useEffect, useState } from 'react';
import { LoadingScreen } from '../components/LoadingScreen';
import { initializePerformanceOptimizations } from '../utils/performance';
import { initializeNotifications } from '../firebase/pushNotifications';
import { startProximityNotificationListener } from '../utils/proximityNotifications';

const InitialLayout = () => {
  const { user, userProfile, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [proximityListener, setProximityListener] = useState<(() => void) | null>(null);

  useEffect(() => {
    // Wait until the auth state is no longer initializing.
    if (initializing) {
      return;
    }

    // Start proximity notification listener only when user is authenticated
    if (user && !proximityListener) {
      console.log('Starting proximity notification listener for authenticated user');
      const unsubscribe = startProximityNotificationListener();
      setProximityListener(() => unsubscribe);
    } else if (!user && proximityListener) {
      // Clean up listener when user logs out
      console.log('Stopping proximity notification listener');
      proximityListener();
      setProximityListener(null);
    }

    const inAppGroup = segments[0] === '(app)';
    const inAuthGroup = segments[0] === '(auth)';

    // Only handle authentication redirects, don't interfere with normal navigation
    if (user) {
      // User is authenticated
      if ((userProfile && (userProfile.profileComplete === false || userProfile.profileComplete === undefined) || (user && !userProfile)) && inAppGroup) {
        // User profile not complete or doesn't exist (Google sign-in), redirect to profile setup
        console.log('User profile not complete or missing, redirecting to profile edit...');
        router.replace('/(app)/profile/edit');
      } else if (userProfile && userProfile.profileComplete === true && !inAppGroup && !inAuthGroup) {
        // User profile complete and not on auth screens, redirect to main app
        router.replace('/(app)/(tabs)');
      } else if (!user.emailVerified && inAppGroup) {
        // User email not verified but trying to access app
        router.replace('/(auth)/login');
      }
      // If user is verified and in app group, or unverified and on auth screens, do nothing
    } else if (inAppGroup) {
      // User not authenticated but trying to access app
      router.replace('/(auth)/login');
    }
    // If user not authenticated and on auth screens, do nothing
  }, [user, userProfile, initializing, segments, proximityListener]);

  // Show a loading screen only while initializing
  if (initializing) {
    return <LoadingScreen message="Setting up BloodBond..." />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
};

export default function RootLayout() {
  useEffect(() => {
    // Initialize performance optimizations on app start
    initializePerformanceOptimizations();

    // Initialize push notifications
    initializeNotifications();

    // Note: Proximity notification listener will be started in InitialLayout
    // after authentication is confirmed
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <UserStatsProvider>
            <InitialLayout />
          </UserStatsProvider>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
