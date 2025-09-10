// app/(app)/(tabs)/create.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext'; // CORRECTED PATH
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ActionCard: React.FC<{
  title: string;
  subtitle: string;
  icon: any; // Changed to any to support all Ionicons names
  color: string;
  onPress: () => void;
}> = ({ title, subtitle, icon, color, onPress }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress}>
    <LinearGradient
      colors={[color, color + '80']}
      style={styles.actionGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.actionContent}>
        <View style={styles.actionIconContainer}>
          <Ionicons name={icon} size={32} color="white" />
        </View>
        <View style={styles.actionTextContainer}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.actionArrow}>
          <Ionicons name="chevron-forward" size={24} color="white" />
        </View>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

const InfoCard: React.FC<{
  icon: any; // Changed to any to support all Ionicons names
  title: string;
  description: string;
  color: string;
}> = ({ icon, title, description, color }) => (
  <View style={styles.infoCard}>
    <View style={[styles.infoIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoDescription}>{description}</Text>
    </View>
  </View>
);

export default function CreateTabScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const handleCreateRequest = () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    router.push('/requests/create');
  };

  const handleBecomeDonor = () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    // Navigate to the profile edit screen, which is more appropriate
    // for existing users than the initial setup screen.
    router.push('/profile/edit');
  };

  const handleFindDonors = () => {
    // Corrected path to navigate to the requests tab
    router.push('/requests');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Make a Difference</Text>
            <Text style={styles.subtitle}>
              Every donation can save up to 3 lives
            </Text>
          </View>
          <View style={styles.bloodDropIcon}>
            <Ionicons name="water" size={32} color="#E53E3E" />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <ActionCard
            title="Request Blood"
            subtitle="Create a request for blood donation"
            icon="add-circle"
            color="#E53E3E"
            onPress={handleCreateRequest}
          />
          
          <ActionCard
            title="Become a Donor"
            subtitle="Update your profile to help"
            icon="heart"
            color="#38A169"
            onPress={handleBecomeDonor}
          />
          
          <ActionCard
            title="Find Donors"
            subtitle="Browse available blood requests"
            icon="search"
            color="#3182CE"
            onPress={handleFindDonors}
          />
        </View>

        {/* Blood Donation Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Donate Blood?</Text>
          
          <InfoCard
            icon="pulse"
            title="Save Lives"
            description="One donation can help up to 3 patients in need"
            color="#E53E3E"
          />
          
          <InfoCard
            icon="time"
            title="Quick Process"
            description="Donation takes only 10-15 minutes of your time"
            color="#F56500"
          />
          
          <InfoCard
            icon="refresh"
            title="Regular Impact"
            description="You can donate every 56 days and make ongoing impact"
            color="#38A169"
          />
          
          <InfoCard
            icon="shield-checkmark"
            title="Health Benefits"
            description="Regular donation can improve your cardiovascular health"
            color="#3182CE"
          />
        </View>

        {/* Emergency Numbers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyHeader}>
              <Ionicons name="medical" size={24} color="#E53E3E" />
              <Text style={styles.emergencyTitle}>24/7 Blood Emergency</Text>
            </View>
            <TouchableOpacity style={styles.emergencyButton}>
              <Ionicons name="call" size={20} color="white" />
              <Text style={styles.emergencyButtonText}>Call 123</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Impact</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>2,450</Text>
              <Text style={styles.statLabel}>Lives Saved</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>850</Text>
              <Text style={styles.statLabel}>Active Donors</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>156</Text>
              <Text style={styles.statLabel}>This Month</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flex: 1,
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
  bloodDropIcon: {
    width: 56,
    height: 56,
    backgroundColor: '#FEE2E2',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  actionCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionGradient: {
    padding: 20,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  actionArrow: {
    marginLeft: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emergencyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  emergencyButton: {
    backgroundColor: '#E53E3E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E53E3E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});