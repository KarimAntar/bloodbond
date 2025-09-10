// app/requests/[id]/responses/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../../../firebase/firebaseConfig';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../../../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface Response {
  id: string;
  responderName: string;
  message: string;
  bloodType?: string;
  createdAt: any;
}

const ResponseCard: React.FC<{ response: Response; onPress: () => void }> = ({ response, onPress }) => {
  const timeAgo = React.useMemo(() => {
    if (!response.createdAt) return 'Recently';
    
    const now = new Date();
    const responseTime = response.createdAt.toDate();
    const diffInHours = Math.floor((now.getTime() - responseTime.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }, [response.createdAt]);

  return (
    <TouchableOpacity style={styles.responseCard} onPress={onPress}>
      <View style={styles.responseHeader}>
        <Text style={styles.responseName}>{response.responderName}</Text>
        {response.bloodType && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{response.bloodType}</Text>
          </View>
        )}
      </View>
      <Text style={styles.responseText} numberOfLines={2}>{response.message}</Text>
      <Text style={styles.timeText}>{timeAgo}</Text>
    </TouchableOpacity>
  );
}

export default function RequestResponsesScreen() {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        const q = query(
          collection(db, 'requests', id as string, 'responses'),
          orderBy('createdAt', 'desc')
        );
        const responsesSnapshot = await getDocs(q);
        const responsesList = responsesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Response));
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Responses</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={responses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ResponseCard
            response={item}
            onPress={() => router.push(`/requests/${id}/responses/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-unread-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Responses Yet</Text>
            <Text style={styles.emptyText}>Check back later for responses from donors.</Text>
          </View>
        )}
      />
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
  listContainer: {
    padding: 16,
  },
  responseCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  responseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  badge: {
    backgroundColor: '#E53E3E',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  responseText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
});