import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Modal,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors } from '../../../constants/Colors';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../../firebase/firebaseConfig';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  where,
  updateDoc,
} from 'firebase/firestore';
import { sendBroadcastNotification, sendPushNotification } from '../../../firebase/pushNotifications';

interface User {
  id: string;
  fullName: string;
  email: string;
  bloodType: string;
  city: string;
  role: string;
  createdAt: any;
}

interface BloodRequest {
  id: string;
  userId: string;
  fullName: string;
  bloodType: string;
  city: string;
  hospital: string;
  contactNumber: string;
  notes?: string;
  urgent?: boolean;
  createdAt: any;
}

export default function AdminDashboard() {
  const { user, userProfile, initializing } = useAuth();
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'notifications'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationModal, setNotificationModal] = useState(false);
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    recipientEmail: '',
  });
  const [roleModal, setRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteUserModalVisible, setDeleteUserModalVisible] = useState(false);
  const [deleteRequestModalVisible, setDeleteRequestModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<BloodRequest | null>(null);

  useEffect(() => {
    // Wait until auth initialization completes to avoid redirect loops
    if (initializing) return;

    // If profile isn't loaded yet, wait (avoid redirect while profile fetch is in-progress)
    if (!userProfile) return;

    // If there's no authenticated user or profile role is not admin, redirect away
    if (!user || userProfile.role?.trim()?.toLowerCase() !== 'admin') {
      router.replace('/(app)/(tabs)');
      return;
    }

    loadData();
  }, [initializing, user, userProfile]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(usersData);

      // Load requests
      const requestsQuery = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as BloodRequest[];
      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteUserModalVisible(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleteUserModalVisible(false);

    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      setUsers(users.filter(u => u.id !== userToDelete.id));
      Alert.alert('Success', 'User deleted successfully');
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      Alert.alert('Error', 'Failed to delete user');
      setUserToDelete(null);
    }
  };

  const cancelDeleteUser = () => {
    setDeleteUserModalVisible(false);
    setUserToDelete(null);
  };

  const handleChangeRole = async (newRole: string) => {
    if (!selectedUser) return;

    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        role: newRole,
      });

      // Update local state
      setUsers(users.map(u =>
        u.id === selectedUser.id ? { ...u, role: newRole } : u
      ));

      Alert.alert('Success', `${selectedUser.fullName}'s role changed to ${newRole}`);
      setRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error changing role:', error);
      Alert.alert('Error', 'Failed to change user role');
    }
  };

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setRoleModal(true);
  };

  const handleDeleteRequest = (request: BloodRequest) => {
    setRequestToDelete(request);
    setDeleteRequestModalVisible(true);
  };

  const confirmDeleteRequest = async () => {
    if (!requestToDelete) return;

    setDeleteRequestModalVisible(false);

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
    setDeleteRequestModalVisible(false);
    setRequestToDelete(null);
  };

  const handleSendNotification = async () => {
    if (!notificationData.title.trim() || !notificationData.message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      if (notificationData.recipientEmail) {
        // Send to specific user
        const userQuery = query(
          collection(db, 'users'),
          where('email', '==', notificationData.recipientEmail)
        );
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
          Alert.alert('Error', 'User not found with this email');
          return;
        }

        const targetUser = userSnapshot.docs[0];
        await sendPushNotification(
          targetUser.id,
          notificationData.title,
          notificationData.message
        );

        // Also store in notifications collection for the user
        await addDoc(collection(db, 'notifications'), {
          userId: targetUser.id,
          type: 'admin_push',
          title: notificationData.title,
          message: notificationData.message,
          timestamp: serverTimestamp(),
          read: false,
          sentBy: user?.uid,
        });

        Alert.alert('Success', 'Push notification sent to user successfully!');
      } else {
        // Send to all users (broadcast)
        await sendBroadcastNotification(
          notificationData.title,
          notificationData.message
        );

        // Store broadcast notification for all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const notificationPromises = usersSnapshot.docs.map(userDoc =>
          addDoc(collection(db, 'notifications'), {
            userId: userDoc.id,
            type: 'admin_broadcast',
            title: notificationData.title,
            message: notificationData.message,
            timestamp: serverTimestamp(),
            read: false,
            sentBy: user?.uid,
          })
        );

        await Promise.all(notificationPromises);
        Alert.alert('Success', `Push notification sent to ${usersSnapshot.docs.length} users successfully!`);
      }

      setNotificationModal(false);
      setNotificationData({ title: '', message: '', recipientEmail: '' });
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', 'Failed to send notification');
    }
  };

  // Create dynamic styles based on theme
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
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.secondaryText,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primaryText,
    },
    notificationButton: {
      padding: 8,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 16,
      color: colors.secondaryText,
    },
    activeTabText: {
      color: colors.primary,
      fontWeight: '600',
    },
    content: {
      flex: 1,
    },
    section: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primaryText,
      marginBottom: 16,
    },
    userCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryText,
    },
    userEmail: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 2,
    },
    userDetails: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 4,
    },
    requestCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    requestInfo: {
      flex: 1,
    },
    requestTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryText,
    },
    requestDescription: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 4,
      lineHeight: 20,
    },
    requestDetails: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 8,
    },
    requestNotes: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 6,
      fontStyle: 'italic',
    },
    userActions: {
      flexDirection: 'row',
      gap: 8,
    },
    roleButton: {
      padding: 8,
      backgroundColor: colors.primary + '20',
      borderRadius: 6,
    },
    deleteButton: {
      padding: 8,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
      marginBottom: 20,
      textAlign: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 16,
      color: colors.primaryText,
      backgroundColor: colors.screenBackground,
    },
    messageInput: {
      height: 100,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      color: colors.secondaryText,
    },
    sendButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    sendButtonText: {
      fontSize: 16,
      color: 'white',
      fontWeight: '600',
    },
    modalSubtitle: {
      fontSize: 16,
      color: colors.secondaryText,
      textAlign: 'center',
      marginBottom: 24,
    },
    roleOptions: {
      gap: 12,
      marginBottom: 24,
    },
    roleOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    roleOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    roleOptionText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryText,
      marginLeft: 12,
      flex: 1,
    },
    roleOptionTextSelected: {
      color: 'white',
    },
    roleOptionDesc: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 2,
    },
    roleOptionDescSelected: {
      color: 'rgba(255,255,255,0.8)',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalMessage: {
      fontSize: 16,
      color: colors.secondaryText,
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
    deleteConfirmButton: {
      backgroundColor: colors.primary,
    },
    deleteConfirmButtonText: {
      fontSize: 16,
      color: 'white',
      fontWeight: '600',
    },
  });

  if (initializing || !userProfile) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={dynamicStyles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  if (userProfile.role?.trim()?.toLowerCase() !== 'admin') {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={dynamicStyles.loadingText}>Access denied</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={dynamicStyles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.secondaryText} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity
          onPress={() => setNotificationModal(true)}
          style={dynamicStyles.notificationButton}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.tabBar}>
        <TouchableOpacity
          style={[dynamicStyles.tab, activeTab === 'users' && dynamicStyles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[dynamicStyles.tabText, activeTab === 'users' && dynamicStyles.activeTabText]}>
            Users ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[dynamicStyles.tab, activeTab === 'requests' && dynamicStyles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[dynamicStyles.tabText, activeTab === 'requests' && dynamicStyles.activeTabText]}>
            Requests ({requests.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={dynamicStyles.content}>
        {activeTab === 'users' && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>User Management</Text>
            {users.map(user => (
              <View key={user.id} style={dynamicStyles.userCard}>
                <View style={dynamicStyles.userInfo}>
                  <Text style={dynamicStyles.userName}>{user.fullName}</Text>
                  <Text style={dynamicStyles.userEmail}>{user.email}</Text>
                  <Text style={dynamicStyles.userDetails}>
                    {user.bloodType} • {user.city} • {user.role}
                  </Text>
                </View>
                <View style={dynamicStyles.userActions}>
                  <TouchableOpacity
                    onPress={() => openRoleModal(user)}
                    style={dynamicStyles.roleButton}
                  >
                    <Ionicons name="person-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteUser(user)}
                    style={dynamicStyles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'requests' && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Request Management</Text>
            {requests.map(request => (
              <View key={request.id} style={dynamicStyles.requestCard}>
                <View style={dynamicStyles.requestInfo}>
                  <Text style={dynamicStyles.requestTitle}>{request.fullName}</Text>
                  <Text style={dynamicStyles.requestDescription}>
                    {request.hospital} • {request.contactNumber}
                  </Text>
                  <Text style={dynamicStyles.requestDetails}>
                    {request.bloodType} • {request.city}
                    {request.urgent && ' • URGENT'}
                  </Text>
                  {request.notes && (
                    <Text style={dynamicStyles.requestNotes} numberOfLines={2}>
                      {request.notes}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteRequest(request)}
                  style={dynamicStyles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={notificationModal} animationType="slide" transparent>
        <View style={dynamicStyles.modalContainer}>
          <View style={dynamicStyles.modalContent}>
            <Text style={dynamicStyles.modalTitle}>Send Notification</Text>

            <TextInput
              style={dynamicStyles.input}
              placeholder="Notification Title"
              value={notificationData.title}
              onChangeText={(text) => setNotificationData(prev => ({ ...prev, title: text }))}
            />

            <TextInput
              style={[dynamicStyles.input, dynamicStyles.messageInput]}
              placeholder="Notification Message"
              value={notificationData.message}
              onChangeText={(text) => setNotificationData(prev => ({ ...prev, message: text }))}
              multiline
              numberOfLines={4}
            />

            <TextInput
              style={dynamicStyles.input}
              placeholder="Recipient Email (leave empty for all users)"
              value={notificationData.recipientEmail}
              onChangeText={(text) => setNotificationData(prev => ({ ...prev, recipientEmail: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={dynamicStyles.modalActions}>
              <TouchableOpacity
                onPress={() => setNotificationModal(false)}
                style={dynamicStyles.cancelButton}
              >
                <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendNotification} style={dynamicStyles.sendButton}>
                <Text style={dynamicStyles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={roleModal} animationType="slide" transparent>
        <View style={dynamicStyles.modalContainer}>
          <View style={dynamicStyles.modalContent}>
            <Text style={dynamicStyles.modalTitle}>Change User Role</Text>
            <Text style={dynamicStyles.modalSubtitle}>
              Select a new role for {selectedUser?.fullName}
            </Text>

            <View style={dynamicStyles.roleOptions}>
              <TouchableOpacity
                style={[dynamicStyles.roleOption, selectedUser?.role === 'user' && dynamicStyles.roleOptionSelected]}
                onPress={() => handleChangeRole('user')}
              >
                <Ionicons name="person" size={24} color={selectedUser?.role === 'user' ? 'white' : colors.secondaryText} />
                <Text style={[dynamicStyles.roleOptionText, selectedUser?.role === 'user' && dynamicStyles.roleOptionTextSelected]}>
                  User
                </Text>
                <Text style={[dynamicStyles.roleOptionDesc, selectedUser?.role === 'user' && dynamicStyles.roleOptionDescSelected]}>
                  Regular user with basic access
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[dynamicStyles.roleOption, selectedUser?.role === 'moderator' && dynamicStyles.roleOptionSelected]}
                onPress={() => handleChangeRole('moderator')}
              >
                <Ionicons name="shield-checkmark" size={24} color={selectedUser?.role === 'moderator' ? 'white' : colors.secondaryText} />
                <Text style={[dynamicStyles.roleOptionText, selectedUser?.role === 'moderator' && dynamicStyles.roleOptionTextSelected]}>
                  Moderator
                </Text>
                <Text style={[dynamicStyles.roleOptionDesc, selectedUser?.role === 'moderator' && dynamicStyles.roleOptionDescSelected]}>
                  Can delete requests only
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[dynamicStyles.roleOption, selectedUser?.role === 'admin' && dynamicStyles.roleOptionSelected]}
                onPress={() => handleChangeRole('admin')}
              >
                <Ionicons name="settings" size={24} color={selectedUser?.role === 'admin' ? 'white' : colors.secondaryText} />
                <Text style={[dynamicStyles.roleOptionText, selectedUser?.role === 'admin' && dynamicStyles.roleOptionTextSelected]}>
                  Admin
                </Text>
                <Text style={[dynamicStyles.roleOptionDesc, selectedUser?.role === 'admin' && dynamicStyles.roleOptionDescSelected]}>
                  Full administrative access
                </Text>
              </TouchableOpacity>
            </View>

            <View style={dynamicStyles.modalActions}>
              <TouchableOpacity
                onPress={() => setRoleModal(false)}
                style={dynamicStyles.cancelButton}
              >
                <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        visible={deleteUserModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDeleteUser}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <View style={dynamicStyles.modalHeader}>
              <Ionicons name="person-remove" size={24} color={colors.primary} />
              <Text style={dynamicStyles.modalTitle}>Delete User</Text>
            </View>

            <Text style={dynamicStyles.modalMessage}>
              Are you sure you want to delete "{userToDelete?.fullName}"'s account?
              This action cannot be undone.
            </Text>

            <View style={dynamicStyles.modalButtons}>
              <TouchableOpacity
                style={[dynamicStyles.modalButton, dynamicStyles.cancelButton]}
                onPress={cancelDeleteUser}
              >
                <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[dynamicStyles.modalButton, dynamicStyles.deleteConfirmButton]}
                onPress={confirmDeleteUser}
              >
                <Ionicons name="person-remove" size={16} color="white" />
                <Text style={dynamicStyles.deleteConfirmButtonText}>Delete User</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Request Modal */}
      <Modal
        visible={deleteRequestModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDeleteRequest}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <View style={dynamicStyles.modalHeader}>
              <Ionicons name="trash-outline" size={24} color={colors.primary} />
              <Text style={dynamicStyles.modalTitle}>Delete Request</Text>
            </View>

            <Text style={dynamicStyles.modalMessage}>
              Are you sure you want to delete "{requestToDelete?.fullName}"'s blood donation request?
              This action cannot be undone.
            </Text>

            <View style={dynamicStyles.modalButtons}>
              <TouchableOpacity
                style={[dynamicStyles.modalButton, dynamicStyles.cancelButton]}
                onPress={cancelDeleteRequest}
              >
                <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[dynamicStyles.modalButton, dynamicStyles.deleteConfirmButton]}
                onPress={confirmDeleteRequest}
              >
                <Ionicons name="trash" size={16} color="white" />
                <Text style={dynamicStyles.deleteConfirmButtonText}>Delete Request</Text>
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  notificationButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#E53E3E',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#E53E3E',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userDetails: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  requestDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 20,
  },
  requestDetails: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  requestNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    padding: 8,
    backgroundColor: '#EBF8FF',
    borderRadius: 6,
  },
  deleteButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  sendButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E53E3E',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  roleOptions: {
    gap: 12,
    marginBottom: 24,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  roleOptionSelected: {
    backgroundColor: '#E53E3E',
    borderColor: '#E53E3E',
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 12,
    flex: 1,
  },
  roleOptionTextSelected: {
    color: 'white',
  },
  roleOptionDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  roleOptionDescSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  deleteConfirmButton: {
    backgroundColor: '#E53E3E',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
