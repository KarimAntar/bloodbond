// app/auth/login.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const router = useRouter();
  const { user } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const currentUser = userCredential.user;

      if (!currentUser.emailVerified) {
        setErrorMessage('Please verify your email before logging in.');
        setVerificationSent(true);
        return;
      }

      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;

      if (!userData?.completed) {
        router.replace('/profile/setup');
      } else {
        router.replace('/');
      }
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        Alert.alert('Verification Email Sent', 'Please check your inbox to verify your email.');
        setVerificationSent(false);
        setTimer(60);
      } catch (error) {
        Alert.alert('Error', 'There was an error sending the verification email.');
      }
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      {verificationSent && (
        <TouchableOpacity
          onPress={handleResendVerification}
          style={[styles.resendButton, timer > 0 && styles.resendButtonDisabled]}
          disabled={timer > 0}
        >
          <Text style={styles.resendButtonText}>
            {timer > 0 ? `Resend in ${timer}s` : 'Resend Verification Email'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => router.push('/auth/register')} style={styles.registerLink}>
        <Text>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#d90429',
    marginBottom: 30,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    width: '100%',
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#d90429',
    padding: 12,
    marginTop: 20,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#aaa',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  resendButton: {
    backgroundColor: '#d90429',
    padding: 12,
    marginTop: 10,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  resendButtonDisabled: {
    backgroundColor: '#aaa',
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  registerLink: {
    marginTop: 20,
  },
});
