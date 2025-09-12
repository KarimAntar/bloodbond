// app/(tabs)/requests.tsx
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
  TextInput,
  Share,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../../firebase/firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors } from '../../../constants/Colors';
import { SkeletonCard } from '../../../components/SkeletonLoader';
import { collection, getDocs, query, orderBy, where, deleteDoc, doc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

interface BloodRequest {
  id: string;
  userId: string;
  fullName: string;
  bloodType: string;
  governorate?: string;
  city: string;
  hospital: string;
  contactNumber: string;
  notes?: string;
  urgent?: boolean;
  createdAt: any;
  responseCount?: number;
}

const RequestCard: React.FC<{
  request: BloodRequest;
  onPress: () => void;
  onRespond: () => void;
  onShare: () => void;
  onDelete?: () => void;
  showDeleteButton?: boolean;
  colors: any;
}> = ({ request, onPress, onRespond, onShare, onDelete, showDeleteButton, colors }) => {
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

  return (
    <TouchableOpacity 
      style={[styles.requestCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} 
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={styles.leftHeader}>
          <View style={[styles.bloodTypeBadge, { backgroundColor: getBloodTypeColor(request.bloodType) }]}>
            <Text style={styles.bloodTypeText}>{request.bloodType}</Text>
          </View>
          <View style={styles.requestInfo}>
            <Text style={[styles.patientName, { color: colors.primaryText }]}>{request.fullName}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={colors.secondaryText} />
              <Text style={[styles.locationText, { color: colors.secondaryText }]}>
                {request.governorate ? `${request.governorate}, ${request.city}` : request.city}
              </Text>
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

      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <View style={styles.footerLeft}>
          <TouchableOpacity 
            style={[styles.respondButton, { backgroundColor: colors.primary + '15' }]} 
            onPress={onRespond}
          >
            <Ionicons name="hand-left" size={16} color={colors.primary} />
            <Text style={[styles.respondButtonText, { color: colors.primary }]}>Respond</Text>
          </TouchableOpacity>

          {request.responseCount !== undefined && (
            <View style={[styles.responseCount, { backgroundColor: colors.screenBackground }]}>
              <Ionicons name="people" size={14} color={colors.secondaryText} />
              <Text style={[styles.responseCountText, { color: colors.secondaryText }]}>
                {request.responseCount || 0} {(request.responseCount || 0) === 1 ? 'response' : 'responses'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footerRight}>
          {showDeleteButton && onDelete && (
            <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.danger + '15' }]} onPress={onDelete}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.shareButton} onPress={onShare}>
            <Ionicons name="share-outline" size={16} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const getBloodTypeColor = (bloodType: string): string => {
  const colors: { [key: string]: string } = {
    'A+': '#E53E3E', 'A-': '#C53030',
    'B+': '#3182CE', 'B-': '#2C5AA0',
    'AB+': '#38A169', 'AB-': '#2F855A',
    'O+': '#F56500', 'O-': '#DD6B20',
  };
  return colors[bloodType] || '#E53E3E';
};

const FilterChip: React.FC<{ 
  title: string; 
  isSelected: boolean; 
  onPress: () => void;
  count?: number;
  colors: any;
}> = ({ title, isSelected, onPress, count, colors }) => (
  <TouchableOpacity
    style={[
      styles.filterChip, 
      { backgroundColor: colors.screenBackground, borderColor: colors.border },
      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
    ]}
    onPress={onPress}
  >
    <Text style={[
      { color: colors.secondaryText, fontSize: 12, fontWeight: '500' },
      isSelected && { color: 'white' }
    ]}>
      {title}
      {count !== undefined && ` (${count})`}
    </Text>
  </TouchableOpacity>
);

export default function RequestsTabScreen() {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<BloodRequest | null>(null);

  const { user, userProfile } = useAuth();
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];
  const router = useRouter();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Requests - BloodBond';
    }
  }, []);

  const fetchRequests = async () => {
    try {
      setError(null);
      const q = query(
        collection(db, 'requests'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const fetchedRequests: BloodRequest[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BloodRequest));

      // Fetch response counts for each request
      const requestsWithCounts = await Promise.all(
        fetchedRequests.map(async (request) => {
          try {
            const responsesQuery = query(
              collection(db, 'responses'),
              where('requestId', '==', request.id)
            );
            const responsesSnapshot = await getDocs(responsesQuery);
            return {
              ...request,
              responseCount: responsesSnapshot.size
            };
          } catch (error) {
            console.error(`Error fetching responses for request ${request.id}:`, error);
            return {
              ...request,
              responseCount: 0
            };
          }
        })
      );

      setRequests(requestsWithCounts);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to load requests. Please try again.');
    }
  };

  useEffect(() => {
    const loadRequests = async () => {
      if (!user) {
        setRequests([]);
        setLoading(false);
        setError('You must be logged in to view requests.');
        return;
      }
      setLoading(true);
      await fetchRequests();
      setLoading(false);
    };

    loadRequests();
  }, [user]);

  useEffect(() => {
    let filtered = [...requests];

    // Apply search filter
    if (searchText.trim()) {
      filtered = filtered.filter(request =>
        request.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
        request.bloodType.toLowerCase().includes(searchText.toLowerCase()) ||
        request.city.toLowerCase().includes(searchText.toLowerCase()) ||
        request.hospital.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Apply blood type filter
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'myCity' && userProfile?.city) {
        filtered = filtered.filter(request => request.city === userProfile.city);
      } else if (selectedFilter === 'urgent') {
        filtered = filtered.filter(request => request.urgent);
      } else {
        // Blood type filter
        filtered = filtered.filter(request => request.bloodType === selectedFilter);
      }
    }

    setFilteredRequests(filtered);
  }, [requests, searchText, selectedFilter, userProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const handleRespond = (request: BloodRequest) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to respond to requests.');
      return;
    }
    router.push(`/requests/${request.id}/respond`);
  };

  const handleShare = async (request: BloodRequest) => {
    try {
      const location = request.governorate ? `${request.governorate}, ${request.city}` : request.city;
      const message = `🩸 BLOOD DONATION NEEDED 🩸\n\nPatient: ${request.fullName}\nBlood Type: ${request.bloodType}\nLocation: ${location}\nHospital: ${request.hospital}\n${request.urgent ? '🚨 URGENT REQUEST' : ''}\n\nHelp save a life! Contact: ${request.contactNumber}`;

      await Share.share({
        message,
        title: 'Blood Donation Request',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDeleteRequest = (request: BloodRequest) => {
    console.log('Delete button pressed for request:', request.id);
    setRequestToDelete(request);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;

    console.log('Delete confirmed for request:', requestToDelete.id);
    setDeleteModalVisible(false);

    try {
      console.log('Attempting to delete document:', requestToDelete.id);
      await deleteDoc(doc(db, 'requests', requestToDelete.id));
      console.log('Document deleted from Firestore');

      setRequests(prevRequests => {
        const filtered = prevRequests.filter(r => r.id !== requestToDelete.id);
        console.log('Updated local state, requests count:', filtered.length);
        return filtered;
      });

      Alert.alert('Success', 'Request deleted successfully');
      setRequestToDelete(null);
    } catch (error) {
      console.error('Error deleting request:', error);
      Alert.alert('Error', 'Failed to delete request');
      setRequestToDelete(null);
    }
  };

  const cancelDelete = () => {
    console.log('User canceled deletion');
    setDeleteModalVisible(false);
    setRequestToDelete(null);
  };

  const canDeleteRequests = userProfile?.role === 'admin' || userProfile?.role === 'moderator';

  const getFilterCounts = () => {
    const counts: { [key: string]: number } = {
      all: requests.length,
      myCity: userProfile?.city ? requests.filter(r => r.city === userProfile.city).length : 0,
      urgent: requests.filter(r => r.urgent).length,
    };
    
    // Count by blood types
    ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].forEach(type => {
      counts[type] = requests.filter(r => r.bloodType === type).length;
    });
    
    return counts;
  };

  const filterCounts = getFilterCounts();

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primaryText,
    },
    subtitle: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 2,
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
    createButton: {
      backgroundColor: colors.primary,
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.screenBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      marginLeft: 12,
      fontSize: 16,
      color: colors.primaryText,
    },
    filtersContainer: {
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 64,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.primaryText,
      marginTop: 16,
    },
    emptyText: {
      fontSize: 16,
      color: colors.secondaryText,
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

  if (!user) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.emptyContainer}>
          <Ionicons name="log-in-outline" size={64} color={colors.secondaryText + '60'} />
          <Text style={dynamicStyles.emptyTitle}>Login Required</Text>
          <Text style={dynamicStyles.emptyText}>
            You must be logged in to view blood requests.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary, marginTop: 24 }]}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.retryButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        {/* Header with skeleton-like placeholder */}
        <View style={dynamicStyles.header}>
          <View style={styles.headerContent}>
            <Text style={dynamicStyles.title}>Blood Requests</Text>
            <Text style={dynamicStyles.subtitle}>Loading requests...</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={dynamicStyles.refreshButton}>
              <Ionicons name="refresh" size={20} color={colors.secondaryText} />
            </View>
            <TouchableOpacity
              style={dynamicStyles.createButton}
              onPress={() => router.push('/requests/create')}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search skeleton */}
        <View style={dynamicStyles.searchContainer}>
          <View style={dynamicStyles.searchInputContainer}>
            <Ionicons name="search" size={20} color={colors.secondaryText} />
            <Text style={[dynamicStyles.searchInput, { color: colors.secondaryText }]}>
              Searching requests...
            </Text>
          </View>
        </View>

        {/* Filters skeleton */}
        <View style={dynamicStyles.filtersContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { key: 'all', title: 'All' },
              { key: 'myCity', title: 'My City' },
              { key: 'urgent', title: 'Urgent' },
              { key: 'A+', title: 'A+' },
            ]}
            renderItem={({ item }) => (
              <FilterChip
                title={item.title}
                isSelected={item.key === 'all'}
                onPress={() => {}}
                colors={colors}
              />
            )}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.filtersList}
            scrollEnabled={false}
          />
        </View>

        {/* Skeleton cards */}
        <View style={styles.requestsContainer}>
          {[...Array(4)].map((_, index) => (
            <SkeletonCard key={index} colors={colors} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.cardBackground}
            progressViewOffset={50}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={dynamicStyles.header}>
          <View style={styles.headerContent}>
            <Text style={dynamicStyles.title}>Blood Requests</Text>
            <Text style={dynamicStyles.subtitle}>
              {filteredRequests.length} of {requests.length} requests
              {selectedFilter !== 'all' && ` • ${selectedFilter === 'myCity' ? 'My City' : selectedFilter === 'urgent' ? 'Urgent' : selectedFilter} filter`}
            </Text>
          </View>

          <View style={styles.headerActions}>
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

            <TouchableOpacity
              style={dynamicStyles.createButton}
              onPress={() => router.push('/requests/create')}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={dynamicStyles.searchContainer}>
          <View style={dynamicStyles.searchInputContainer}>
            <Ionicons name="search" size={20} color={colors.secondaryText} />
            <TextInput
              style={dynamicStyles.searchInput}
              placeholder="Search requests..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor={colors.secondaryText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color={colors.secondaryText} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters */}
        <View style={dynamicStyles.filtersContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { key: 'all', title: 'All' },
              { key: 'myCity', title: 'My City' },
              { key: 'urgent', title: 'Urgent' },
              { key: 'A+', title: 'A+' },
              { key: 'A-', title: 'A-' },
              { key: 'B+', title: 'B+' },
              { key: 'B-', title: 'B-' },
              { key: 'AB+', title: 'AB+' },
              { key: 'AB-', title: 'AB-' },
              { key: 'O+', title: 'O+' },
              { key: 'O-', title: 'O-' },
            ]}
            renderItem={({ item }) => (
              <FilterChip
                title={item.title}
                isSelected={selectedFilter === item.key}
                onPress={() => setSelectedFilter(item.key)}
                count={filterCounts[item.key]}
                colors={colors}
              />
            )}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.filtersList}
            scrollEnabled={false}
          />
        </View>

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Requests List */}
        {!error && (
          <View style={styles.requestsContainer}>
            {filteredRequests.length === 0 ? (
              <View style={dynamicStyles.emptyContainer}>
                <Ionicons name="heart-dislike" size={64} color={colors.secondaryText + '60'} />
                <Text style={dynamicStyles.emptyTitle}>No requests found</Text>
                <Text style={dynamicStyles.emptyText}>
                  {searchText || selectedFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Be the first to create a blood request'
                  }
                </Text>
              </View>
            ) : (
              filteredRequests.map((item) => (
                <RequestCard
                  key={item.id}
                  request={item}
                  onPress={() => router.push(`/requests/${item.id}`)}
                  onRespond={() => handleRespond(item)}
                  onShare={() => handleShare(item)}
                  onDelete={() => handleDeleteRequest(item)}
                  showDeleteButton={canDeleteRequests}
                  colors={colors}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="trash-outline" size={24} color={colors.danger} />
              <Text style={dynamicStyles.modalTitle}>Delete Request</Text>
            </View>

            <Text style={dynamicStyles.modalMessage}>
              Are you sure you want to delete "{requestToDelete?.fullName}"'s blood donation request?
              This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border + '30', borderColor: colors.border }]}
                onPress={cancelDelete}
              >
                <Text style={[styles.cancelButtonText, { color: colors.secondaryText }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton, { backgroundColor: colors.danger }]}
                onPress={confirmDelete}
              >
                <Ionicons name="trash" size={16} color="white" />
                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
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
  scrollContainer: {
    flex: 1,
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
  headerContent: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },

  createButton: {
    backgroundColor: '#E53E3E',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  filtersContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filtersList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  filterChipSelected: {
    backgroundColor: '#E53E3E',
    borderColor: '#E53E3E',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  filterChipTextSelected: {
    color: 'white',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#E53E3E',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#E53E3E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  requestsList: {
    padding: 16,
    paddingBottom: 100, // Add padding for tab bar
  },
  requestsContainer: {
    padding: 16,
    paddingBottom: 100, // Add padding for tab bar
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
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  respondButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  respondButtonText: {
    color: '#E53E3E',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  responseCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  responseCountText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  shareButton: {
    padding: 8,
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
});
