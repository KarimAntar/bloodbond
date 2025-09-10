// app/(app)/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
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
import { AuthProvider } from '../../../contexts/AuthContext'; // Adjust path as needed
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// --- Your existing components (StatsCard, ActionButton) are correct and can stay here ---
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
  const router = useRouter();
  const [stats, setStats] = useState({
    totalRequests: 12,
    activeRequests: 5,
    responsesGiven: 8,
    peopleSaved: 3
  });

  useEffect(() => {
    // This effect redirects the user if their profile isn't complete.
    // The main auth guard is now in (app)/_layout.tsx.
    if (!loading && user && (!userProfile || !userProfile.profileComplete)) {
      router.replace('/(app)/profile/setup');
    }
  }, [user, userProfile, loading, router]);

    const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login'); // Explicitly navigate to login page after successful logout
            } catch (e) {
              console.error('Logout failed', e);
            }
          },
        }
      ]
    );
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

  return (
    <AuthProvider>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.userName}>{firstName} 👋</Text>
          </View>
          {/* THE FIX IS HERE: Added onPress={handleLogout} */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#666" />
          </TouchableOpacity>
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
                onPress={() => {/* TODO: Implement notifications */}}
                color="#F56500"
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuthProvider>
  );
}

// --- Your styles are correct and can stay here ---
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