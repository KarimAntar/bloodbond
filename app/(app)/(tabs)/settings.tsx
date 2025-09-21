// app/(app)/(tabs)/settings.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  Image
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useUserStats } from '../../../contexts/UserStatsContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAndRegisterPushToken, unregisterPushToken, runNotificationDiagnostics } from '../../../firebase/pushNotifications';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/firebaseConfig';
import { SkeletonLoader, SkeletonList } from '../../../components/SkeletonLoader';
import { useFocusEffect } from '@react-navigation/native';

// Theme-aware components
const ProfileOption: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  color?: string;
  colors: any;
}> = ({ icon, title, subtitle, onPress, rightElement, color = '#666', colors }) => (
  <TouchableOpacity 
    style={[{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }]} 
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
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{
        fontSize: 16,
        fontWeight: '500',
        color: colors.primaryText,
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

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: string;
  color: string;
  colors: any;
}> = ({ title, value, icon, color, colors }) => (
  <View style={{
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  }}>
    <View style={[{
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      backgroundColor: color + '20'
    }]}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <Text style={{
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primaryText,
      marginBottom: 4,
    }}>{value}</Text>
    <Text style={{
      fontSize: 12,
      color: colors.secondaryText,
    }}>{title}</Text>
  </View>
);


export default function SettingsTabScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const { user, userProfile, logout, loading, refreshUserProfile } = useAuth();
  const { stats } = useUserStats();
  const { colors } = useTheme();
  const router = useRouter();
  const lastRefreshRef = useRef<number | null>(null);

  // Device ID helper (keeps one token per physical device)
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

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Settings - BloodBond';
    }
    loadSettings();

    const attemptRefresh = async () => {
      try {
        if (!user?.uid) return;
        const now = Date.now();
        // throttle refreshes to once per 60s to avoid loops
        if (lastRefreshRef.current && now - lastRefreshRef.current < 60000) return;
        if (!userProfile || !userProfile.role) {
          lastRefreshRef.current = now;
          await refreshUserProfile();
        }
      } catch (err) {
        console.error('Error refreshing user profile on settings mount:', err);
      }
    };

    attemptRefresh();
  // Re-run when auth user or profile changes
  }, [user?.uid, userProfile, refreshUserProfile]);

  // Fetch fresh user profile data when the settings page comes into focus,
  // but avoid refreshing repeatedly to prevent refresh/redirect loops.
  useFocusEffect(
    React.useCallback(() => {
      const fetchFreshProfileData = async () => {
        if (!user?.uid) return;

        // If we already have a profile with a role, no need to refresh.
        if (userProfile && userProfile.role) {
          return;
        }

        const now = Date.now();
        if (lastRefreshRef.current && now - lastRefreshRef.current < 60000) return;

        try {
          console.log('Refreshing user profile data for settings page...');
          lastRefreshRef.current = now;
          await refreshUserProfile();
          console.log('User profile refreshed successfully');
        } catch (error) {
          console.error('Error refreshing user profile data for settings:', error);
        }
      };

      fetchFreshProfileData();
    }, [user?.uid, userProfile, refreshUserProfile])
  );

  const loadSettings = async () => {
    try {
      console.log('🔍 SETTINGS: Loading settings...');

      // Check user's existing tokens first
      if (user?.uid) {
        const userTokensRef = collection(db, 'userTokens');
        const q = query(userTokensRef, where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const tokens = snapshot.docs.map(doc => doc.data());
        const activeTokens = tokens.filter(token => token.active !== false);

        console.log('🔍 SETTINGS: Found tokens:', tokens.length, 'active:', activeTokens.length);

        // Web: rely on the browser Permissions API to avoid using expo-notifications
        if (typeof document !== 'undefined' && Platform.OS === 'web') {
          try {
            const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
            console.log('🔍 SETTINGS: Permission =', perm, ', tokens =', tokens.length, ', active =', activeTokens.length);
            // Only enable if permission granted AND tokens exist AND tokens active
            setNotificationsEnabled(perm === 'granted' && tokens.length > 0 && activeTokens.length > 0);
          } catch (e) {
            console.warn('🔍 SETTINGS: failed to read Notification.permission', e);
            const { status: notificationStatus } = await Notifications.getPermissionsAsync();
            setNotificationsEnabled(notificationStatus === 'granted' && tokens.length > 0 && activeTokens.length > 0);
          }
        } else {
          // Native: use expo-notifications permissions
          const { status: notificationStatus } = await Notifications.getPermissionsAsync();
          console.log('🔍 SETTINGS: Native permission =', notificationStatus, ', tokens =', tokens.length, ', active =', activeTokens.length);
          setNotificationsEnabled(notificationStatus === 'granted' && tokens.length > 0 && activeTokens.length > 0);
        }
      } else {
        console.log('🔍 SETTINGS: No user UID, disabling notifications');
        setNotificationsEnabled(false);
      }

      // Load location permission status
      const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
      setLocationEnabled(locationStatus === 'granted');
    } catch (error) {
      console.error('🔍 SETTINGS: Error loading settings:', error);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      if (!user?.uid) {
        Alert.alert('Not signed in', 'Please sign in to manage notification settings.');
        return;
      }

      if (value) {
        // Enable: use centralized helper which requests permission and registers token
        const deviceId = await getOrCreateDeviceId();
        const result = await ensureAndRegisterPushToken(user.uid, Platform.OS === 'web' ? 'web' : 'native', deviceId ?? undefined);
        if (result?.success) {
          setNotificationsEnabled(true);
          // Persist preference
          await updateDoc(doc(db, 'users', user.uid), {
            notificationsEnabled: true
          });
          Alert.alert('Success', 'Push notifications enabled');
        } else {
          setNotificationsEnabled(false);
          if (result?.reason === 'permission-denied') {
            Alert.alert('Permission Denied', 'Please enable notifications in your browser or device settings.');
          } else {
            Alert.alert('Error', 'Failed to enable notifications. Check console for details.');
          }
        }
      } else {
        // Disable: unregister tokens for this device (or all user tokens as fallback)
        try {
          const deviceId = await getOrCreateDeviceId();
          if (deviceId) {
            await unregisterPushToken(user.uid, undefined, deviceId);
            console.log('handleNotificationToggle: unregistered push token for deviceId', deviceId);
          } else {
            await unregisterPushToken(user.uid);
            console.log('handleNotificationToggle: unregistered push tokens for user (no deviceId)');
          }
        } catch (e) {
          console.warn('handleNotificationToggle: failed to unregister token', e);
        }

        setNotificationsEnabled(false);
        // Persist preference
        await updateDoc(doc(db, 'users', user.uid), {
          notificationsEnabled: false
        });
        Alert.alert('Success', 'Push notifications disabled');
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
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
          Alert.alert('Success', 'Location services enabled');
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
        Alert.alert('Success', 'Location services disabled');
      }
    } catch (error) {
      console.error('Error toggling location:', error);
      Alert.alert('Error', 'Failed to update location settings');
    }
  };
  
  const handleLogout = async () => {
    console.log('=== HANDLE LOGOUT CALLED - DIRECT LOGOUT ===');
    console.log('Starting logout process directly...');
    try {
      await logout();
      console.log('Logout completed successfully');
      // The root layout will handle redirecting to the login screen.
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert(
        'Logout Failed',
        'Unable to log out. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
  };
  
  // ... (other handlers remain the same)

  const handleEditProfile = () => {
    // For existing users with completed profiles, go to edit page
    router.push('/(app)/profile/edit');
  };

  const handleMyRequests = () => {
    router.push('/(app)/profile/my-requests');
  };

  const handleMyResponses = () => {
    router.push('/(app)/profile/my-responses');
  };

  const handleSettings = () => {
    router.push('/(app)/profile/settings');
  };

  const handleEmergencyContacts = () => {
    router.push('/emergency-contacts');
  };

  const handleDonationHistory = () => {
    router.push('/(app)/profile/donation-history');
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
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 20,
      backgroundColor: colors.cardBackground,
      marginBottom: 8,
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primaryText,
      marginBottom: 4,
    },
    statTitle: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    quickActionsTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primaryText,
      marginBottom: 16,
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
    profileOption: {
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
  });

  if (!user) {
    return (
      <SafeAreaView style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </SafeAreaView>
    );
  }

  // Show skeleton loading while profile is loading
  if (loading || !userProfile) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile Header Skeleton */}
          <View style={[styles.profileHeader, { backgroundColor: '#E53E3E' }]}>
            <View style={styles.profileInfo}>
              <SkeletonLoader width={80} height={80} borderRadius={40} marginBottom={16} />
              <SkeletonLoader width="60%" height={24} marginBottom={4} />
              <SkeletonLoader width="40%" height={16} marginBottom={8} />
              <SkeletonLoader width="30%" height={14} marginBottom={0} />
            </View>
          </View>

          {/* Stats Skeleton */}
          <View style={dynamicStyles.statsContainer}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <SkeletonLoader width={32} height={32} borderRadius={16} marginBottom={8} />
              <SkeletonLoader width={40} height={20} marginBottom={4} />
              <SkeletonLoader width={60} height={12} marginBottom={0} />
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <SkeletonLoader width={32} height={32} borderRadius={16} marginBottom={8} />
              <SkeletonLoader width={40} height={20} marginBottom={4} />
              <SkeletonLoader width={60} height={12} marginBottom={0} />
            </View>
          </View>

          {/* Quick Actions Skeleton */}
          <View style={styles.quickActionsContainer}>
            <SkeletonLoader width="40%" height={18} marginBottom={16} />
            <View style={styles.quickActionsGrid}>
              <SkeletonLoader width="30%" height={80} borderRadius={12} marginBottom={0} />
              <SkeletonLoader width="30%" height={80} borderRadius={12} marginBottom={0} />
              <SkeletonLoader width="30%" height={80} borderRadius={12} marginBottom={0} />
            </View>
          </View>

          {/* Sections Skeleton */}
          <SkeletonList itemCount={8} colors={colors} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
         {/* Profile Header */}
        <LinearGradient
          colors={['#E53E3E', '#C53030']}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              {userProfile?.profilePicture && userProfile.profilePicture.trim() !== '' ? (
                <Image
                  source={{ uri: userProfile.profilePicture }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {userProfile?.fullName
                      ? userProfile.fullName
                          .split(' ')
                          .map(name => name.charAt(0).toUpperCase())
                          .slice(0, 2)
                          .join('')
                      : user.email?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              {userProfile?.bloodType && (
                <View style={styles.bloodTypeBadge}>
                  <Text style={styles.bloodTypeBadgeText}>{userProfile.bloodType}</Text>
                </View>
              )}
            </View>
            <Text style={styles.userName}>{userProfile?.fullName || 'User'}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {userProfile?.city && (
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.userLocation}>{userProfile.city}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={dynamicStyles.statsContainer}>
          <StatCard
            title="Requests"
            value={stats.requestsCreated.toString()}
            icon="add-circle"
            color="#E53E3E"
            colors={colors}
          />
          <StatCard
            title="Responses"
            value={stats.responsesSent.toString()}
            icon="paper-plane"
            color="#3182CE"
            colors={colors}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={dynamicStyles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#E53E3E' }]}
              onPress={() => router.push('/requests/create')}
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.quickActionText}>Create Request</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#3182CE' }]}
              onPress={() => router.push('/requests')}
            >
              <Ionicons name="search" size={24} color="white" />
              <Text style={styles.quickActionText}>Find Donors</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#38A169' }]}
              onPress={handleDonationHistory}
            >
              <Ionicons name="heart" size={24} color="white" />
              <Text style={styles.quickActionText}>History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Actions */}
        <View style={styles.section}>
          <Text style={dynamicStyles.sectionTitle}>Profile</Text>
          <View style={dynamicStyles.optionsContainer}>
            <ProfileOption
              icon="person"
              title="Edit Profile"
              subtitle="Update your information"
              onPress={handleEditProfile}
              color="#E53E3E"
              colors={colors}
            />
            <ProfileOption
              icon="list"
              title="My Requests"
              subtitle="View your blood requests"
              onPress={handleMyRequests}
              color="#3182CE"
              colors={colors}
            />
            <ProfileOption
              icon="paper-plane"
              title="My Responses"
              subtitle="Track your donation offers"
              onPress={handleMyResponses}
              color="#38A169"
              colors={colors}
            />
            <ProfileOption
              icon="heart"
              title="Donation History"
              subtitle="View past donations"
              onPress={handleDonationHistory}
              color="#F56500"
              colors={colors}
            />
            {userProfile?.role?.trim()?.toLowerCase() === 'admin' && (
              <ProfileOption
                icon="shield"
                title="Admin Dashboard"
                subtitle="Manage users and requests"
                onPress={() => router.push('/(app)/admin')}
                color="#8B5CF6"
                colors={colors}
              />
            )}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={dynamicStyles.sectionTitle}>Settings</Text>
          <View style={dynamicStyles.optionsContainer}>
            <ProfileOption
              icon="notifications"
              title="Push Notifications"
              subtitle="Get notified about requests"
              onPress={() => handleNotificationToggle(!notificationsEnabled)}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: '#e1e5e9', true: '#E53E3E' }}
                  thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                />
              }
              color="#F56500"
              colors={colors}
            />
            <ProfileOption
              icon="location"
              title="Location Services"
              subtitle="Find requests near you"
              onPress={() => handleLocationToggle(!locationEnabled)}
              rightElement={
                <Switch
                  value={locationEnabled}
                  onValueChange={handleLocationToggle}
                  trackColor={{ false: '#e1e5e9', true: '#E53E3E' }}
                  thumbColor={locationEnabled ? '#fff' : '#f4f3f4'}
                />
              }
              color="#3182CE"
              colors={colors}
            />
            <ProfileOption
              icon="call"
              title="Emergency Contacts"
              subtitle="Manage emergency numbers"
              onPress={handleEmergencyContacts}
              color="#E53E3E"
              colors={colors}
            />
            <ProfileOption
              icon="settings"
              title="App Settings"
              subtitle="Privacy, security & more"
              onPress={handleSettings}
              color="#666"
              colors={colors}
            />
            <ProfileOption
              icon="add-circle"
              title="Add to Home Screen"
              subtitle="Install app for better experience (iOS)"
              onPress={() => {
                if (Platform.OS === 'web') {
                  Alert.alert(
                    'Add BloodBond to Home Screen',
                    'For the best experience on iOS:\n\n1. Tap the Share button (square with arrow) at the bottom of Safari\n2. Scroll down and select "Add to Home Screen"\n3. Tap "Add" in the top right\n\nThis creates an app-like experience with full-screen mode and offline access!',
                    [{ text: 'Got it' }]
                  );
                } else {
                  Alert.alert('PWA Feature', 'This feature is available in Safari on iOS devices. Open the site in Safari to add to home screen.');
                }
              }}
              color="#38A169"
              colors={colors}
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={dynamicStyles.sectionTitle}>Support</Text>
          <View style={dynamicStyles.optionsContainer}>
            <ProfileOption
              icon="help-circle"
              title="Help & FAQ"
              subtitle="Get answers to common questions"
              onPress={() => router.push('/(app)/profile/support')}
              color="#38A169"
              colors={colors}
            />
            <ProfileOption
              icon="mail"
              title="Contact Support"
              subtitle="Get help from our team"
              onPress={() => router.push('/(app)/profile/support')}
              color="#3182CE"
              colors={colors}
            />
            <ProfileOption
              icon="information-circle"
              title="About BloodBond"
              subtitle="Learn more about our mission"
              onPress={() => router.push('/(app)/profile/support')}
              color="#F56500"
              colors={colors}
            />
          </View>
        </View>
        
        {/* Logout Button */}
        <View style={styles.section}>
          <View style={dynamicStyles.optionsContainer}>
            <ProfileOption
              icon="log-out"
              title="Logout"
              onPress={handleLogout}
              color="#DC2626"
              colors={colors}
            />
          </View>
        </View>

        <View style={styles.versionContainer}>
          <Text style={dynamicStyles.versionText}>BloodBond v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  profileHeader: {
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  bloodTypeBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bloodTypeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E53E3E',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userLocation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
  },
  quickActionsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',

  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginTop: 8,
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
  profileOption: {
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
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingBottom: 100, // Extra padding for tab bar
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
});
