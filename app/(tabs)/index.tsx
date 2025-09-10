// app/(tabs)/index.tsx

import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait until loading is done
    if (!user) {
      router.push('/auth/login'); // Redirect to login if no user
    }
  }, [user, loading, router]);

  if (loading) {
    return <ActivityIndicator size="large" color="#d90429" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      {/* Logout Button Wrapper */}
      {user && (
        <View style={styles.logoutContainer}>
          <Button
            title="Logout"
            onPress={async () => {
              await logout();
              router.push('/auth/login');
            }}
          />
        </View>
      )}

      <Text style={styles.title}>🩸 BloodBond</Text>
      <Text style={styles.subtitle}>Connecting Blood Donors with Seekers</Text>

      {/* Additional content */}
      {user ? (
        <Text style={styles.welcomeMessage}>Welcome, {user.email}</Text>
      ) : (
        <Text style={styles.noUserMessage}>You are not logged in</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  logoutContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d90429',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 10,
    color: '#333',
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  welcomeMessage: {
    fontSize: 18,
    marginTop: 20,
    color: '#007AFF',
    textAlign: 'center',
  },
  noUserMessage: {
    fontSize: 16,
    marginTop: 20,
    color: '#f44336',
    textAlign: 'center',
  },
});
