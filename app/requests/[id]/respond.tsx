// app/requests/[id]/respond.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '../../firebase/firebaseConfig';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

export default function RespondScreen() {
  const { id: requestId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || !contact.trim()) {
      Alert.alert('Missing Fields', 'Please enter your message and contact info.');
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'requests', requestId as string, 'responses'), {
        userId: user?.uid,
        responderName: user?.displayName || 'Anonymous',
        message: message.trim(),
        contact: contact.trim(),
        createdAt: Timestamp.now(),
      });

      Alert.alert('Success', 'Your response has been submitted.');
      router.push(`/requests/${requestId}`);
    } catch (error) {
      console.error('Error submitting response:', error);
      Alert.alert('Error', 'Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>🩸 Respond to Request</Text>

        <TextInput
          style={styles.textArea}
          placeholder="Your Message"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Your Contact Info"
          value={contact}
          onChangeText={setContact}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Response</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push(`/requests/${requestId}`)}
        >
          <Text style={styles.backButtonText}>Back to Request</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d90429',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#d90429',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
  },
  backButtonText: {
    color: '#d90429',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
