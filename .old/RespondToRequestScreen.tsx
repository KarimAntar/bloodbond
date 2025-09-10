import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Button, Alert } from 'react-native';
import { db } from '../app/firebase/firebaseConfig';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { setDoc, doc } from 'firebase/firestore';
import { useAuth } from '../app/contexts/AuthContext';

export default function RespondToRequestScreen() {
  const { user } = useAuth();
  const [response, setResponse] = useState('');
  const router = useRouter();
  const { id } = useLocalSearchParams();  // Use useLocalSearchParams to get the dynamic parameter

  const handleSubmitResponse = async () => {
    if (!response) {
      Alert.alert('Error', 'Please provide a response.');
      return;
    }

    try {
      await setDoc(doc(db, 'requests', id as string, 'responses', user!.uid), {
        userId: user!.uid,
        message: response,
        name: user!.displayName,
      });

      Alert.alert('Success', 'Your response has been submitted.');
      router.push(`/requests/${id}/responses`);
    } catch (error) {
      console.error('Error responding:', error);
      Alert.alert('Error', 'Failed to submit your response.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Respond to Request</Text>

      <TextInput
        style={styles.input}
        placeholder="Write your response..."
        value={response}
        onChangeText={setResponse}
        multiline
      />

      <Button title="Submit Response" onPress={handleSubmitResponse} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d90429',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
    borderRadius: 8,
  },
});
