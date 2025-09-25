// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { UserStatsProvider } from '../contexts/UserStatsContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useEffect, useState } from 'react';
import { ModalHost, overrideAlert } from '../utils/modalService';
import { LoadingScreen } from '../components/LoadingScreen';
import { initializePerformanceOptimizations } from '../utils/performance';
import { initializeNotifications, getPushToken, registerPushToken } from '../firebase/pushNotifications';
import { startProximityNotificationListener } from '../utils/proximityNotifications';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/firebaseConfig';

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

    // Start proximity notification listener only when user is authenticated, but defer on web
    if (user && !proximityListener) {
      // Defer on web to avoid init delays
      if (typeof window !== 'undefined') {
        // On web/PWA, start after a short delay or use lighter polling
        const timer = setTimeout(() => {
          console.log('Starting deferred proximity notification listener for web user');
          const unsubscribe = startProximityNotificationListener();
          setProximityListener(() => unsubscribe);
        }, 5000); // 5 second delay

        return () => clearTimeout(timer);
      } else {
        // Native: start immediately
        console.log('Starting proximity notification listener for authenticated user');
        const unsubscribe = startProximityNotificationListener();
        setProximityListener(() => unsubscribe);
      }

      // Register web push token for authenticated users (only if permission granted)
      // Disabled automatic registration on startup to avoid non-user-gesture permission flows
      // and crashes seen in some environments when messaging tries to access push subscription
      // before a service worker registration exists. Token registration is handled from Settings
      // (user gesture) and via the Permissions API watcher added there.
      console.log('Automatic push registration skipped on startup; use Settings -> Enable Notifications to register token.');
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
      const currentPath = segments.join('/');
      const isOnProfilePage = currentPath.includes('profile');
      const isOnHomePage = currentPath === '(app)/(tabs)' || currentPath === '(app)' || segments.length === 1;

      console.log('=== REDIRECT LOGIC DEBUG ===');
      console.log('Current path:', currentPath);
      console.log('Is on profile page:', isOnProfilePage);
      console.log('Is on home page:', isOnHomePage);
      console.log('User profile:', userProfile);
      console.log('Profile complete:', userProfile?.profileComplete);

      if (userProfile && userProfile.profileComplete === false && inAppGroup && !isOnProfilePage) {
        // User profile exists but not complete, redirect to profile setup (but not if already on profile page)
        console.log('User profile not complete, redirecting to profile setup...');
        router.replace('/(app)/profile/setup');
      } else if (!userProfile && inAppGroup && !isOnProfilePage) {
        // User profile doesn't exist (Google sign-in), redirect to profile setup
        console.log('User profile missing, redirecting to profile setup...');
        router.replace('/(app)/profile/setup');
      } else if (userProfile && userProfile.profileComplete === true && !inAppGroup && !inAuthGroup) {
        // User profile complete and not on auth screens, redirect to main app
        console.log('User profile complete, redirecting to main app...');
        router.replace('/(app)/(tabs)');
      } else if (userProfile && userProfile.profileComplete === true && inAppGroup && isOnHomePage) {
        // User is on home page with completed profile - this is correct, do nothing
        console.log('User on home page with completed profile - no redirect needed');
      } else if (userProfile && userProfile.profileComplete === true && inAppGroup && currentPath.includes('/profile/setup')) {
        // User has completed profile and is currently on profile setup page, redirecting to main app
        console.log('User profile complete and on profile setup page, redirecting to main app...');
        router.replace('/(app)/(tabs)');
      }
      // Removed async fresh check to avoid delays; rely on AuthContext profile
      // Don't redirect users who are already on profile page with completed profiles
      // They should be able to modify their profile freely
      // If user is verified and in app group, or unverified and on auth screens, do nothing
    } else if (inAppGroup) {
      // User not authenticated but trying to access app
      console.log('User not authenticated, redirecting to login...');
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
    // Warm up Firebase Auth SDK early (guarded for browser)
    if (typeof window !== 'undefined') {
      try {
        // Access auth.currentUser synchronously to warm the SDK without network calls
        // This does not attach listeners or perform network I/O.
        const _ = auth?.currentUser;
        console.log('Firebase auth warmed');
      } catch (e) {
        console.warn('Error warming Firebase auth', e);
      }

      // Dynamically add PWA manifest link if not present (for Expo web compatibility)
      const existingLink = document.querySelector('link[rel="manifest"]');
      if (!existingLink && typeof document !== 'undefined') {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.json';
        document.head.appendChild(link);
        console.log('PWA manifest link dynamically added');
      }

      // Add apple-touch-icon if not present
      const existingAppleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!existingAppleIcon && typeof document !== 'undefined') {
        const appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        appleIcon.href = '/icon-192.png';
        document.head.appendChild(appleIcon);
        console.log('Apple touch icon dynamically added');
      }

      // Add theme color meta if not present
      const existingThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!existingThemeColor && typeof document !== 'undefined') {
        const themeColor = document.createElement('meta');
        themeColor.name = 'theme-color';
        themeColor.content = '#E53E3E';
        document.head.appendChild(themeColor);
        console.log('Theme color meta dynamically added');
      }
    }

    // Initialize performance optimizations on app start
    initializePerformanceOptimizations();

    // Initialize push notifications
    initializeNotifications();

    // Override RN Alert to show app modal instead
    overrideAlert();

    // Note: Proximity notification listener will be started in InitialLayout
    // after authentication is confirmed
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <UserStatsProvider>
            <InitialLayout />
            <ModalHost />
          </UserStatsProvider>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
