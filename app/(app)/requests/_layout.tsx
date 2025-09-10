// app/(tabs)/requests/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function RequestsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}