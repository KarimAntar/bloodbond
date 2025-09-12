// app/(app)/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';
import CustomTabBar from '../../components/CustomTabBar';
import { View } from 'react-native';

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { paddingBottom: 80 } // Account for tab bar height
      }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="requests/[id]" />
        <Stack.Screen name="requests/[id]/respond" />
        <Stack.Screen name="requests/[id]/responses" />
        <Stack.Screen name="requests/[id]/responses/[responseId]" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="profile/setup" />
        <Stack.Screen name="profile/support" />
        <Stack.Screen name="profile/bug-report" />
        <Stack.Screen name="profile/donation-history" />
        <Stack.Screen name="profile/settings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="emergency-contacts" />
        <Stack.Screen name="requests/create" />
        <Stack.Screen name="admin" />
      </Stack>

      {/* Persistent Tab Bar */}
      <CustomTabBar />
    </View>
  );
}
