// app/(app)/(tabs)/activity.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useUserStats } from '../../../contexts/UserStatsContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors } from '../../../constants/Colors';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PullToRefresh from '../../../components/PullToRefresh';
import { SkeletonCard } from '../../../components/SkeletonLoader';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../../firebase/firebaseConfig';

// ... (ActivityCard and StatsCard components remain the same)
interface ActivityItem {
  id: string;
  type: 'request_created' | 'response_sent' | 'request_received' | 'donation_completed';
  title: string;
  description: string;
  timestamp: any;
  bloodType?: string;
  urgent?: boolean;
}

const ActivityCard: React.FC<{ 
  activity: ActivityItem; 
  onPress?: () => void;
  colors: any;
}> = ({ activity, onPress, colors }) => {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'request_created':
        return { name: 'add-circle', color: '#E53E3E' };
      case 'response_sent':
        return { name: 'paper-plane', color: '#3182CE' };
      case 'request_received':
        return { name: 'mail', color: '#F56500' };
      case 'donation_completed':
        return { name: 'checkmark-circle', color: '#38A169' };
      default:
        return { name: 'pulse', color: '#666' };
    }
  };

  const getTimeAgo = () => {
    if (!activity.timestamp) return 'Recently';
    
    const now = new Date();
    const activityTime = activity.timestamp.toDate();
    const diffInHours = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  const icon = getActivityIcon();

  return (
    <TouchableOpacity style={styles.activityCard} onPress={onPress}>
      <View style={[styles.activityIcon, { backgroundColor: icon.color + '20' }]}>
        <Ionicons name={icon.name as any} size={20} color={icon.color} />
      </View>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityTitle}>{activity.title}</Text>
          <Text style={styles.activityTime}>{getTimeAgo()}</Text>
        </View>
        <Text style={styles.activityDescription}>{activity.description}</Text>
        {activity.bloodType && (
          <View style={styles.activityMeta}>
            <View style={styles.bloodTypeBadge}>
              <Text style={styles.bloodTypeText}>{activity.bloodType}</Text>
            </View>
            {activity.urgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const StatsCard: React.FC<{
  icon: string;
  title: string;
  value: number;
  subtitle: string;
  color: string;
}> = ({ icon, title, value, subtitle, color }) => (
  <View style={styles.statsCard}>
    <View style={[styles.statsIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={24} color={color} />
    </View>
    <View style={styles.statsContent}>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
      <Text style={styles.statsSubtitle}>{subtitle}</Text>
    </View>
  </View>
);


export default function ActivityTabScreen() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();
  const { stats } = useUserStats();
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];
  const router = useRouter();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Activity - BloodBond';
    }
  }, []);

  const fetchUserActivity = async () => {
    if (!user) return;

    try {
      // Fetch user's activity (requests created and responses sent)
      const activityQuery = query(
        collection(db, 'activity'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      const activitySnapshot = await getDocs(activityQuery);
      const activityData = activitySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as ActivityItem));

      // Also fetch responses where user is the responder
      const responsesQuery = query(
        collection(db, 'responses'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const responsesSnapshot = await getDocs(responsesQuery);
      const responseActivities: ActivityItem[] = responsesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'response_sent' as const,
          title: 'Response Sent',
          description: `You responded to a ${data.bloodType} blood request`,
          timestamp: data.createdAt,
          bloodType: data.bloodType,
        };
      });

      // Combine and sort all activities
      const allActivities = [...activityData, ...responseActivities]
        .sort((a, b) => {
          const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return bTime.getTime() - aTime.getTime();
        })
        .slice(0, 20); // Keep only the most recent 20

      setActivities(allActivities);

    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // useFocusEffect is like useEffect but runs every time the screen comes into view
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchUserActivity();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserActivity();
  };

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
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primaryText,
      marginBottom: 16,
    },
    statsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      width: '48%',
      marginBottom: 12,
      boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

    },
    statsValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primaryText,
      marginBottom: 4,
    },
    statsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primaryText,
      marginBottom: 2,
    },
    statsSubtitle: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    activitiesList: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

    },
    activityCard: {
      flexDirection: 'row',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    activityTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryText,
      flex: 1,
      marginRight: 8,
    },
    activityTime: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    activityDescription: {
      fontSize: 14,
      color: colors.secondaryText,
      lineHeight: 20,
      marginBottom: 8,
    },
    emptyActivity: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 32,
      alignItems: 'center',
      boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primaryText,
      marginTop: 12,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    getStartedButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <LinearGradient
          colors={[colors.primary, colors.primary + 'DD']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Text style={styles.title}>Your Activity</Text>
            <Text style={styles.subtitle}>Loading your impact...</Text>
          </View>
        </LinearGradient>

        <View style={styles.statsSection}>
          <Text style={dynamicStyles.sectionTitle}>Your Activity</Text>
          <View style={styles.statsGrid}>
            <SkeletonCard colors={colors} />
            <SkeletonCard colors={colors} />
          </View>
        </View>

        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>Recent Activity</Text>
          </View>
          <View style={dynamicStyles.activitiesList}>
            {[...Array(3)].map((_, index) => (
              <SkeletonCard key={index} colors={colors} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
        <ScrollView
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[colors.primary, colors.primary + 'DD']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
          <View style={styles.headerContent}>
            <Text style={styles.title}>Your Activity</Text>
            <Text style={styles.subtitle}>Track your blood donation impact</Text>
          </View>
        </LinearGradient>

        <View style={styles.statsSection}>
          <Text style={dynamicStyles.sectionTitle}>Your Activity</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={dynamicStyles.statsCard}
              onPress={() => router.push('/profile/my-requests')}
            >
              <View style={[styles.statsIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="add-circle" size={24} color={colors.primary} />
              </View>
              <View style={styles.statsContent}>
                <Text style={dynamicStyles.statsValue}>{stats.requestsCreated}</Text>
                <Text style={dynamicStyles.statsTitle}>My Requests</Text>
                <Text style={dynamicStyles.statsSubtitle}>View All</Text>
              </View>
              <View style={styles.statsArrow}>
                <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={dynamicStyles.statsCard}
              onPress={() => router.push('/profile/my-responses')}
            >
              <View style={[styles.statsIcon, { backgroundColor: '#3182CE20' }]}>
                <Ionicons name="paper-plane" size={24} color="#3182CE" />
              </View>
              <View style={styles.statsContent}>
                <Text style={dynamicStyles.statsValue}>{stats.responsesSent}</Text>
                <Text style={dynamicStyles.statsTitle}>My Responses</Text>
                <Text style={dynamicStyles.statsSubtitle}>View All</Text>
              </View>
              <View style={styles.statsArrow}>
                <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>Recent Activity</Text>
          </View>
          {activities.length === 0 ? (
            <View style={dynamicStyles.emptyActivity}>
              <Ionicons name="pulse-outline" size={48} color={colors.secondaryText + '60'} />
              <Text style={dynamicStyles.emptyTitle}>No Activity Yet</Text>
              <Text style={dynamicStyles.emptyDescription}>
                Start by creating a blood request or responding to existing ones.
              </Text>
              <TouchableOpacity
                style={dynamicStyles.getStartedButton}
                onPress={() => router.push('/(app)/(tabs)/create')}
              >
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={dynamicStyles.activitiesList}>
              {activities.map((activity) => (
                <View key={activity.id} style={dynamicStyles.activityCard}>
                  <View style={[styles.activityIcon, { backgroundColor: activity.type === 'request_created' ? colors.primary + '20' : '#3182CE20' }]}>
                    <Ionicons 
                      name={activity.type === 'request_created' ? 'add-circle' : 'paper-plane'} 
                      size={20} 
                      color={activity.type === 'request_created' ? colors.primary : '#3182CE'} 
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <Text style={dynamicStyles.activityTitle}>{activity.title}</Text>
                      <Text style={dynamicStyles.activityTime}>
                        {activity.timestamp ? (() => {
                          const now = new Date();
                          const activityTime = activity.timestamp.toDate();
                          const diffInHours = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60 * 60));
                          if (diffInHours < 1) return 'Just now';
                          if (diffInHours < 24) return `${diffInHours}h ago`;
                          const diffInDays = Math.floor(diffInHours / 24);
                          return diffInDays < 7 ? `${diffInDays}d ago` : `${Math.floor(diffInDays / 7)}w ago`;
                        })() : 'Recently'}
                      </Text>
                    </View>
                    <Text style={dynamicStyles.activityDescription}>{activity.description}</Text>
                    {activity.bloodType && (
                      <View style={styles.activityMeta}>
                        <View style={[styles.bloodTypeBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.bloodTypeText}>{activity.bloodType}</Text>
                        </View>
                        {activity.urgent && (
                          <View style={styles.urgentBadge}>
                            <Text style={styles.urgentText}>URGENT</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      </PullToRefresh>
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
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 16,
    color: '#E53E3E',
    fontWeight: '500',
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsContent: {
    alignItems: 'flex-start',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  statsSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  statsArrow: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  activitySection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  activitiesList: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

  },
  activityCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bloodTypeBadge: {
    backgroundColor: '#E53E3E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  bloodTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  urgentBadge: {
    backgroundColor: '#F56500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  urgentText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyActivity: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  getStartedButton: {
    backgroundColor: '#E53E3E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  getStartedButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
