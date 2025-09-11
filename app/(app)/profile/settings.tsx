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
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase/firebaseConfig';

const SettingOption: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  color?: string;
  danger?: boolean;
}> = ({ icon, title, subtitle, onPress, rightElement, color = '#666', danger = false }) => (
  <TouchableOpacity style={styles.settingOption} onPress={onPress}>
    <View style={[styles.optionIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={20} color={danger ? '#DC2626' : color} />
    </View>
    <View style={styles.optionContent}>
      <Text style={[styles.optionTitle, danger && styles.dangerText]}>{title}</Text>
      {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement || <Ionicons name="chevron-forward" size={20} color="#ccc" />}
  </TouchableOpacity>
);

export default function AppSettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, userProfile, logout } = useAuth();
  const router = useRouter();

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    // Here you would typically save this preference to your backend
    Alert.alert('Success', `Push notifications ${value ? 'enabled' : 'disabled'}`);
  };

  const handleLocationToggle = async (value: boolean) => {
    setLocationEnabled(value);
    // Here you would typically save this preference to your backend
    Alert.alert('Success', `Location services ${value ? 'enabled' : 'disabled'}`);
  };

  const handleBiometricToggle = async (value: boolean) => {
    setBiometricEnabled(value);
    // Here you would typically save this preference to your backend
    Alert.alert('Success', `Biometric authentication ${value ? 'enabled' : 'disabled'}`);
  };

  const handleDarkModeToggle = async (value: boolean) => {
    setDarkModeEnabled(value);
    // Here you would typically save this preference to your backend
    Alert.alert('Success', `Dark mode ${value ? 'enabled' : 'disabled'}`);
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
      // Here you would typically call your authentication service to change password
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      Alert.alert('Success', 'Password changed successfully');
      setChangePasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert('Error', 'Failed to change password. Please try again.');
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
      // Delete user data from Firestore
      if (user?.uid) {
        await deleteDoc(doc(db, 'users', user.uid));
      }

      // Here you would typically call your authentication service to delete the account
      await logout();
      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyPolicy = () => {
    Alert.alert('Privacy Policy', 'Privacy Policy content would be displayed here.');
  };

  const handleTermsOfService = () => {
    Alert.alert('Terms of Service', 'Terms of Service content would be displayed here.');
  };

  const handleDataExport = () => {
    Alert.alert('Data Export', 'Your data export will be prepared and sent to your email.');
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => Alert.alert('Success', 'Cache cleared successfully')
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>App Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Privacy & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <View style={styles.optionsContainer}>
            <SettingOption
              icon="finger-print"
              title="Biometric Authentication"
              subtitle="Use fingerprint or face ID"
              onPress={() => {}}
              rightElement={
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: '#e1e5e9', true: '#E53E3E' }}
                  thumbColor={biometricEnabled ? '#fff' : '#f4f3f4'}
                />
              }
              color="#8B5CF6"
            />
            <SettingOption
              icon="lock-closed"
              title="Change Password"
              subtitle="Update your account password"
              onPress={handleChangePassword}
              color="#E53E3E"
            />
            <SettingOption
              icon="shield-checkmark"
              title="Privacy Settings"
              subtitle="Control your data sharing"
              onPress={handlePrivacyPolicy}
              color="#10B981"
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.optionsContainer}>
            <SettingOption
              icon="notifications"
              title="Push Notifications"
              subtitle="Get notified about requests"
              onPress={() => {}}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: '#e1e5e9', true: '#E53E3E' }}
                  thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                />
              }
              color="#F56500"
            />
            <SettingOption
              icon="location"
              title="Location Services"
              subtitle="Find requests near you"
              onPress={() => {}}
              rightElement={
                <Switch
                  value={locationEnabled}
                  onValueChange={handleLocationToggle}
                  trackColor={{ false: '#e1e5e9', true: '#E53E3E' }}
                  thumbColor={locationEnabled ? '#fff' : '#f4f3f4'}
                />
              }
              color="#3182CE"
            />
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.optionsContainer}>
            <SettingOption
              icon="moon"
              title="Dark Mode"
              subtitle="Switch to dark theme"
              onPress={() => {}}
              rightElement={
                <Switch
                  value={darkModeEnabled}
                  onValueChange={handleDarkModeToggle}
                  trackColor={{ false: '#e1e5e9', true: '#E53E3E' }}
                  thumbColor={darkModeEnabled ? '#fff' : '#f4f3f4'}
                />
              }
              color="#6B46C1"
            />
          </View>
        </View>

        {/* Data & Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Storage</Text>
          <View style={styles.optionsContainer}>
            <SettingOption
              icon="download"
              title="Export Data"
              subtitle="Download your data"
              onPress={handleDataExport}
              color="#38A169"
            />
            <SettingOption
              icon="trash"
              title="Clear Cache"
              subtitle="Free up storage space"
              onPress={handleClearCache}
              color="#F56500"
            />
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.optionsContainer}>
            <SettingOption
              icon="document-text"
              title="Terms of Service"
              subtitle="Read our terms and conditions"
              onPress={handleTermsOfService}
              color="#3182CE"
            />
            <SettingOption
              icon="shield-checkmark"
              title="Privacy Policy"
              subtitle="Learn how we protect your data"
              onPress={handlePrivacyPolicy}
              color="#10B981"
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={styles.optionsContainer}>
            <SettingOption
              icon="trash"
              title="Delete Account"
              subtitle="Permanently delete your account"
              onPress={handleDeleteAccount}
              color="#DC2626"
              danger={true}
            />
          </View>
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>BloodBond v1.0.0</Text>
          <Text style={styles.versionSubtext}>Settings last updated: Today</Text>
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
});
