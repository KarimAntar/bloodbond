// app/(app)/_layout.tsx
import { useAuth } from '../contexts/AuthContext';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </View>
    );
  }

  if (!user) {
    // Redirect to the login page if the user is not authenticated.
    return <Redirect href="/auth/login" />;
  }

  // This layout can be a Stack that holds all your authenticated screens.
  // We are hiding the header here to let child navigators manage their own.
  return <Stack screenOptions={{ headerShown: false }} />;
}