// app/(app)/profile/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="my-requests" />
      <Stack.Screen name="my-responses" />
      <Stack.Screen name="donation-history" />
    </Stack>
  );
}