import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

// ... same imports
export default function ResponseDetails() {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id, responseId } = useLocalSearchParams();

  useEffect(() => {
    const fetchResponse = async () => {
      try {
        if (id && responseId) {
          const responseDocRef = doc(db, 'requests', id as string, 'responses', responseId as string);
          const responseDocSnap = await getDoc(responseDocRef);

          if (responseDocSnap.exists()) {
            setResponse(responseDocSnap.data());
          }
        }
      } catch (error) {
        console.error('Error fetching response details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResponse();
  }, [id, responseId]);

  if (loading) return <ActivityIndicator size="large" color="#d90429" />;
  if (!response) return (
    <View style={styles.container}>
      <Text style={styles.errorText}>Response not found.</Text>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Response Details</Text>
      <View style={styles.detailsCard}>
        <Text style={styles.detailText}>Name: {response.name}</Text>
        <Text style={styles.detailText}>Message: {response.message}</Text>
        {response.phone && <Text style={styles.detailText}>Phone: {response.phone}</Text>}
        {response.bloodType && <Text style={styles.detailText}>Blood Type: {response.bloodType}</Text>}
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d90429',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#f4f4f4',
    padding: 20,
    borderRadius: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: 30,
  },
  detailText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 20,
    color: '#888',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#d90429',
    padding: 15,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
});
