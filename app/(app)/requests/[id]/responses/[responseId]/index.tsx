// app/requests/[id]/responses/[responseId]/index.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../../../../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

interface Response {
  responderName: string;
  message: string;
  contact: string;
  bloodType?: string;
}

export default function ResponseDetails() {
  const [response, setResponse] = useState<Response | null>(null);
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
            setResponse(responseDocSnap.data() as Response);
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
    <SafeAreaView style={styles.container}>
      <Text style={styles.errorText}>Response not found.</Text>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Response Details</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.detailsCard}>
        <View style={styles.detailItem}>
          <Ionicons name="person-circle-outline" size={24} color="#666" />
          <Text style={styles.detailText}>Name: {response.responderName}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#666" />
          <Text style={styles.detailText}>Message: {response.message}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="call-outline" size={24} color="#666" />
          <Text style={styles.detailText}>Contact: {response.contact}</Text>
        </View>
        {response.bloodType && 
        <View style={styles.detailItem}>
            <Ionicons name="water-outline" size={24} color="#666" />
            <Text style={styles.detailText}>Blood Type: {response.bloodType}</Text>
        </View>
        }
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  detailsCard: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#E53E3E',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});