// app/profile/my-responses.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../../firebase/firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

interface Response {
  id: string;
  message: string;
  responderName: string;
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
      <Text style={styles.responseName}>{response.responderName}</Text>
      <Text style={styles.responseText} numberOfLines={2}>{response.message}</Text>
      <Text style={styles.timeText}>{timeAgo}</Text>
    </TouchableOpacity>
  );
};

export default function MyResponsesScreen() {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();

  const fetchResponses = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'requests'), 
        where('responses', 'array-contains', { userId: user.uid }),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedResponses: Response[] = [];
      querySnapshot.forEach(doc => {
        const requestResponses = doc.data().responses as any[];
        const userResponse = requestResponses.find(r => r.userId === user.uid);
        if (userResponse) {
          fetchedResponses.push({
            id: doc.id,
            ...userResponse
          } as Response)
        }
      });
      
      setResponses(fetchedResponses);
    } catch (err) {
      console.error('Error fetching responses:', err);
    }
  };

  useEffect(() => {
    const loadResponses = async () => {
      setLoading(true);
      await fetchResponses();
      setLoading(false);
    };

    loadResponses();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchResponses();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53E3E" />
        <Text style={styles.loadingText}>Loading your responses...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>My Responses</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={responses}
        renderItem={({ item }) => (
          <ResponseCard
            response={item}
            onPress={() => router.push(`/requests/${item.id}`)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.responsesList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#E53E3E']}
            tintColor="#E53E3E"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-unread-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Responses Yet</Text>
            <Text style={styles.emptyText}>You have not responded to any blood requests.</Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
  responsesList: {
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
  responseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
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