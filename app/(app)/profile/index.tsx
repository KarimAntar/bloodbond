// app/(app)/(tabs)/profile/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// ... (Your components like ProfileOption and StatCard remain the same)
const ProfileOption: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  color?: string;
}> = ({ icon, title, subtitle, onPress, rightElement, color = '#666' }) => (
  <TouchableOpacity style={styles.profileOption} onPress={onPress}>
    <View style={[styles.optionIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <View style={styles.optionContent}>
      <Text style={styles.optionTitle}>{title}</Text>
      {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement || <Ionicons name="chevron-forward" size={20} color="#ccc" />}
  </TouchableOpacity>
);

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: string;
  color: string;
}> = ({ title, value, icon, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);


export default function ProfileTabScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const { user, userProfile, logout, loading } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push('/(app)/profile/edit');
  };

  const handleMyRequests = () => {
    router.push('/(app)/profile/my-requests');
  };

  const handleMyResponses = () => {
    router.push('/(app)/profile/my-responses');
  };

  const handleSettings = () => {
    // router.push('/(app)/profile/settings');
  };

  const handleEmergencyContacts = () => {
    // router.push('/(app)/profile/emergency-contacts');
  };

  const handleDonationHistory = () => {
    router.push('/(app)/profile/donation-history');
  };

  if (loading || !user || !userProfile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53E3E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userProfile?.fullName?.charAt(0) || user.email?.charAt(0) || '?'}
                </Text>
              </View>
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
        <View style={styles.statsContainer}>
          <StatCard
            title="Requests"
            value="3"
            icon="add-circle"
            color="#E53E3E"
          />
          <StatCard
            title="Responses"
            value="8"
            icon="paper-plane"
            color="#3182CE"
          />
          <StatCard
            title="Donations"
            value="5"
            icon="heart"
            color="#38A169"
          />
        </View>

        {/* Profile Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.optionsContainer}>
            <ProfileOption
              icon="person"
              title="Edit Profile"
              subtitle="Update your information"
              onPress={handleEditProfile}
              color="#E53E3E"
            />
            <ProfileOption
              icon="list"
              title="My Requests"
              subtitle="View your blood requests"
              onPress={handleMyRequests}
              color="#3182CE"
            />
            <ProfileOption
              icon="paper-plane"
              title="My Responses"
              subtitle="Track your donation offers"
              onPress={handleMyResponses}
              color="#38A169"
            />
            <ProfileOption
              icon="heart"
              title="Donation History"
              subtitle="View past donations"
              onPress={handleDonationHistory}
              color="#F56500"
            />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.optionsContainer}>
            <ProfileOption
              icon="notifications"
              title="Push Notifications"
              subtitle="Get notified about requests"
              onPress={() => {}}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#e1e5e9', true: '#E53E3E' }}
                  thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                />
              }
              color="#F56500"
            />
            <ProfileOption
              icon="location"
              title="Location Services"
              subtitle="Find requests near you"
              onPress={() => {}}
              rightElement={
                <Switch
                  value={locationEnabled}
                  onValueChange={setLocationEnabled}
                  trackColor={{ false: '#e1e5e9', true: '#E53E3E' }}
                  thumbColor={locationEnabled ? '#fff' : '#f4f3f4'}
                />
              }
              color="#3182CE"
            />
            <ProfileOption
              icon="call"
              title="Emergency Contacts"
              subtitle="Manage emergency numbers"
              onPress={handleEmergencyContacts}
              color="#E53E3E"
            />
            <ProfileOption
              icon="settings"
              title="App Settings"
              subtitle="Privacy, security & more"
              onPress={handleSettings}
              color="#666"
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.optionsContainer}>
            <ProfileOption
              icon="help-circle"
              title="Help & FAQ"
              subtitle="Get answers to common questions"
              onPress={() => {}}
              color="#38A169"
            />
            <ProfileOption
              icon="mail"
              title="Contact Support"
              subtitle="Get help from our team"
              onPress={() => {}}
              color="#3182CE"
            />
            <ProfileOption
              icon="information-circle"
              title="About BloodBond"
              subtitle="Learn more about our mission"
              onPress={() => {}}
              color="#F56500"
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.optionsContainer}>
            <ProfileOption
              icon="log-out"
              title="Logout"
              subtitle="Sign out of your account"
              onPress={handleLogout}
              color="#DC2626"
            />
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>BloodBond v1.0.0</Text>
          <Text style={styles.versionSubtext}>Made with ❤️ for saving lives</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ... (styles remain the same)
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