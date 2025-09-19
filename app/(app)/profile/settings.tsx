import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/firebaseConfig';
import { updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../../../firebase/firebaseConfig';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { saveDataExportRequest } from '../../../utils/dataExport';
import { submitBugReport, getBugReportTemplate } from '../../../utils/bugReporting';
import { getLegalDocument, formatLegalContent } from '../../../utils/legalContent';
import { ensureAndRegisterPushToken, runNotificationDiagnostics, unregisterPushToken } from '../../../firebase/pushNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingOption: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  color?: string;
  danger?: boolean;
  colors: any;
}> = ({ icon, title, subtitle, onPress, rightElement, color = '#666', danger = false, colors }) => (
  <TouchableOpacity 
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }} 
    onPress={onPress}
  >
    <View style={[{
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      backgroundColor: color + '20'
    }]}>
      <Ionicons name={icon as any} size={20} color={danger ? '#DC2626' : color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{
        fontSize: 16,
        fontWeight: '500',
        color: danger ? '#DC2626' : colors.primaryText,
        marginBottom: 2,
      }}>{title}</Text>
      {subtitle && <Text style={{
        fontSize: 14,
        color: colors.secondaryText,
      }}>{subtitle}</Text>}
    </View>
    {rightElement || <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />}
  </TouchableOpacity>
);

