// app/(tabs)/requests/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function RequestsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/edit" />
    </Stack>
  );
}
