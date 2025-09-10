import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../firebase/firebaseConfig'; // Correct import path for your firebaseConfig
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function RequestDetails() {
  const { id } = useLocalSearchParams(); // This retrieves the dynamic 'id' parameter from the route
  const [request, setRequest] = useState<any>(null); // Request data
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state
  const router = useRouter();

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const requestRef = doc(db, 'requests', id as string); // Reference the specific request by ID
        const requestDoc = await getDoc(requestRef); // Fetch the document
        if (requestDoc.exists()) {
          setRequest({ ...requestDoc.data(), id: requestDoc.id }); // Set request data if it exists
        } else {
          setError('Request not found');
        }
      } catch (err) {
        console.error('Error fetching request:', err);
        setError('Failed to load request details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRequest();
    }
  }, [id]);

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
      {request && (
        <>
          <Text style={styles.title}>Request Details</Text>
          <View style={styles.requestDetails}>
            <Text style={styles.detailLabel}>Blood Type:</Text>
            <Text style={styles.detailValue}>{request.bloodType || 'Not available'}</Text>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{request.location || 'Not available'}</Text>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {request.createdAt?.toDate()?.toLocaleString() || 'Not available'}
            </Text>
            <Text style={styles.detailLabel}>Message:</Text>
            <Text style={styles.detailValue}>{request.message || 'No message provided'}</Text>
          </View>
        </>
      )}

      {/* Create Response Button */}
      <TouchableOpacity
        style={styles.goBackButton}
        onPress={() => router.push(`/requests/${id}/respond`)} // Navigate to create response page
      >
        <Text style={styles.goBackText}>Create Response</Text>
      </TouchableOpacity>

      {/* View Responses Button */}
      <TouchableOpacity
        style={styles.goBackButton}
        onPress={() => router.push(`/requests/${id}/responses`)} // Navigate to responses page
      >
        <Text style={styles.goBackText}>View Responses</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.goBackButton}
        onPress={() => router.push('/requests')} // Navigate back to requests list
      >
        <Text style={styles.goBackText}>Back to Requests</Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#d90429',
    textAlign: 'center',
  },
  requestDetails: {
    width: '100%',
    padding: 20,
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '400',
    color: '#555',
    marginBottom: 15,
  },
  goBackButton: {
    backgroundColor: '#d90429',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    width: '80%',
  },
  goBackText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  errorText: {
    color: '#d90429',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
});
