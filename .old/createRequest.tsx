import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { db } from '../app/firebase/firebaseConfig';
import { useAuth } from '../app/contexts/AuthContext';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function CreateRequestScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [bloodType, setBloodType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRequest = async () => {
    if (!bloodType || !quantity || !location) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    setLoading(true);

    try {
      const docRef = await addDoc(collection(db, 'requests'), {
        bloodType,
        quantity,
        location,
        createdAt: Timestamp.now(),
        userId: user?.uid,
      });

      Alert.alert('Success', 'Request created successfully');
      router.push({
        pathname: './requests/[id]',
        params: { id: docRef.id },
      });
    } catch (error) {
      console.error('Error adding request: ', error);
      Alert.alert('Error', 'There was an issue creating the request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Blood Donation Request</Text>

      <TextInput
        style={styles.input}
        placeholder="Blood Type (e.g., A+, O-)"
        value={bloodType}
        onChangeText={setBloodType}
      />

      <TextInput
        style={styles.input}
        placeholder="Quantity (in units)"
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />

      <TextInput
        style={styles.input}
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
      />

      <Button
        title={loading ? 'Creating...' : 'Create Request'}
        onPress={handleCreateRequest}
        disabled={loading}
      />
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#d90429',
  },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
});
