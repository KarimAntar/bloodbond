// app/(app)/(tabs)/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// --- Your existing components (StatsCard, ActionButton) can stay here ---
interface StatsCardProps {
  icon: string;
  title: string;
  count: number;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, title, count, color }) => (
  <View style={[styles.statsCard, { borderLeftColor: color }]}>
    <View style={styles.statsIconContainer}>
      <Ionicons name={icon as any} size={24} color={color} />
    </View>
    <View style={styles.statsContent}>
      <Text style={styles.statsCount}>{count}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
  </View>
);

interface ActionButtonProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  color: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, title, subtitle, onPress, color }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <View style={[styles.actionIconContainer, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon as any} size={24} color={color} />
    </View>
    <View style={styles.actionContent}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#666" />
  </TouchableOpacity>
);


export default function HomeScreen() {
  const { user, userProfile, loading, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalRequests: 12,
    activeRequests: 5,
    responsesGiven: 8,
    peopleSaved: 3
  });

  const handleLogout = async () => {
    console.log('=== HOME PAGE HANDLE LOGOUT CALLED - DIRECT LOGOUT ===');
    console.log('Starting logout process directly...');
    try {
      await logout();
      console.log('Logout completed successfully from home page');
      // The root layout will handle redirecting to the login screen automatically
    } catch (e) {
      console.error('Logout failed from home page', e);
      Alert.alert('Logout Failed', 'An unexpected error occurred.');
    }
  };


  if (loading || !user || !userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53E3E" />
        <Text style={styles.loadingText}>Loading BloodBond...</Text>
      </View>
    );
  }

  const firstName = userProfile.fullName.split(' ')[0];
  const currentHour = new Date().getHours();
  const getGreeting = () => {
    if (currentHour < 12) return 'Good morning';
    if (currentHour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{firstName} 👋</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationButton} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={24} color="#666" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount.toString()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* --- The rest of your home screen JSX is correct and can stay here --- */}
          <LinearGradient
            colors={['#E53E3E', '#C53030']}
            style={styles.heroSection}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroContent}>
              <Ionicons name="heart" size={32} color="white" />
              <Text style={styles.heroTitle}>BloodBond</Text>
              <Text style={styles.heroSubtitle}>
                Connecting lives through the gift of blood
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={[styles.bloodTypeBadge, { backgroundColor: '#E53E3E' }]}>
                <Text style={styles.bloodTypeText}>{userProfile.bloodType}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{userProfile.fullName}</Text>
                <Text style={styles.profileLocation}>
                  <Ionicons name="location" size={14} color="#666" /> {userProfile.city}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Your Impact</Text>
            <View style={styles.statsGrid}>
              <StatsCard
                icon="pulse"
                title="Total Requests"
                count={stats.totalRequests}
                color="#E53E3E"
              />
              <StatsCard
                icon="time"
                title="Active Requests"
                count={stats.activeRequests}
                color="#F56500"
              />
              <StatsCard
                icon="chatbubble-ellipses"
                title="Responses Given"
                count={stats.responsesGiven}
                color="#38A169"
              />
              <StatsCard
                icon="people"
                title="Lives Touched"
                count={stats.peopleSaved}
                color="#3182CE"
              />
            </View>
          </View>

          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsList}>
              <ActionButton
                icon="add-circle"
                title="Create Request"
                subtitle="Request blood donation"
                onPress={() => router.push('/requests/create')}
                color="#E53E3E"
              />
              <ActionButton
                icon="list"
                title="Browse Requests"
                subtitle="Find people who need help"
                onPress={() => router.push('/requests')}
                color="#3182CE"
              />
              <ActionButton
                icon="person"
                title="Update Profile"
                subtitle="Manage your information"
                onPress={() => router.push('/(app)/profile/edit')}
                color="#38A169"
              />
              <ActionButton
                icon="notifications"
                title="Notifications"
                subtitle="Stay updated on responses"
                onPress={() => router.push('/notifications')}
                color="#F56500"
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
  );
}
// Your styles will remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 2,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    marginRight: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E53E3E',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  heroSection: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 8,
  },
  profileCard: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bloodTypeBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloodTypeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  profileLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsSection: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    backgroundColor: 'white',
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsIconContainer: {
    marginBottom: 8,
  },
  statsContent: {
    flex: 1,
  },
  statsCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statsTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionsSection: {
    margin: 20,
    marginBottom: 40,
  },
  actionsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
