// app/(app)/_layout.tsx
import { useAuth } from '../contexts/AuthContext';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function AppLayout() {
  const { user, userProfile, loading } = useAuth(); // Destructure userProfile here

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </View>
    );
  }

  // If user is not logged in, redirect to login page
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // If user is logged in but their profile is not complete, redirect to profile setup
  if (user && userProfile && !userProfile.profileComplete) {
      return <Redirect href="/(app)/profile/setup" />;
  }

  // If user is logged in and profile is complete, render the app content
  return <Stack screenOptions={{ headerShown: false }} />;
}