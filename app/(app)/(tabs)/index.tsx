// app/(app)/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PullToRefresh from '../../../components/PullToRefresh';
import { SkeletonCard } from '../../../components/SkeletonLoader';
import { db } from '../../../firebase/firebaseConfig';
import { collection, getDocs, query, orderBy, where, doc, updateDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

// --- Your existing components (StatsCard, ActionButton) can stay here ---
interface StatsCardProps {
  icon: string;
  title: string;
  count: number;
  color: string;
  colors: any;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, title, count, color, colors }) => (
  <View style={[{
    backgroundColor: colors.cardBackground,
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: color,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

  }]}>
    <View style={styles.statsIconContainer}>
      <Ionicons name={icon as any} size={24} color={color} />
    </View>
    <View style={styles.statsContent}>
      <Text style={[styles.statsCount, { color: colors.primaryText }]}>{count}</Text>
      <Text style={[styles.statsTitle, { color: colors.secondaryText }]}>{title}</Text>
    </View>
  </View>
);

interface ActionButtonProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  color: string;
  colors: any;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, title, subtitle, onPress, color, colors }) => (
  <TouchableOpacity 
    style={[{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }]} 
    onPress={onPress}
  >
    <View style={[styles.actionIconContainer, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon as any} size={24} color={color} />
    </View>
    <View style={styles.actionContent}>
      <Text style={[styles.actionTitle, { color: colors.primaryText }]}>{title}</Text>
      <Text style={[styles.actionSubtitle, { color: colors.secondaryText }]}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
  </TouchableOpacity>
);


export default function HomeScreen() {
  const { user, userProfile, loading, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState({
    totalRequests: 12,
    activeRequests: 5,
    responsesGiven: 8,
    peopleSaved: 3
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Home - BloodBond';
    }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch all requests
      const requestsQuery = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
      const requestsSnapshot = await getDocs(requestsQuery);
      const allRequests = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const totalRequests = allRequests.length;

      // Check and update expired requests
      const updatePromises = allRequests
        .filter(r => {
          const createdAt = (r as any).createdAt?.toDate();
          const isExpired = createdAt && createdAt <= sevenDaysAgo && !(r as any).expired;
          return isExpired;
        })
        .map(async (request) => {
          try {
            const requestRef = doc(db, 'requests', request.id);
            await updateDoc(requestRef, {
              expired: true,
              expiredAt: now
            });
          } catch (error) {
            console.error('Error updating expired request:', error);
          }
        });

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      // Active requests: non-expired requests
      const activeRequests = allRequests.filter(r => !(r as any).expired).length;

      // Fetch all responses
      const responsesQuery = query(collection(db, 'responses'), orderBy('createdAt', 'desc'));
      const responsesSnapshot = await getDocs(responsesQuery);
      const responsesGiven = responsesSnapshot.size;

      // Build response count map by requestId
      const responseMap = new Map();
      responsesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.requestId) {
          const count = responseMap.get(data.requestId) || 0;
          responseMap.set(data.requestId, count + 1);
        }
      });

      // Successful donations: expired requests with at least 1 response
      const successfulDonations = allRequests.filter(r => {
        const isExpired = (r as any).expired;
        return isExpired && responseMap.get(r.id) > 0;
      }).length;

      setStats({
        totalRequests,
        activeRequests,
        responsesGiven,
        peopleSaved: successfulDonations
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Keep default values on error
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
      marginTop: 12,
      fontSize: 16,
      color: colors.secondaryText,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 20,
      backgroundColor: colors.cardBackground,
    },
    greeting: {
      fontSize: 16,
      color: colors.secondaryText,
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primaryText,
      marginTop: 2,
    },
    profileCard: {
      margin: 20,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 20,
      boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',

    },
    profileName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primaryText,
    },
    profileLocation: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.primaryText,
      marginBottom: 16,
    },
    actionsList: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',

    },
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


  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  if (loading || !user || !userProfile) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={[dynamicStyles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerLeft}>
            <Text style={dynamicStyles.greeting}>Loading...</Text>
            <Text style={dynamicStyles.userName}>BloodBond</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color={colors.secondaryText} />
            </View>
            <View style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={24} color={colors.secondaryText} />
            </View>
          </View>
        </View>

        <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
          <ScrollView showsVerticalScrollIndicator={false}>
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

          <View style={{ margin: 20 }}>
            <SkeletonCard colors={colors} />
          </View>

          <View style={styles.statsSection}>
            <Text style={dynamicStyles.sectionTitle}>Your Impact</Text>
            <View style={styles.statsGrid}>
              <SkeletonCard colors={colors} />
              <SkeletonCard colors={colors} />
              <SkeletonCard colors={colors} />
              <SkeletonCard colors={colors} />
            </View>
          </View>

          <View style={styles.actionsSection}>
            <Text style={dynamicStyles.sectionTitle}>Quick Actions</Text>
            <View style={dynamicStyles.actionsList}>
              <SkeletonCard colors={colors} />
            </View>
          </View>
        </ScrollView>
      </PullToRefresh>
      </SafeAreaView>
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
      <SafeAreaView style={dynamicStyles.container}>
        {/* Header */}
        <View style={dynamicStyles.header}>
          <View style={styles.headerLeft}>
            <Text style={dynamicStyles.greeting}>{getGreeting()}</Text>
            <Text style={dynamicStyles.userName}>{firstName} 👋</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationButton} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={24} color={colors.secondaryText} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount.toString()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={24} color={colors.secondaryText} />
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

          <View style={dynamicStyles.profileCard}>
            <View style={styles.profileHeader}>
              {userProfile.profilePicture ? (
                <Image 
                  source={{ uri: userProfile.profilePicture }} 
                  style={styles.profilePicture}
                />
              ) : (
                <View style={[styles.profilePicturePlaceholder, { backgroundColor: colors.border }]}>
                  <Ionicons name="person" size={24} color={colors.secondaryText} />
                </View>
              )}
              
              <View style={styles.profileInfo}>
                <View style={styles.profileNameRow}>
                  <Text style={dynamicStyles.profileName}>{userProfile.fullName}</Text>
                  <View style={[styles.bloodTypeBadge, { backgroundColor: '#E53E3E' }]}>
                    <Text style={styles.bloodTypeText}>{userProfile.bloodType}</Text>
                  </View>
                </View>
                <Text style={dynamicStyles.profileLocation}>
                  <Ionicons name="location" size={14} color={colors.secondaryText} /> {userProfile.city}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={dynamicStyles.sectionTitle}>Your Impact</Text>
            <View style={styles.statsGrid}>
              <StatsCard
                icon="pulse"
                title="Total Requests"
                count={stats.totalRequests}
                color="#E53E3E"
                colors={colors}
              />
              <StatsCard
                icon="time"
                title="Active Requests"
                count={stats.activeRequests}
                color="#F56500"
                colors={colors}
              />
              <StatsCard
                icon="chatbubble-ellipses"
                title="Responses Given"
                count={stats.responsesGiven}
                color="#38A169"
                colors={colors}
              />
              <StatsCard
                icon="people"
                title="Lives Touched"
                count={stats.peopleSaved}
                color="#3182CE"
                colors={colors}
              />
            </View>
          </View>

          <View style={styles.actionsSection}>
            <Text style={dynamicStyles.sectionTitle}>Quick Actions</Text>
            <View style={dynamicStyles.actionsList}>
              <ActionButton
                icon="add-circle"
                title="Create Request"
                subtitle="Request blood donation"
                onPress={() => router.push('/requests/create')}
                color="#E53E3E"
                colors={colors}
              />
              <ActionButton
                icon="list"
                title="Browse Requests"
                subtitle="Find people who need help"
                onPress={() => router.push('/requests')}
                color="#3182CE"
                colors={colors}
              />
              <ActionButton
                icon="person"
                title="Update Profile"
                subtitle="Manage your information"
                onPress={() => router.push('/(app)/profile/edit')}
                color="#38A169"
                colors={colors}
              />
              <ActionButton
                icon="notifications"
                title="Notifications"
                subtitle="Stay updated on responses"
                onPress={() => router.push('/notifications')}
                color="#F56500"
                colors={colors}
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
      // paddingTop: 10, // Removed, handled by insets.top
      paddingBottom: 20,
      // backgroundColor: colors.cardBackground, // Moved to dynamicStyles.header
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
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',

  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profilePicturePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bloodTypeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloodTypeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
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
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

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
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',

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
