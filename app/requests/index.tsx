import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function RequestsScreen() {
  const [requests, setRequests] = useState<any[]>([]); // Requests data
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state
  const { user } = useAuth(); // To check if the user is authenticated
  const router = useRouter();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'requests')); // Fetch all requests from Firestore
        const fetchedRequests: any[] = [];
        querySnapshot.forEach((doc) => {
          fetchedRequests.push({ ...doc.data(), id: doc.id });
        });
        setRequests(fetchedRequests); // Set requests data
      } catch (err) {
        console.error('Error fetching requests:', err);
        setError('Failed to load requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#d90429" />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.goBackButton}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Requests</Text>

      {requests.length === 0 ? (
        <Text style={styles.noRequests}>No requests available at the moment.</Text>
      ) : (
        <View style={styles.requestsList}>
          {requests.map((request) => (
            <View key={request.id} style={styles.requestItem}>
              <Text style={styles.requestTitle}>Blood Type: {request.bloodType || 'Not available'}</Text>
              <Text style={styles.requestLocation}>Location: {request.location || 'Not available'}</Text>
              <Text style={styles.requestLocation}>Date: {request.createdAt?.toDate()?.toLocaleString() || 'Not available'}</Text>
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => router.push({ pathname: '/requests/[id]', params: { id: request.id } })} // Navigate to request details
              >
                <Text style={styles.viewDetailsButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {user && (
        <TouchableOpacity
          style={styles.createRequestButton}
          onPress={() => router.push('/requests/create')} // Navigate to create request screen
        >
          <Text style={styles.createRequestButtonText}>Create Request</Text>
        </TouchableOpacity>
      )}
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
    textAlign: 'center',
  },
  errorText: {
    color: '#d90429',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  goBackButton: {
    backgroundColor: '#d90429',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    width: '80%',
  },
  goBackText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  noRequests: {
    fontSize: 18,
    fontWeight: '300',
    color: '#555',
    textAlign: 'center',
    marginTop: 20,
  },
  requestsList: {
    width: '100%',
    marginTop: 20,
  },
  requestItem: {
    backgroundColor: '#f7f7f7',
    padding: 20,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  requestLocation: {
    fontSize: 16,
    fontWeight: '400',
    color: '#555',
    marginBottom: 15,
  },
  viewDetailsButton: {
    backgroundColor: '#d90429',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '80%',
  },
  viewDetailsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  createRequestButton: {
    backgroundColor: '#d90429',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    width: '80%',
  },
  createRequestButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
});
