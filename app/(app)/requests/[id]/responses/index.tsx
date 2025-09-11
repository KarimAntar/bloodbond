// app/requests/[id]/responses/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView, Modal, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../../../../firebase/firebaseConfig';
import { collection, getDocs, doc, getDoc, query, orderBy, where, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../../../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface Response {
  id: string;
  responderName: string;
  message: string;
  bloodType?: string;
  createdAt: any;
}

const ResponseCard: React.FC<{
  response: Response;
  onPress: () => void;
  onDelete?: () => void;
  showDeleteButton?: boolean;
}> = ({ response, onPress, onDelete, showDeleteButton }) => {
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
        <View style={styles.leftHeader}>
          <Text style={styles.responseName}>{response.responderName}</Text>
          {response.bloodType && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{response.bloodType}</Text>
            </View>
          )}
        </View>
        {showDeleteButton && onDelete && (
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Ionicons name="trash-outline" size={16} color="#E53E3E" />
          </TouchableOpacity>
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
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<Response | null>(null);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, userProfile } = useAuth();

  const fetchData = async () => {
    if (id) {
      // Fetch responses from the main 'responses' collection, not subcollection
      const q = query(
        collection(db, 'responses'),
        where('requestId', '==', id as string),
        orderBy('createdAt', 'desc')
      );
      const responsesSnapshot = await getDocs(q);
      const responsesList = responsesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Response));
      setResponses(responsesList);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };

    loadData();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDeleteResponse = (response: Response) => {
    setResponseToDelete(response);
    setDeleteModalVisible(true);
  };

  const confirmDeleteResponse = async () => {
    if (!responseToDelete) return;

    setDeleteModalVisible(false);

    try {
      await deleteDoc(doc(db, 'responses', responseToDelete.id));
      setResponses(responses.filter(r => r.id !== responseToDelete.id));
      Alert.alert('Success', 'Response deleted successfully');
      setResponseToDelete(null);
    } catch (error) {
      console.error('Error deleting response:', error);
      Alert.alert('Error', 'Failed to delete response');
      setResponseToDelete(null);
    }
  };

  const cancelDeleteResponse = () => {
    setDeleteModalVisible(false);
    setResponseToDelete(null);
  };

  const canDeleteResponses = userProfile?.role === 'admin' || userProfile?.role === 'moderator';

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
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons
            name={refreshing ? "refresh-circle" : "refresh"}
            size={20}
            color={refreshing ? "#666" : "#10B981"}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={responses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ResponseCard
            response={item}
            onPress={() => router.push(`/requests/${id}/responses/${item.id}`)}
            onDelete={() => handleDeleteResponse(item)}
            showDeleteButton={canDeleteResponses}
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

      {/* Delete Response Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDeleteResponse}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="trash-outline" size={24} color="#E53E3E" />
              <Text style={styles.modalTitle}>Delete Response</Text>
            </View>

            <Text style={styles.modalMessage}>
              Are you sure you want to delete "{responseToDelete?.responderName}"'s response?
              This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelDeleteResponse}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton]}
                onPress={confirmDeleteResponse}
              >
                <Ionicons name="trash" size={16} color="white" />
                <Text style={styles.deleteConfirmButtonText}>Delete Response</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
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
    alignItems: 'center',
    marginBottom: 8,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  deleteButton: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  deleteConfirmButton: {
    backgroundColor: '#E53E3E',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
