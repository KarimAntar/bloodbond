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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

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
      } else if (inAppGroup && currentPath.includes('/profile/setup') && userProfile) {
        // If user is on profile setup page and has a profile, check if it's complete by fetching fresh data
        const checkProfileComplete = async () => {
          try {
            const userDocRef = doc(db, 'users', user?.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const freshProfile = userDocSnap.data();
              if (freshProfile?.profileComplete === true) {
                console.log('Fresh profile check: profile is complete, redirecting to main app...');
                router.replace('/(app)/(tabs)');
              }
            }
          } catch (error) {
            console.error('Error checking fresh profile:', error);
          }
        };
        checkProfileComplete();
      }
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
