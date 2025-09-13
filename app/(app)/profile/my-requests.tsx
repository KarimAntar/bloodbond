// app/profile/my-requests.tsx
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
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../../firebase/firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors } from '../../../constants/Colors';
import { collection, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import PullToRefresh from '../../../components/PullToRefresh';

interface BloodRequest {
  id: string;
  fullName: string;
  bloodType: string;
  city: string;
  hospital: string;
  notes?: string;
  urgent?: boolean;
  createdAt: any;
}

const RequestCard: React.FC<{
  request: BloodRequest;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  colors: any;
}> = ({ request, onPress, onEdit, onDelete, colors }) => {
  const [menuVisible, setMenuVisible] = React.useState(false);

  const timeAgo = React.useMemo(() => {
    if (!request.createdAt) return 'Recently';

    const now = new Date();
    const requestTime = request.createdAt.toDate();
    const diffInHours = Math.floor((now.getTime() - requestTime.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }, [request.createdAt]);

  const handleMenuPress = () => {
    setMenuVisible(!menuVisible);
  };

  const handleEdit = () => {
    setMenuVisible(false);
    if (onEdit) onEdit();
  };

  const handleDelete = () => {
    setMenuVisible(false);
    if (onDelete) onDelete();
  };

  return (
    <View style={[styles.requestCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <TouchableOpacity onPress={onPress} style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.leftHeader}>
            <View style={[styles.bloodTypeBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.bloodTypeText}>{request.bloodType}</Text>
            </View>
            <View style={styles.requestInfo}>
              <Text style={[styles.patientName, { color: colors.primaryText }]}>{request.fullName}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color={colors.secondaryText} />
                <Text style={[styles.locationText, { color: colors.secondaryText }]}>{request.city}</Text>
              </View>
            </View>
          </View>
          <View style={styles.rightHeader}>
            {request.urgent && (
              <View style={styles.urgentBadge}>
                <Ionicons name="warning" size={12} color="#fff" />
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
            <Text style={[styles.timeText, { color: colors.secondaryText }]}>{timeAgo}</Text>
            <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
              <Ionicons name="ellipsis-vertical" size={16} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.hospitalRow}>
          <Ionicons name="medical" size={16} color={colors.primary} />
          <Text style={[styles.hospitalText, { color: colors.primaryText }]}>{request.hospital}</Text>
        </View>

        {request.notes && (
          <Text style={[styles.notesText, { color: colors.secondaryText }]} numberOfLines={2}>
            {request.notes}
          </Text>
        )}

        <Text style={[styles.timeText, { color: colors.secondaryText }]}>{timeAgo}</Text>
      </TouchableOpacity>

      {/* 3-dot menu */}
      {menuVisible && (
        <>
          <TouchableOpacity style={styles.menuOverlay} onPress={() => setMenuVisible(false)} activeOpacity={1} />
          <View style={[styles.menuContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            {onEdit && (
              <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={handleEdit}>
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={[styles.menuItemText, { color: colors.primaryText }]}>Edit</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[styles.menuItemText, { color: colors.danger }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
};

export default function MyRequestsScreen() {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<BloodRequest | null>(null);

  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];
  const router = useRouter();

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'requests'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedRequests: BloodRequest[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BloodRequest));
      
      setRequests(fetchedRequests);
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true);
      await fetchRequests();
      setLoading(false);
    };

    loadRequests();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const handleDeleteRequest = (request: BloodRequest) => {
    setRequestToDelete(request);
    setDeleteModalVisible(true);
  };

  const confirmDeleteRequest = async () => {
    if (!requestToDelete) return;

    setDeleteModalVisible(false);

    try {
      await deleteDoc(doc(db, 'requests', requestToDelete.id));
      setRequests(requests.filter(r => r.id !== requestToDelete.id));
      Alert.alert('Success', 'Request deleted successfully');
      setRequestToDelete(null);
    } catch (error) {
      console.error('Error deleting request:', error);
      Alert.alert('Error', 'Failed to delete request');
      setRequestToDelete(null);
    }
  };

  const cancelDeleteRequest = () => {
    setDeleteModalVisible(false);
    setRequestToDelete(null);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.screenBackground }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading your requests...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primaryText }]}>My Requests</Text>
        <View style={{ width: 24 }} />
      </View>
      <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
        <FlatList
          data={requests}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              onPress={() => router.push(`/requests/${item.id}`)}
              onEdit={() => router.push(`/requests/${item.id}/edit`)}
              onDelete={() => handleDeleteRequest(item)}
              colors={colors}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.requestsList}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={64} color={colors.secondaryText + '60'} />
              <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>No Requests Yet</Text>
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>You have not created any blood requests.</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </PullToRefresh>

      {/* Delete Request Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDeleteRequest}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="trash-outline" size={24} color={colors.danger} />
              <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Delete Request</Text>
            </View>

            <Text style={[styles.modalMessage, { color: colors.secondaryText }]}>
              Are you sure you want to delete your request for "{requestToDelete?.fullName}"?
              This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border + '30', borderColor: colors.border }]}
                onPress={cancelDeleteRequest}
              >
                <Text style={[styles.cancelButtonText, { color: colors.secondaryText }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton, { backgroundColor: colors.danger }]}
                onPress={confirmDeleteRequest}
              >
                <Ionicons name="trash" size={16} color="white" />
                <Text style={styles.deleteConfirmButtonText}>Delete Request</Text>
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
  requestsList: {
    padding: 16,
  },
  requestCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leftHeader: {
    flexDirection: 'row',
    flex: 1,
  },
  rightHeader: {
    alignItems: 'flex-end',
  },
  bloodTypeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#E53E3E',
  },
  bloodTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
    writingDirection: 'ltr',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hospitalText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginLeft: 8,
    fontWeight: '500',
    textAlign: 'left',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'left',
  },
  urgentBadge: {
    backgroundColor: '#F56500',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  urgentText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  editButton: {
    padding: 8,
    backgroundColor: '#EBF8FF',
    borderRadius: 6,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
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
  cardContent: {
    flex: 1,
  },
  menuButton: {
    padding: 8,
  },
  menuContainer: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 120,
    zIndex: 1000,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});
