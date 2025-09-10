import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../../firebase/firebaseConfig';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';

export default function RequestDetails() {
  const { user } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        // Fetch request info
        const requestDoc = await getDoc(doc(db, 'requests', id as string));
        if (requestDoc.exists()) {
          setRequest(requestDoc.data());
        }

        // Fetch responses
        const q = query(
          collection(db, 'requests', id as string, 'responses'),
          orderBy('createdAt', 'desc')
        );
        const responsesSnapshot = await getDocs(q);
        const responsesList = responsesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setResponses(responsesList);
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <ActivityIndicator size="large" color="#d90429" />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Request Details</Text>

      {request && (
        <View style={styles.detailsCard}>
          <Text style={styles.detailText}>Name: {request.fullName}</Text>
          <Text style={styles.detailText}>Blood Type: {request.bloodType}</Text>
          <Text style={styles.detailText}>City: {request.city}</Text>
          <Text style={styles.detailText}>Hospital: {request.hospital}</Text>
          <Text style={styles.detailText}>Contact Number: {request.contactNumber}</Text>
          {request.notes && <Text style={styles.detailText}>Notes: {request.notes}</Text>}
        </View>
      )}

      <Text style={styles.subtitle}>Responses</Text>

      {responses.length === 0 ? (
        <Text style={styles.noResponses}>No responses yet. 🚑</Text>
      ) : (
        <FlatList
          data={responses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.responseCard}
              onPress={() => router.push(`/requests/${id}/responses/${item.id}`)}
            >
              <View style={styles.responseHeader}>
                <Text style={styles.responseName}>{item.name}</Text>
                {item.bloodType && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.bloodType}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.responseText}>{item.message}</Text>
            </TouchableOpacity>
          )}
          scrollEnabled={false}
        />
      )}
    </ScrollView>
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
  detailsCard: {
    backgroundColor: '#f4f4f4',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    color: '#d90429',
  },
  responseCard: {
    backgroundColor: '#f4f4f4',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  responseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  badge: {
    backgroundColor: '#d90429',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  responseText: {
    fontSize: 16,
    color: '#333',
  },
  noResponses: {
    fontSize: 18,
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
  },
});
