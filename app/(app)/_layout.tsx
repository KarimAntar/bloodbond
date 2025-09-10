// app/(app)/_layout.tsx
import { useAuth } from '../../contexts/AuthContext';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import React from 'react';

export default function AppLayout() {
  const { user, userProfile, loading, logout } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </View>
    );
  }

  // If user is not logged in, redirect to login page
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // If user is logged in but their email is not verified, redirect to login.
  // The login screen will show the verification message.
  if (!user.emailVerified) {
    // We log the user out to clear the state and ensure they must verify
    // before attempting to log in again.
    logout();
    return <Redirect href="/(auth)/login" />;
  }

  // If user is logged in and verified, but their profile is not complete,
  // redirect to profile setup.
  if (userProfile && !userProfile.profileComplete) {
    return <Redirect href="/(app)/profile/setup" />;
  }

  // If user is logged in, verified, and profile is complete, render the app content
  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});