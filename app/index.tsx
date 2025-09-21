import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

export default function Index() {
  const { user, userProfile, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    if (user && userProfile?.profileComplete) {
      router.replace('/(app)/(tabs)');
    } else if (user) {
      router.replace('/(app)/profile/setup');
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, userProfile, initializing]);

  if (initializing) {
    return null; // Or a loading component
  }

  return <Redirect href="/(auth)/login" />; // Fallback
}
