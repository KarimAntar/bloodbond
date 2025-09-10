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
import { useRouter } from 'expo-router';
import { db } from '../firebase/firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function CreateRequestScreen() {
  const [bloodType, setBloodType] = useState('');
  const [city, setCity] = useState('');
  const [hospital, setHospital] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!bloodType || !city || !hospital) {
      Alert.alert('Missing Fields', 'Please fill out all required fields.');
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'requests'), {
        userId: user?.uid,
        bloodType,
        city,
        hospital,
        notes,
        createdAt: Timestamp.now(),
      });

      Alert.alert('Success', 'Request created successfully!');
      router.push('/requests'); // Navigate to request list
    } catch (error) {
      console.error('Error creating request:', error);
      Alert.alert('Error', 'Could not create request.');
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
        <Text style={styles.title}>🩸 Create Blood Request</Text>

        <TextInput
          style={styles.input}
          placeholder="Blood Type (e.g. A+)"
          value={bloodType}
          onChangeText={setBloodType}
        />

        <TextInput
          style={styles.input}
          placeholder="City"
          value={city}
          onChangeText={setCity}
        />

        <TextInput
          style={styles.input}
          placeholder="Hospital Name"
          value={hospital}
          onChangeText={setHospital}
        />

        <TextInput
          style={styles.textArea}
          placeholder="Additional Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Request</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/requests')}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Back to Requests</Text>
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
