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
  Image,
  Platform,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors } from '../../../constants/Colors';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db, storage } from '../../../firebase/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  where,
  updateDoc,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
 // Notifications are sent via serverless API: /api/sendNotification
 // (uses FCM service account loaded from FCM_SERVICE_ACCOUNT env var)

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
  const [userTokens, setUserTokens] = useState<any[]>([]); // { id, userId, token, platform }
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [notificationImageUrl, setNotificationImageUrl] = useState<string>('');
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

      // Load user tokens for push targeting (userTokens collection)
      // Each token doc expected to contain: userId, token, platform, createdAt, optionally deviceId
      try {
        const tokensSnapshot = await getDocs(collection(db, 'userTokens'));
        const tokensData = tokensSnapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setUserTokens(tokensData);
      } catch (tokenErr) {
        console.warn('Failed to load userTokens collection', tokenErr);
        setUserTokens([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh userTokens independently so the notifications tab always shows the latest recipients
  const loadUserTokens = async () => {
    try {
      const tokensSnapshot = await getDocs(collection(db, 'userTokens'));
      const tokensData = tokensSnapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setUserTokens(tokensData);
    } catch (err) {
      console.warn('Failed to load userTokens', err);
      setUserTokens([]);
    }
  };

  useEffect(() => {
    // When opening the Push Notifications tab refresh tokens and users so recipient list is up-to-date
    if (activeTab === 'notifications') {
      loadUserTokens();
      (async () => {
        try {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const usersData = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as User[];
          setUsers(usersData);
        } catch (e) {
          console.warn('Failed to refresh users', e);
        }
      })();
    }
  }, [activeTab]);

  // Image picker + upload flow for notification images (device upload)
  const [localImageUri, setLocalImageUri] = useState<string>('');

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        try {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission required', 'Permission to access media library is required to upload images.');
          }
        } catch (permErr) {
          console.warn('Image picker permission error', permErr);
        }
      }
    })();
  }, []);

  const pickImageFromDevice = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setLocalImageUri(uri);

        // upload to Firebase Storage
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const filename = uri.split('/').pop() || `notif_${Date.now()}.jpg`;
          const storageReference = storageRef(storage, `notifications/${Date.now()}_${filename}`);
          await uploadBytes(storageReference, blob);
          const downloadUrl = await getDownloadURL(storageReference);
          setNotificationImageUrl(downloadUrl);
          Alert.alert('Image uploaded', 'Image uploaded and attached to notification.');
        } catch (uploadErr) {
          console.error('Upload error', uploadErr);
          Alert.alert('Upload failed', 'Failed to upload image to storage.');
        }
      }
    } catch (err) {
      console.error('Image pick error', err);
      Alert.alert('Error', 'Failed to pick image');
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
      // Prepare optional image data
      const dataPayload: any = {};
      if (notificationImageUrl) {
        dataPayload.image = notificationImageUrl;
      }

      const apiOrigin = (typeof window !== 'undefined' && window.location && window.location.origin)
        ? window.location.origin
        : 'https://www.bloodbond.app';

      if (selectAll || (selectedUserIds.length === 0 && !selectAll)) {
        // Broadcast to all users
        await fetch(`${apiOrigin}/api/sendNotification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'broadcast',
            title: notificationData.title,
            body: notificationData.message,
            data: dataPayload,
          }),
        });

        // Store broadcast notification for all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const notificationPromises = usersSnapshot.docs.map(userDoc =>
          addDoc(collection(db, 'notifications'), {
            userId: userDoc.id,
            type: 'admin_broadcast',
            title: notificationData.title,
            message: notificationData.message,
            image: notificationImageUrl || null,
            timestamp: serverTimestamp(),
            read: false,
            sentBy: user?.uid,
          })
        );

        await Promise.all(notificationPromises);
        Alert.alert('Success', `Push notification sent to ${usersSnapshot.docs.length} users successfully!`);
      } else {
        // Send to selected users
        const sendPromises = selectedUserIds.map(uid =>
          fetch(`${apiOrigin}/api/sendNotification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'user',
              userId: uid,
              title: notificationData.title,
              body: notificationData.message,
              data: dataPayload,
            }),
          })
        );

        await Promise.all(sendPromises);

        // Store notification docs per selected user
        const savePromises = selectedUserIds.map(uid =>
          addDoc(collection(db, 'notifications'), {
            userId: uid,
            type: 'admin_push',
            title: notificationData.title,
            message: notificationData.message,
            image: notificationImageUrl || null,
            timestamp: serverTimestamp(),
            read: false,
            sentBy: user?.uid,
          })
        );

        await Promise.all(savePromises);

        Alert.alert('Success', `Push notification sent to ${selectedUserIds.length} users successfully!`);
      }

      // Reset modal state
      setNotificationModal(false);
      setNotificationData({ title: '', message: '', recipientEmail: '' });
      setSelectedUserIds([]);
      setSelectAll(false);
      setNotificationImageUrl('');
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
      boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

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
      boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

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
          style={[dynamicStyles.tab, activeTab === 'notifications' && dynamicStyles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[dynamicStyles.tabText, activeTab === 'notifications' && dynamicStyles.activeTabText]}>
            Push Notifications
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

        {activeTab === 'notifications' && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Push Notifications</Text>

            <TextInput
              style={dynamicStyles.input}
              placeholder="Notification Title"
              value={notificationData.title}
              onChangeText={(text) => setNotificationData(prev => ({ ...prev, title: text }))}
            />

            <TextInput
              style={[dynamicStyles.input, dynamicStyles.messageInput]}
              placeholder="Notification Body"
              value={notificationData.message}
              onChangeText={(text) => setNotificationData(prev => ({ ...prev, message: text }))}
              multiline
              numberOfLines={4}
            />

            <TextInput
              style={dynamicStyles.input}
              placeholder="Optional image URL (or paste a storage URL)"
              value={notificationImageUrl}
              onChangeText={(text) => setNotificationImageUrl(text)}
            />

            <View style={{ marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  const newSelectAll = !selectAll;
                  setSelectAll(newSelectAll);
                  if (newSelectAll) {
                    // select all unique users that have tokens
                    const uniqueUsers = Array.from(new Set(userTokens.map(t => t.userId))).filter(Boolean);
                    setSelectedUserIds(uniqueUsers);
                  } else {
                    setSelectedUserIds([]);
                  }
                }}
                style={[dynamicStyles.roleOption, { justifyContent: 'space-between' }]}
              >
                <Text style={dynamicStyles.roleOptionText}>Select All (broadcast)</Text>
                <Ionicons name={selectAll ? "checkbox" : "square-outline"} size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={[dynamicStyles.modalSubtitle, { textAlign: 'left', marginBottom: 8 }]}>
              Available recipients (select one or many)
            </Text>

            <ScrollView style={{ maxHeight: 240, marginBottom: 12 }}>
              {Array.from(new Set(userTokens.map(t => t.userId))).filter(Boolean).map(uid => {
                const profile = users.find(u => u.id === uid) as any;
                const fullName = profile?.fullName || 'Unknown user';
                const photo = profile?.photoURL || profile?.photoUrl || '';
                const isSelected = selectedUserIds.includes(uid);

                return (
                  <TouchableOpacity
                    key={uid}
                    onPress={() => {
                      if (selectedUserIds.includes(uid)) {
                        setSelectedUserIds(selectedUserIds.filter(id => id !== uid));
                        setSelectAll(false);
                      } else {
                        setSelectedUserIds([...selectedUserIds, uid]);
                      }
                    }}
                    style={[dynamicStyles.userCard, { flexDirection: 'row', alignItems: 'center' }]}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee', marginRight: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                      {photo ? (
                        <Image source={{ uri: photo }} style={{ width: 48, height: 48 }} />
                      ) : (
                        <Ionicons name="person-circle-outline" size={36} color={colors.secondaryText} />
                      )}
                    </View>

                    <View style={dynamicStyles.userInfo}>
                      <Text style={dynamicStyles.userName}>{fullName}</Text>
                    </View>

                    <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={22} color={isSelected ? colors.primary : colors.secondaryText} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={dynamicStyles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  // reset local notification form
                  setNotificationData({ title: '', message: '', recipientEmail: '' });
                  setSelectedUserIds([]);
                  setSelectAll(false);
                  setNotificationImageUrl('');
                }}
                style={dynamicStyles.cancelButton}
              >
                <Text style={dynamicStyles.cancelButtonText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSendNotification} style={dynamicStyles.sendButton}>
                <Text style={dynamicStyles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
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
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

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
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

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