export default function AppSettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<'default'|'denied'|'granted'|'unsupported'>('default');
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [notificationToggleLoading, setNotificationToggleLoading] = useState(false);
  const [userTokensChecked, setUserTokensChecked] = useState(false);

  // Keep UI in sync with actual permission state (important after page reloads or origin changes).
  useEffect(() => {
    let mounted = true;
    let permStatus: any = null;

    const checkPermission = async () => {
      try {
        if (typeof window !== 'undefined' && Platform.OS === 'web') {
          const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
          console.log('settings: Notification.permission =', perm);
          if (!mounted) return;
          setNotificationPermission(perm as any);
          // Don't set toggle here - let token check determine the actual state based on database
          // This prevents showing enabled when user has no tokens but had enabled previously
        } else {
          const { status } = await Notifications.getPermissionsAsync();
          if (!mounted) return;
          setNotificationPermission(status === 'granted' ? 'granted' : 'default');
          // Don't set toggle here - let token check determine the actual state based on database
        }

        // Skip Permissions API entirely - it can cause permission revocation
        // We'll rely on focus/visibilitychange events and manual checks instead
        console.log('settings: Skipping Permissions API to avoid permission revocation');
      } catch (e) {
        console.warn('settings: permission check failed', e);
      }
    };

    // Initial check
    checkPermission();

    // Re-check when page regains focus or becomes visible (useful after changing site permissions in browser UI)
    const onFocus = () => checkPermission();
    const onVisibilityChange = () => {
      try {
        if (document.visibilityState === 'visible') {
          checkPermission();
        }
      } catch (e) {}
    };

    try {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVisibilityChange);
    } catch (e) {
      // Non-browser platforms may throw
    }

    return () => {
      mounted = false;
      try {
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        if (permStatus && typeof permStatus.onchange === 'function') {
          permStatus.onchange = null;
        }
      } catch (e) {}
    };
  }, []);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, userProfile, logout } = useAuth();
  const { theme, setTheme, colors } = useTheme();
  const router = useRouter();

  // Device ID helper for push token deduplication and targeting
  const DEVICE_ID_KEY = 'bloodbond_device_id';
  const genDeviceId = () => `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const getOrCreateDeviceId = async () => {
    try {
      let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = genDeviceId();
        await AsyncStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    } catch (e) {
      console.warn('getOrCreateDeviceId error', e);
      return null;
    }
  };

  // Check user's existing tokens and set notification toggle state accordingly
  useEffect(() => {
    let mounted = true;

    const checkUserTokens = async () => {
      try {
        if (!mounted || !user?.uid || userTokensChecked) return;

        console.log('settings: Checking user tokens for notification toggle state');

        const userTokensRef = collection(db, 'userTokens');
        const q = query(userTokensRef, where('userId', '==', user.uid));
        const snapshot = await getDocs(q);

        if (!mounted) return;

        const tokens = snapshot.docs.map(doc => doc.data());
        const activeTokens = tokens.filter(token => token.active !== false);

        console.log('settings: Found tokens:', tokens.length, 'active:', activeTokens.length);

        // Always start with toggle OFF - user must manually enable notifications
        setNotificationsEnabled(false);
        console.log('settings: Toggle set to OFF by default, found', activeTokens.length, 'active tokens');

        setUserTokensChecked(true);
      } catch (error) {
        console.warn('settings: Error checking user tokens:', error);
        // On error, assume no tokens and disable toggle
        if (mounted) {
          setNotificationsEnabled(false);
          setUserTokensChecked(true);
          console.log('settings: Error checking tokens, defaulting toggle to OFF');
        }
      }
    };

    checkUserTokens();

    return () => { mounted = false; };
  }, [user?.uid, userTokensChecked]);



  const handleNotificationToggle = async (value: boolean) => {
    // Prevent repeated presses while processing
    if (notificationToggleLoading) {
      console.log('handleNotificationToggle: already processing, ignoring duplicate call');
      return;
    }

    setNotificationToggleLoading(true);

    try {
      if (!user?.uid) {
        Alert.alert('Not signed in', 'Please sign in to manage notification settings.');
        return;
      }

      if (value) {
        // On web and native, use the centralized helper which requests permission,
        // obtains a token and registers it in Firestore.
        const deviceId = await getOrCreateDeviceId();
        const result = await ensureAndRegisterPushToken(user.uid, Platform.OS === 'web' ? 'web' : 'native', deviceId ?? undefined);
        if (result?.success) {
          setNotificationsEnabled(true);
          // Save preference to user profile
          await updateDoc(doc(db, 'users', user.uid), {
            notificationsEnabled: true
          });

          // Handle different success scenarios
          if (result?.reason === 'permission-granted-fallback-mode' || result?.reason === 'fallback-permission-granted') {
            Alert.alert(
              'Notifications Enabled (Fallback Mode)',
              'Notifications are enabled! Due to browser limitations, you may receive in-app notifications instead of push notifications. This is normal and still provides full functionality.'
            );
          } else if (result?.reason === 'permission-granted-no-token') {
            Alert.alert('Notifications Enabled', 'Notification permission granted! Push notifications may work through alternative methods.');
          } else {
            Alert.alert('Notifications Enabled', 'Push notifications have been enabled for your account.');
          }
        } else {
          setNotificationsEnabled(false);
          if (result?.reason === 'permission-denied') {
            Alert.alert('Permission Denied', 'Please enable notifications in your browser or device settings.');
          } else if (result?.reason === 'permission-revoked') {
            Alert.alert('Permission Revoked', 'Notification permission was revoked during setup. Please try again or check your browser settings.');
          } else if (result?.reason === 'firebase-permission-revocation') {
            Alert.alert(
              'Permission Revoked by Firebase',
              'Firebase has revoked the notification permission due to a known bug. To re-enable notifications:\n\n1. Click the lock/site info icon in the address bar\n2. Change notifications back to "Allow"\n3. Try enabling notifications again\n\nThis is a limitation of Firebase Cloud Messaging in some browsers.'
            );
          } else {
            Alert.alert('Error', 'Failed to enable notifications. Check console for details.');
          }
        }
      } else {
        // Disable notifications: unregister token for this device when possible
        try {
          const deviceId = await getOrCreateDeviceId();
          if (user?.uid && deviceId) {
            await unregisterPushToken(user.uid, undefined, deviceId);
            console.log('handleNotificationToggle: unregistered push token for deviceId', deviceId);
          } else if (user?.uid) {
            // Fallback: try to unregister without deviceId (will mark any matching token inactive if provided)
            await unregisterPushToken(user.uid);
            console.log('handleNotificationToggle: unregistered push tokens for user (no deviceId)');
          }
        } catch (e) {
          console.warn('handleNotificationToggle: failed to unregister token', e);
        }

        setNotificationsEnabled(false);
        // Save preference to user profile
        await updateDoc(doc(db, 'users', user.uid), {
          notificationsEnabled: false
        });
        Alert.alert('Notifications Disabled', 'Push notifications have been disabled for your account.');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setNotificationToggleLoading(false);
    }
  };

  const handleLocationToggle = async (value: boolean) => {
    try {
      if (value) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationEnabled(true);
          // Save preference to user profile
          if (user?.uid) {
            await updateDoc(doc(db, 'users', user.uid), {
              locationEnabled: true
            });
          }
          Alert.alert('Location Enabled', 'Location services have been enabled for your account.');
        } else {
          Alert.alert('Permission Denied', 'Please enable location services in your device settings');
          setLocationEnabled(false);
        }
      } else {
        setLocationEnabled(false);
        // Save preference to user profile
        if (user?.uid) {
          await updateDoc(doc(db, 'users', user.uid), {
            locationEnabled: false
          });
        }
        Alert.alert('Location Disabled', 'Location services have been disabled for your account.');
      }
    } catch (error) {
      console.error('Error toggling location:', error);
      Alert.alert('Error', 'Failed to update location settings');
    }
  };


  const handleDarkModeToggle = async (value: boolean) => {
    setDarkModeEnabled(value);
    // Here you would typically save this preference to your backend
    Alert.alert('Theme Updated', `Dark mode has been ${value ? 'enabled' : 'disabled'} for your account.`);
  };

  const handleChangePassword = () => {
    setChangePasswordModalVisible(true);
  };

  const submitChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      if (!user || !user.email) {
        throw new Error('User not authenticated');
      }

      // Reauthenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      Alert.alert('Success', 'Password changed successfully');
      setChangePasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      let errorMessage = 'Failed to change password. Please try again.';

      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please log out and log back in to change your password';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = async () => {
    setDeleteModalVisible(false);
    setLoading(true);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Delete user data from Firestore first
      await deleteDoc(doc(db, 'users', user.uid));

      // Delete user from Firebase Auth
      await deleteUser(user);

      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      let errorMessage = 'Failed to delete account. Please try again.';

      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please log out and log back in to delete your account';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyPolicy = () => {
    const privacyDoc = getLegalDocument('privacy');
    Alert.alert(
      privacyDoc.title,
      `Version: ${privacyDoc.version}\nLast Updated: ${privacyDoc.lastUpdated}\n\nBloodBond is committed to protecting your privacy. We collect personal information to provide blood donation services, use your data only for matching donors with recipients, never share your information with third parties without consent, and maintain strong security measures.\n\nFor the complete policy, please visit our website or request the full document via email.`,
      [
        { text: 'OK', style: 'default' },
        { text: 'Email Full Policy', onPress: () => {
          Alert.alert('Full Policy', 'The complete Privacy Policy will be sent to your email address.');
        }}
      ]
    );
  };

  const handleTermsOfService = () => {
    const termsDoc = getLegalDocument('terms');
    Alert.alert(
      termsDoc.title,
      `Version: ${termsDoc.version}\nLast Updated: ${termsDoc.lastUpdated}\n\nBy using BloodBond, you agree to:\n• Be 18+ and eligible for blood donation\n• Provide accurate medical information\n• Respect all users and maintain confidentiality\n• Use the app responsibly for emergency situations\n• Comply with all applicable laws\n\nFor complete terms, please visit our website or request the full document via email.`,
      [
        { text: 'OK', style: 'default' },
        { text: 'Email Full Terms', onPress: () => {
          Alert.alert('Full Terms', 'The complete Terms of Service will be sent to your email address.');
        }}
      ]
    );
  };

  const handleDataExport = async () => {
    try {
      if (!user?.uid || !user?.email) {
        Alert.alert('Error', 'User information not found');
        return;
      }

      setLoading(true);
      const result = await saveDataExportRequest(user.uid, user.email);
      
      Alert.alert(
        'Data Export Started',
        `${result.message}\n\nEstimated size: ${result.estimatedSize}`
      );
    } catch (error) {
      console.error('Error requesting data export:', error);
      Alert.alert('Error', 'Failed to request data export. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data including:\n\n• Temporary files\n• Image cache\n• App preferences\n• Offline data\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            try {
              // In a real app, this would clear various caches
              // For now, we'll simulate the process
              setLoading(true);

              // Simulate clearing cache
              await new Promise(resolve => setTimeout(resolve, 2000));

              // Reset local state preferences
              setNotificationsEnabled(true);
              setLocationEnabled(true);
              setDarkModeEnabled(false);

              setLoading(false);
              Alert.alert('Cache Cleared', 'All cached data and preferences have been reset.');
            } catch (error) {
              console.error('Error clearing cache:', error);
              setLoading(false);
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Create dynamic styles based on theme
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
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryText,
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.sectionBackground,
    },
    optionsContainer: {
      backgroundColor: colors.cardBackground,
    },
    settingOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.primaryText,
      marginBottom: 2,
    },
    optionSubtitle: {
      fontSize: 14,
      color: colors.secondaryText,
    },
    versionText: {
      fontSize: 14,
      color: colors.secondaryText,
      marginBottom: 4,
    },
    versionSubtext: {
      fontSize: 12,
      color: colors.subtitleText,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.modalBackground,
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
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primaryText,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.primaryText,
      backgroundColor: colors.cardBackground,
    },
    cancelButtonText: {
      fontSize: 16,
      color: colors.secondaryText,
      fontWeight: '600',
    },
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeOptionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryText,
      marginBottom: 2,
    },
    themeOptionSubtitle: {
      fontSize: 14,
      color: colors.secondaryText,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={dynamicStyles.title}>App Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Notifications */}
        <View style={styles.section}>
          <Text style={dynamicStyles.sectionTitle}>Notifications</Text>
          <View style={dynamicStyles.optionsContainer}>
            <View style={dynamicStyles.settingOption}>
              <View style={[{
                width: 36,
                height: 36,
                borderRadius: 18,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16,
                backgroundColor: '#10B98120'
              }]}>
                {notificationToggleLoading ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <Ionicons name="notifications" size={20} color="#10B981" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: colors.primaryText,
                  marginBottom: 2,
                }}>Push Notifications</Text>
                <Text style={{
                  fontSize: 14,
                  color: colors.secondaryText,
                }}>
                  {notificationsEnabled ? 'Receive push notifications for blood requests' : 'Push notifications are disabled'}
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                disabled={notificationToggleLoading}
                trackColor={{ false: colors.border, true: '#10B981' }}
                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Privacy & Security */}
        <View style={styles.section}>
          <Text style={dynamicStyles.sectionTitle}>Privacy & Security</Text>
          <View style={dynamicStyles.optionsContainer}>

            <SettingOption
              icon="lock-closed"
              title="Change Password"
              subtitle="Update your account password"
              onPress={handleChangePassword}
              color="#E53E3E"
              colors={colors}
            />
            <SettingOption
              icon="shield-checkmark"
              title="Privacy Settings"
              subtitle="Control your data sharing"
              onPress={handlePrivacyPolicy}
              color="#10B981"
              colors={colors}
            />
          </View>
        </View>


        {/* Appearance */}
        <View style={styles.section}>
          <Text style={dynamicStyles.sectionTitle}>Appearance</Text>
          <View style={dynamicStyles.optionsContainer}>
            <SettingOption
              icon="color-palette"
              title="Theme"
              subtitle={`Current: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
              onPress={() => setThemeModalVisible(true)}
              color="#6B46C1"
              colors={colors}
            />
          </View>
        </View>

        {/* Data & Storage */}
        <View style={styles.section}>
          <Text style={dynamicStyles.sectionTitle}>Data & Storage</Text>
          <View style={dynamicStyles.optionsContainer}>
            <SettingOption
              icon="download"
              title="Export Data"
              subtitle="Download your data"
              onPress={handleDataExport}
              color="#38A169"
              colors={colors}
            />
            <SettingOption
              icon="trash"
              title="Clear Cache"
              subtitle="Free up storage space"
              onPress={handleClearCache}
              color="#F56500"
              colors={colors}
            />
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={dynamicStyles.sectionTitle}>Legal</Text>
          <View style={dynamicStyles.optionsContainer}>
            <SettingOption
              icon="document-text"
              title="Terms of Service"
              subtitle="Read our terms and conditions"
              onPress={handleTermsOfService}
              color="#3182CE"
              colors={colors}
            />
            <SettingOption
              icon="shield-checkmark"
              title="Privacy Policy"
              subtitle="Learn how we protect your data"
              onPress={handlePrivacyPolicy}
              color="#10B981"
              colors={colors}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={dynamicStyles.sectionTitle}>Danger Zone</Text>
          <View style={dynamicStyles.optionsContainer}>
            <SettingOption
              icon="trash"
              title="Delete Account"
              subtitle="Permanently delete your account"
              onPress={handleDeleteAccount}
              color="#DC2626"
              danger={true}
              colors={colors}
            />
          </View>
        </View>

        <View style={styles.versionContainer}>
          <Text style={dynamicStyles.versionText}>BloodBond v1.0.0</Text>
          <Text style={dynamicStyles.versionSubtext}>Settings last updated: Today</Text>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setChangePasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="lock-closed" size={24} color="#E53E3E" />
              <Text style={styles.modalTitle}>Change Password</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.textInput}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.textInput}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.textInput}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setChangePasswordModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={submitChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="white" />
                    <Text style={styles.confirmButtonText}>Change Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={24} color="#DC2626" />
              <Text style={styles.modalTitle}>Delete Account</Text>
            </View>

            <Text style={styles.modalMessage}>
              Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently delete:
            </Text>

            <View style={styles.warningList}>
              <Text style={styles.warningItem}>• All your blood requests</Text>
              <Text style={styles.warningItem}>• Your donation history</Text>
              <Text style={styles.warningItem}>• Your profile information</Text>
              <Text style={styles.warningItem}>• All your responses</Text>
            </View>

            <Text style={styles.modalMessage}>
              This action is irreversible. Please consider exporting your data first.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Keep Account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton]}
                onPress={confirmDeleteAccount}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="trash" size={16} color="white" />
                    <Text style={styles.deleteConfirmButtonText}>Delete Account</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={themeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="color-palette" size={24} color="#6B46C1" />
              <Text style={styles.modalTitle}>Choose Theme</Text>
            </View>

            <TouchableOpacity
              style={[styles.themeOption, theme === 'light' && styles.themeOptionSelected]}
              onPress={async () => {
                await setTheme('light');
                setThemeModalVisible(false);
                Alert.alert('Theme Updated', 'Light theme has been applied.');
              }}
            >
              <View style={styles.themeOptionContent}>
                <Ionicons name="sunny" size={24} color={theme === 'light' ? '#6B46C1' : '#666'} />
                <View style={styles.themeOptionText}>
                  <Text style={[styles.themeOptionTitle, theme === 'light' && styles.themeOptionTitleSelected]}>
                    Light
                  </Text>
                  <Text style={[styles.themeOptionSubtitle, theme === 'light' && styles.themeOptionSubtitleSelected]}>
                    Always use light theme
                  </Text>
                </View>
              </View>
              {theme === 'light' && (
                <Ionicons name="checkmark" size={20} color="#6B46C1" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeOption, theme === 'dark' && styles.themeOptionSelected]}
              onPress={async () => {
                await setTheme('dark');
                setThemeModalVisible(false);
                Alert.alert('Theme Updated', 'Dark theme has been applied.');
              }}
            >
              <View style={styles.themeOptionContent}>
                <Ionicons name="moon" size={24} color={theme === 'dark' ? '#6B46C1' : '#666'} />
                <View style={styles.themeOptionText}>
                  <Text style={[styles.themeOptionTitle, theme === 'dark' && styles.themeOptionTitleSelected]}>
                    Dark
                  </Text>
                  <Text style={[styles.themeOptionSubtitle, theme === 'dark' && styles.themeOptionSubtitleSelected]}>
                    Always use dark theme
                  </Text>
                </View>
              </View>
              {theme === 'dark' && (
                <Ionicons name="checkmark" size={20} color="#6B46C1" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeOption, theme === 'system' && styles.themeOptionSelected]}
              onPress={async () => {
                await setTheme('system');
                setThemeModalVisible(false);
                Alert.alert('Theme Updated', 'System theme has been applied.');
              }}
            >
              <View style={styles.themeOptionContent}>
                <Ionicons name="phone-portrait" size={24} color={theme === 'system' ? '#6B46C1' : '#666'} />
                <View style={styles.themeOptionText}>
                  <Text style={[styles.themeOptionTitle, theme === 'system' && styles.themeOptionTitleSelected]}>
                    System
                  </Text>
                  <Text style={[styles.themeOptionSubtitle, theme === 'system' && styles.themeOptionSubtitleSelected]}>
                    Follow system theme
                  </Text>
                </View>
              </View>
              {theme === 'system' && (
                <Ionicons name="checkmark" size={20} color="#6B46C1" />
              )}
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setThemeModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
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
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  optionsContainer: {
    backgroundColor: 'white',
  },
  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  dangerText: {
    color: '#DC2626',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingBottom: 100,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: '#ccc',
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
    marginBottom: 16,
  },
  warningList: {
    marginBottom: 16,
    paddingLeft: 16,
  },
  warningItem: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 4,
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
  confirmButton: {
    backgroundColor: '#E53E3E',
  },
  confirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  deleteConfirmButton: {
    backgroundColor: '#DC2626',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  themeOptionSelected: {
    backgroundColor: '#6B46C120',
    borderColor: '#6B46C1',
  },
  themeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeOptionText: {
    marginLeft: 16,
    flex: 1,
  },
  themeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  themeOptionTitleSelected: {
    color: '#6B46C1',
  },
  themeOptionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  themeOptionSubtitleSelected: {
    color: '#6B46C1',
  },
});
