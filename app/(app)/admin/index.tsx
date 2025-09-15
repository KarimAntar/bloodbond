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
import { db } from '../../../firebase/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
// Notifications are sent via serverless API: /api/sendNotification
// (uses FCM service account loaded from FCM_SERVICE_ACCOUNT env var)

interface User {
  id: string;
  fullName: string;
  email: string;
  bloodType?: string;
  city?: string;
  role?: string;
  photoURL?: string;
  createdAt?: any;
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
  createdAt?: any;
}

export default function AdminDashboard() {
  const { user, userProfile, initializing } = useAuth();
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'notifications'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [userTokens, setUserTokens] = useState<any[]>([]); // token docs
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [notificationImageUrl, setNotificationImageUrl] = useState<string>('');
  const [localImageUri, setLocalImageUri] = useState<string>('');
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
    if (initializing) return;
    if (!userProfile) return;
    if (!user || userProfile.role?.trim()?.toLowerCase() !== 'admin') {
      router.replace('/(app)/(tabs)');
      return;
    }
    loadData();
  }, [initializing, user, userProfile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as User[];
      setUsers(usersData);

      const requestsQuery = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData = requestsSnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as BloodRequest[];
      setRequests(requestsData);

      // Load tokens
      try {
        const tokensSnapshot = await getDocs(collection(db, 'userTokens'));
        const tokensData = tokensSnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setUserTokens(tokensData);
      } catch (tokenErr) {
        console.warn('Failed to load userTokens collection', tokenErr);
        setUserTokens([]);
      }
    } catch (e) {
      console.error('Error loading data:', e);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // refresh tokens when opening notifications tab so recipient list is fresh
  const loadUserTokens = async () => {
    try {
      const tokensSnapshot = await getDocs(collection(db, 'userTokens'));
      const tokensData = tokensSnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setUserTokens(tokensData);
    } catch (err) {
      console.warn('Failed to load userTokens', err);
      setUserTokens([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'notifications') {
      loadUserTokens();
      (async () => {
        try {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const usersData = usersSnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as User[];
          setUsers(usersData);
        } catch (e) {
          console.warn('Failed to refresh users', e);
        }
      })();
    }
  }, [activeTab]);

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
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setLocalImageUri(uri);

        try {
          // Convert image to base64
          const response = await fetch(uri);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const filename = uri.split('/').pop() || `notif_${Date.now()}.jpg`;

          // Upload via API
          const apiOrigin = (typeof process !== 'undefined' && (process.env.SEND_ORIGIN || (process.env as any).EXPO_PUBLIC_SEND_ORIGIN))
            ? (process.env.SEND_ORIGIN || (process.env as any).EXPO_PUBLIC_SEND_ORIGIN)
            : 'https://www.bloodbond.app';

          console.log('Uploading image to:', `${apiOrigin}/api/uploadImage`);
          console.log('Image data length:', base64.length);
          console.log('Filename:', filename);

          const uploadResponse = await fetch(`${apiOrigin}/api/uploadImage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageData: base64,
              filename,
            }),
          });

          console.log('Upload response status:', uploadResponse.status);
          console.log('Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Upload failed with status:', uploadResponse.status, 'Response:', errorText);
            throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
          }

          const uploadResult = await uploadResponse.json();
          console.log('Upload result:', uploadResult);

          if (uploadResult.success) {
            setNotificationImageUrl(uploadResult.downloadUrl);
            Alert.alert('Image uploaded', 'Image uploaded and attached to notification.');
          } else {
            throw new Error(uploadResult.error || 'Upload failed');
          }
        } catch (uploadErr) {
          console.error('Upload error', uploadErr);
          Alert.alert('Upload failed', String((uploadErr as Error)?.message || uploadErr));
        }
      }
    } catch (err) {
      console.error('Image pick error', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleDeleteUser = (u: User) => {
    setUserToDelete(u);
    setDeleteUserModalVisible(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteUserModalVisible(false);
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      setUsers(prev => prev.filter(x => x.id !== userToDelete.id));
      Alert.alert('Success', 'User deleted successfully');
      setUserToDelete(null);
    } catch (e) {
      console.error('Error deleting user:', e);
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
      await updateDoc(doc(db, 'users', selectedUser.id), { role: newRole });
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
      Alert.alert('Success', `${selectedUser.fullName}'s role changed to ${newRole}`);
      setRoleModal(false);
      setSelectedUser(null);
    } catch (e) {
      console.error('Error changing role:', e);
      Alert.alert('Error', 'Failed to change role');
    }
  };

  const openRoleModal = (u: User) => {
    setSelectedUser(u);
    setRoleModal(true);
  };

  const handleDeleteRequest = (r: BloodRequest) => {
    setRequestToDelete(r);
    setDeleteRequestModalVisible(true);
  };

  const confirmDeleteRequest = async () => {
    if (!requestToDelete) return;
    setDeleteRequestModalVisible(false);
    try {
      await deleteDoc(doc(db, 'requests', requestToDelete.id));
      setRequests(prev => prev.filter(x => x.id !== requestToDelete.id));
      Alert.alert('Success', 'Request deleted successfully');
      setRequestToDelete(null);
    } catch (e) {
      console.error('Error deleting request:', e);
      Alert.alert('Error', 'Failed to delete request');
      setRequestToDelete(null);
    }
  };

  const cancelDeleteRequest = () => {
    setDeleteRequestModalVisible(false);
    setRequestToDelete(null);
  };

  // send notification: client will call the server API; avoid writing notification docs here
  const handleSendNotification = async () => {
    if (!notificationData.title.trim() || !notificationData.message.trim()) {
      Alert.alert('Error', 'Please fill in Title and Body');
      return;
    }

    try {
      const dataPayload: any = {};
      if (notificationImageUrl) dataPayload.image = notificationImageUrl;

      // Prefer explicit SEND_ORIGIN env var (EXPO_PUBLIC_SEND_ORIGIN supported).
      // Never rely on window.location.origin to avoid using a local dev origin (localhost).
      // This ensures admin always targets the configured production/send origin.
      const apiOrigin = (typeof process !== 'undefined' && (process.env.SEND_ORIGIN || (process.env as any).EXPO_PUBLIC_SEND_ORIGIN))
        ? (process.env.SEND_ORIGIN || (process.env as any).EXPO_PUBLIC_SEND_ORIGIN)
        : 'https://www.bloodbond.app';

      // If "selectAll" is true OR no selected users (and not explicit selection), treat as broadcast
      if (selectAll || (selectedUserIds.length === 0 && !selectAll)) {
        const resp = await fetch(`${apiOrigin}/api/sendNotification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'broadcast',
            title: notificationData.title,
            body: notificationData.message,
            data: dataPayload,
          }),
        });

        const json = await resp.json().catch(() => ({} as any));
        Alert.alert('Success', `Broadcast request sent. ${json.sent ? json.sent + ' delivered (approx)' : ''}`);
      } else {
        // send per selected user (server will resolve tokens)
        const promises = selectedUserIds.map(uid =>
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

        const results = await Promise.all(promises);
        const parsed = await Promise.all(results.map(r => r.json().catch(() => ({} as any))));
        const totalSent = parsed.reduce((acc: any, p: any) => acc + (p.sent || 0), 0);
        Alert.alert('Success', `Notification send requests complete. ${totalSent ? totalSent + ' delivered (approx)' : ''}`);
      }

      // Reset local UI state (do not create duplicate in-app notifications from client)
      setNotificationModal(false);
      setNotificationData({ title: '', message: '', recipientEmail: '' });
      setSelectedUserIds([]);
      setSelectAll(false);
      setNotificationImageUrl('');
      setLocalImageUri('');
    } catch (e) {
      console.error('Error sending notification:', e);
      Alert.alert('Error', 'Failed to send notification');
    }
  };

  // UI helpers
  const activeTokenUserIds = Array.from(new Set(userTokens.filter((t: any) => t.active !== false).map((t: any) => t.userId))).filter(Boolean);

  // dynamic styles
  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.screenBackground },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.screenBackground },
    loadingText: { marginTop: 16, fontSize: 16, color: colors.secondaryText },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primaryText },
    notificationButton: { padding: 8 },
    tabBar: { flexDirection: 'row', backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border },
    tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
    activeTab: { borderBottomWidth: 2, borderBottomColor: colors.primary },
    tabText: { fontSize: 16, color: colors.secondaryText },
    activeTabText: { color: colors.primary, fontWeight: '600' },
    content: { flex: 1 },
    section: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryText, marginBottom: 16 },
    userCard: { backgroundColor: colors.cardBackground, borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '600', color: colors.primaryText },
    userEmail: { fontSize: 14, color: colors.secondaryText, marginTop: 2 },
    userDetails: { fontSize: 12, color: colors.secondaryText, marginTop: 4 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, color: colors.primaryText, backgroundColor: colors.screenBackground },
    messageInput: { height: 100, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    cancelButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    cancelButtonText: { fontSize: 16, color: colors.secondaryText },
    sendButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' },
    sendButtonText: { fontSize: 16, color: 'white', fontWeight: '600' },
    modalSubtitle: { fontSize: 16, color: colors.secondaryText, textAlign: 'center', marginBottom: 24 },
    roleOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground },
    roleOptionText: { fontSize: 16, fontWeight: '600', color: colors.primaryText, marginLeft: 12, flex: 1 },
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
        <TouchableOpacity onPress={() => setNotificationModal(true)} style={dynamicStyles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.tabBar}>
        <TouchableOpacity style={[dynamicStyles.tab, activeTab === 'users' && dynamicStyles.activeTab]} onPress={() => setActiveTab('users')}>
          <Text style={[dynamicStyles.tabText, activeTab === 'users' && dynamicStyles.activeTabText]}>Users ({users.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[dynamicStyles.tab, activeTab === 'notifications' && dynamicStyles.activeTab]} onPress={() => setActiveTab('notifications')}>
          <Text style={[dynamicStyles.tabText, activeTab === 'notifications' && dynamicStyles.activeTabText]}>Push Notifications</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={dynamicStyles.content}>
        {activeTab === 'users' && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>User Management</Text>
            {users.map(u => (
              <View key={u.id} style={dynamicStyles.userCard}>
                <View style={dynamicStyles.userInfo}>
                  <Text style={dynamicStyles.userName}>{u.fullName}</Text>
                  <Text style={dynamicStyles.userEmail}>{u.email}</Text>
                  <Text style={dynamicStyles.userDetails}>{u.bloodType || ''} • {u.city || ''} • {u.role || ''}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => openRoleModal(u)} style={dynamicStyles.roleOption}>
                    <Ionicons name="person-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteUser(u)} style={dynamicStyles.roleOption}>
                    <Ionicons name="trash-outline" size={18} color={colors.primary} />
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
              placeholder="Title"
              value={notificationData.title}
              onChangeText={(t) => setNotificationData(prev => ({ ...prev, title: t }))}
            />

            <TextInput
              style={[dynamicStyles.input, dynamicStyles.messageInput]}
              placeholder="Body"
              value={notificationData.message}
              onChangeText={(t) => setNotificationData(prev => ({ ...prev, message: t }))}
              multiline
              numberOfLines={4}
            />

            <TextInput
              style={dynamicStyles.input}
              placeholder="Optional image URL (or upload below)"
              value={notificationImageUrl}
              onChangeText={(t) => setNotificationImageUrl(t)}
            />

            {/* Pick image from device + preview */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <TouchableOpacity onPress={pickImageFromDevice} style={[dynamicStyles.roleOption, { paddingVertical: 10, paddingHorizontal: 12 }]}>
                <Ionicons name="image-outline" size={20} color={colors.primary} />
                <Text style={[dynamicStyles.roleOptionText, { marginLeft: 8, fontSize: 14 }]}>Pick image from device</Text>
              </TouchableOpacity>

              {(localImageUri || notificationImageUrl) ? (
                <View style={{ marginLeft: 6 }}>
                  <Image source={{ uri: localImageUri || notificationImageUrl }} style={{ width: 56, height: 56, borderRadius: 8 }} />
                </View>
              ) : null}
            </View>

            {/* Select All (only users with active tokens) */}
            <View style={{ marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  const newSelectAll = !selectAll;
                  setSelectAll(newSelectAll);
                  if (newSelectAll) {
                    const uniqueUsers = activeTokenUserIds;
                    setSelectedUserIds(uniqueUsers);
                  } else {
                    setSelectedUserIds([]);
                  }
                }}
                style={[dynamicStyles.roleOption, { justifyContent: 'space-between' }]}
              >
                <Text style={dynamicStyles.roleOptionText}>Select All (broadcast to users with tokens)</Text>
                <Ionicons name={selectAll ? "checkbox" : "square-outline"} size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={[dynamicStyles.modalSubtitle, { textAlign: 'left', marginBottom: 8 }]}>Available recipients (select one or many)</Text>

            <ScrollView style={{ maxHeight: 260, marginBottom: 12 }}>
              {activeTokenUserIds.map(uid => {
                const profile = users.find(u => u.id === uid) as any;
                const fullName = profile?.fullName || 'Unknown user';
                const photo = profile?.photoURL || profile?.photoUrl || '';
                const isSelected = selectedUserIds.includes(uid);

                return (
                  <TouchableOpacity
                    key={uid}
                    onPress={() => {
                      if (selectedUserIds.includes(uid)) {
                        setSelectedUserIds(prev => prev.filter(id => id !== uid));
                        setSelectAll(false);
                      } else {
                        setSelectedUserIds(prev => [...prev, uid]);
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
              <TouchableOpacity onPress={() => {
                setNotificationData({ title: '', message: '', recipientEmail: '' });
                setSelectedUserIds([]);
                setSelectAll(false);
                setNotificationImageUrl('');
                setLocalImageUri('');
              }} style={dynamicStyles.cancelButton}>
                <Text style={dynamicStyles.cancelButtonText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSendNotification} style={dynamicStyles.sendButton}>
                <Text style={dynamicStyles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal: alternative send UI (keeps existing modal but it will call same handler) */}
      <Modal visible={notificationModal} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, padding: 18, width: '92%', maxWidth: 420 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primaryText, marginBottom: 12, textAlign: 'center' }}>Send Notification</Text>

            <TextInput style={dynamicStyles.input} placeholder="Title" value={notificationData.title} onChangeText={(t) => setNotificationData(prev => ({ ...prev, title: t }))} />
            <TextInput style={[dynamicStyles.input, dynamicStyles.messageInput]} placeholder="Message" value={notificationData.message} onChangeText={(t) => setNotificationData(prev => ({ ...prev, message: t }))} multiline numberOfLines={4} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <TouchableOpacity onPress={() => setNotificationModal(false)} style={dynamicStyles.cancelButton}>
                <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendNotification} style={dynamicStyles.sendButton}>
                <Text style={dynamicStyles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Role modal, delete modals (kept unchanged structurally) */}
      <Modal visible={roleModal} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, padding: 18, width: '92%', maxWidth: 420 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primaryText, marginBottom: 12 }}>Change User Role</Text>
            <Text style={{ marginBottom: 12, color: colors.secondaryText }}>Select a new role for {selectedUser?.fullName}</Text>

            <View style={{ gap: 8 }}>
              <TouchableOpacity onPress={() => handleChangeRole('user')} style={dynamicStyles.roleOption}>
                <Ionicons name="person" size={20} color={colors.secondaryText} />
                <Text style={dynamicStyles.roleOptionText}>User</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleChangeRole('moderator')} style={dynamicStyles.roleOption}>
                <Ionicons name="shield-checkmark" size={20} color={colors.secondaryText} />
                <Text style={dynamicStyles.roleOptionText}>Moderator</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleChangeRole('admin')} style={dynamicStyles.roleOption}>
                <Ionicons name="settings" size={20} color={colors.secondaryText} />
                <Text style={dynamicStyles.roleOptionText}>Admin</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setRoleModal(false)} style={dynamicStyles.cancelButton}>
                <Text style={dynamicStyles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete user modal */}
      <Modal visible={deleteUserModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, padding: 18, width: '92%', maxWidth: 420 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primaryText, marginBottom: 8 }}>Delete User</Text>
            <Text style={{ color: colors.secondaryText, marginBottom: 12 }}>Are you sure you want to delete "{userToDelete?.fullName}"'s account? This action cannot be undone.</Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={cancelDeleteUser} style={dynamicStyles.cancelButton}><Text style={dynamicStyles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteUser} style={dynamicStyles.sendButton}><Text style={dynamicStyles.sendButtonText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete request modal */}
      <Modal visible={deleteRequestModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, padding: 18, width: '92%', maxWidth: 420 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primaryText, marginBottom: 8 }}>Delete Request</Text>
            <Text style={{ color: colors.secondaryText, marginBottom: 12 }}>Are you sure you want to delete "{requestToDelete?.fullName}"'s request? This action cannot be undone.</Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={cancelDeleteRequest} style={dynamicStyles.cancelButton}><Text style={dynamicStyles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteRequest} style={dynamicStyles.sendButton}><Text style={dynamicStyles.sendButtonText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
});
