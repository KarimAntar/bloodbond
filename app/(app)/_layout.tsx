// app/(app)/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="emergency-contacts" />
    </Stack>
  );
}
