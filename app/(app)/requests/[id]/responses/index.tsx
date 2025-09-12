// app/requests/[id]/responses/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView, Modal, Alert, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../../../../firebase/firebaseConfig';
import { collection, getDocs, doc, getDoc, query, orderBy, where, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { Colors } from '../../../../../constants/Colors';
import { SkeletonCard } from '../../../../../components/SkeletonLoader';
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
  colors: any;
}> = ({ response, onPress, onDelete, showDeleteButton, colors }) => {
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
    <TouchableOpacity 
      style={[styles.responseCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} 
      onPress={onPress}
    >
      <View style={styles.responseHeader}>
        <View style={styles.leftHeader}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="person" size={16} color={colors.primary} />
            </View>
            <View style={styles.nameContainer}>
              <Text style={[styles.responseName, { color: colors.primaryText }]}>
                {response.responderName}
              </Text>
              <Text style={[styles.timeText, { color: colors.secondaryText }]}>{timeAgo}</Text>
            </View>
          </View>
          {response.bloodType && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{response.bloodType}</Text>
            </View>
          )}
        </View>
        {showDeleteButton && onDelete && (
          <TouchableOpacity 
            style={[styles.deleteButton, { backgroundColor: colors.danger + '15' }]} 
            onPress={onDelete}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.responseText, { color: colors.secondaryText }]} numberOfLines={3}>
        {response.message}
      </Text>
      <View style={styles.responseFooter}>
        <TouchableOpacity 
          style={[styles.replyButton, { backgroundColor: colors.primary + '10' }]}
          onPress={onPress}
        >
          <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
          <Text style={[styles.replyButtonText, { color: colors.primary }]}>View Details</Text>
        </TouchableOpacity>
      </View>
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
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];

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

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primaryText,
    },
    refreshButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.success + '15',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.success + '30',
    },
    listContainer: {
      padding: 16,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.primaryText,
      marginTop: 20,
    },
    emptyText: {
      fontSize: 16,
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 24,
      paddingHorizontal: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primaryText,
      marginLeft: 12,
    },
    modalMessage: {
      fontSize: 16,
      color: colors.secondaryText,
      lineHeight: 24,
      marginBottom: 24,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={dynamicStyles.title}>Responses</Text>
            <Text style={[styles.responseCount, { color: colors.secondaryText }]}>Loading...</Text>
          </View>
          <View style={dynamicStyles.refreshButton}>
            <Ionicons name="refresh" size={20} color={colors.secondaryText} />
          </View>
        </View>

        <View style={dynamicStyles.listContainer}>
          {[...Array(3)].map((_, index) => (
            <SkeletonCard key={index} colors={colors} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={dynamicStyles.title}>Responses</Text>
          <Text style={[styles.responseCount, { color: colors.secondaryText }]}>
            {responses.length} {responses.length === 1 ? 'response' : 'responses'}
          </Text>
        </View>
        <TouchableOpacity
          style={dynamicStyles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons
            name={refreshing ? "refresh-circle" : "refresh"}
            size={20}
            color={refreshing ? colors.secondaryText : colors.success}
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
            colors={colors}
          />
        )}
        contentContainerStyle={dynamicStyles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.cardBackground}
          />
        }
        ListEmptyComponent={() => (
          <View style={dynamicStyles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.secondaryText + '60'} />
            <Text style={dynamicStyles.emptyTitle}>No Responses Yet</Text>
            <Text style={dynamicStyles.emptyText}>
              This blood request hasn't received any responses yet. Check back later for responses from potential donors.
            </Text>
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
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="trash-outline" size={24} color={colors.danger} />
              <Text style={dynamicStyles.modalTitle}>Delete Response</Text>
            </View>

            <Text style={dynamicStyles.modalMessage}>
              Are you sure you want to delete "{responseToDelete?.responderName}"'s response?
              This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border + '30', borderColor: colors.border }]}
                onPress={cancelDeleteResponse}
              >
                <Text style={[styles.cancelButtonText, { color: colors.secondaryText }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton, { backgroundColor: colors.danger }]}
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  headerCenter: {
    alignItems: 'center',
  },
  responseCount: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  responseCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
  },
  responseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  badge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  responseText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  responseFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
    marginTop: 8,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  replyButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    // backgroundColor set dynamically
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
