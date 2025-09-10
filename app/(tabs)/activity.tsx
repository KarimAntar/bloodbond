// app/(tabs)/activity.tsx
import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

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
}> = ({ activity, onPress }) => {
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
  const [stats, setStats] = useState({
    requestsCreated: 0,
    responsesSent: 0,
    donationsCompleted: 0,
    livesImpacted: 0,
  });

  const { user } = useAuth();
  const router = useRouter();

  const fetchUserActivity = async () => {
    if (!user) return;

    try {
      // Mock activity data - in real app, this would come from Firestore
      const mockActivities: ActivityItem[] = [
        {
          id: '1',
          type: 'request_created',
          title: 'Blood Request Created',
          description: 'You created a blood request for John Doe',
          timestamp: { toDate: () => new Date(Date.now() - 2 * 60 * 60 * 1000) },
          bloodType: 'A+',
          urgent: true,
        },
        {
          id: '2',
          type: 'response_sent',
          title: 'Response Sent',
          description: 'You responded to a blood request in Cairo',
          timestamp: { toDate: () => new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
          bloodType: 'O-',
        },
        {
          id: '3',
          type: 'donation_completed',
          title: 'Donation Completed',
          description: 'Successfully donated blood at Cairo Hospital',
          timestamp: { toDate: () => new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          bloodType: 'B+',
        },
        {
          id: '4',
          type: 'request_received',
          title: 'Request Response',
          description: 'Someone responded to your blood request',
          timestamp: { toDate: () => new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          bloodType: 'AB-',
        },
      ];

      setActivities(mockActivities);
      
      // Mock stats
      setStats({
        requestsCreated: 3,
        responsesSent: 8,
        donationsCompleted: 5,
        livesImpacted: 12,
      });
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  useEffect(() => {
    const loadActivity = async () => {
      setLoading(true);
      await fetchUserActivity();
      setLoading(false);
    };

    if (user) {
      loadActivity();
    } else {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserActivity();
    setRefreshing(false);
  };

  const handleActivityPress = (activity: ActivityItem) => {
    // Navigate based on activity type
    switch (activity.type) {
      case 'request_created':
      case 'request_received':
        router.push('/(tabs)/requests');
        break;
      case 'response_sent':
      case 'donation_completed':
        router.push('/(tabs)/requests');
        break;
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPrompt}>
          <Ionicons name="person-circle-outline" size={64} color="#ccc" />
          <Text style={styles.loginTitle}>Login Required</Text>
          <Text style={styles.loginDescription}>
            Sign in to view your activity and track your impact
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53E3E" />
        <Text style={styles.loadingText}>Loading your activity...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#E53E3E']}
            tintColor="#E53E3E"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Activity</Text>
          <Text style={styles.subtitle}>Track your blood donation impact</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Impact</Text>
          <View style={styles.statsGrid}>
            <StatsCard
              icon="add-circle"
              title="Requests"
              value={stats.requestsCreated}
              subtitle="Created"
              color="#E53E3E"
            />
            <StatsCard
              icon="paper-plane"
              title="Responses"
              value={stats.responsesSent}
              subtitle="Sent"
              color="#3182CE"
            />
            <StatsCard
              icon="heart"
              title="Donations"
              value={stats.donationsCompleted}
              subtitle="Completed"
              color="#38A169"
            />
            <StatsCard
              icon="people"
              title="Lives"
              value={stats.livesImpacted}
              subtitle="Impacted"
              color="#F56500"
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {activities.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Ionicons name="pulse-outline" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>No Activity Yet</Text>
              <Text style={styles.emptyDescription}>
                Start by creating a blood request or responding to existing ones
              </Text>
              <TouchableOpacity
                style={styles.getStartedButton}
                onPress={() => router.push('/(tabs)/create')}
              >
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activitiesList}>
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onPress={() => handleActivityPress(activity)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Achievement Section */}
        <View style={styles.achievementSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementCard}>
            <View style={styles.achievementIcon}>
              <Ionicons name="trophy" size={24} color="#F59E0B" />
            </View>
            <View style={styles.achievementContent}>
              <Text style={styles.achievementTitle}>First Response</Text>
              <Text style={styles.achievementDescription}>
                You sent your first response to a blood request!
              </Text>
            </View>
          </View>
          <View style={styles.achievementCard}>
            <View style={[styles.achievementIcon, { backgroundColor: '#E5E7EB' }]}>
              <Ionicons name="star" size={24} color="#9CA3AF" />
            </View>
            <View style={styles.achievementContent}>
              <Text style={[styles.achievementTitle, { color: '#9CA3AF' }]}>
                Life Saver
              </Text>
              <Text style={[styles.achievementDescription, { color: '#9CA3AF' }]}>
                Complete 5 donations (3/5)
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  activitySection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  activitiesList: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  achievementSection: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra padding for tab bar
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  loginDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: '#E53E3E',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});