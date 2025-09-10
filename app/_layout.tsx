import Toast from 'react-native-toast-message';
import React from 'react';
import { Slot } from 'expo-router'; // For routing
import { AuthProvider } from '../contexts/AuthContext'; // Import AuthProvider from context
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native'; // For theme support
import { useColorScheme } from 'react-native'; // For managing color scheme (light/dark theme)
import { StatusBar } from 'expo-status-bar'; // Adjust for status bar handling

export default function RootLayout() {
  const colorScheme = useColorScheme(); // Optional, to manage dark/light theme
  return (
    <AuthProvider> {/* Wrap everything with AuthProvider */}
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Slot /> {/* Slot renders the dynamic content based on routes */}
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
