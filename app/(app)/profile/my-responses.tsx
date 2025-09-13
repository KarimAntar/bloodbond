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
import PullToRefresh from '../../../components/PullToRefresh';
import { useRouter } from 'expo-router';
import { db } from '../../../firebase/firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors } from '../../../constants/Colors';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

interface Response {
  id: string;
  message: string;
  responderName: string;
  createdAt: any;
  requestId: string;
}

const ResponseCard: React.FC<{ response: Response; onPress: () => void; colors: any }> = ({ response, onPress, colors }) => {
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
    <TouchableOpacity style={[styles.responseCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} onPress={onPress}>
      <Text style={[styles.responseName, { color: colors.primaryText }]}>{response.responderName}</Text>
      <Text style={[styles.responseText, { color: colors.secondaryText }]} numberOfLines={2}>{response.message}</Text>
      <Text style={[styles.timeText, { color: colors.secondaryText }]}>{timeAgo}</Text>
    </TouchableOpacity>
  );
};

export default function MyResponsesScreen() {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];
  const router = useRouter();

  const fetchResponses = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'responses'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const fetchedResponses: Response[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Response));

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
      <View style={[styles.loadingContainer, { backgroundColor: colors.screenBackground }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading your responses...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primaryText }]}>My Responses</Text>
        <View style={{ width: 24 }} />
      </View>
      <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
        <FlatList
          data={responses}
          renderItem={({ item }) => (
            <ResponseCard
              response={item}
              onPress={() => router.push(`/requests/${item.requestId}/responses/${item.id}`)}
              colors={colors}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.responsesList}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-unread-outline" size={64} color={colors.secondaryText + '60'} />
              <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>No Responses Yet</Text>
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>You have not responded to any blood requests.</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </PullToRefresh>
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
    textAlign: 'left',
  },
  responseText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
    textAlign: 'left',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'left',
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
