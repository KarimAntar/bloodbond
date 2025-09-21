// app/(app)/(tabs)/create.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors } from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ActionCard: React.FC<{
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  onPress: () => void;
  styles: any;
}> = ({ title, subtitle, icon, color, onPress, styles }) => (
  <TouchableOpacity 
    style={styles.actionCard} 
    onPress={onPress}
    accessible={true}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
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
  icon: any;
  title: string;
  description: string;
  color: string;
  styles: any;
}> = ({ icon, title, description, color, styles }) => (
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
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];
  const router = useRouter();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Donate - BloodBond';
    }
  }, []);

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
    router.push('/profile/edit');
  };

  const handleFindDonors = () => {
    router.push('/requests');
  };

  // Create dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    headerContent: {
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primaryText,
    },
    subtitle: {
      fontSize: 16,
      color: colors.secondaryText,
      marginTop: 4,
    },
    bloodDropIcon: {
      width: 56,
      height: 56,
      backgroundColor: colors.primary + '20',
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
      color: colors.primaryText,
      marginBottom: 16,
    },
    actionCard: {
      marginBottom: 12,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
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
      backgroundColor: colors.cardBackground,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 1,
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
      color: colors.primaryText,
      marginBottom: 4,
    },
    infoDescription: {
      fontSize: 14,
      color: colors.secondaryText,
      lineHeight: 20,
    },
    emergencyCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 1,
    },
    emergencyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    emergencyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryText,
      marginLeft: 12,
    },
    emergencyButton: {
      backgroundColor: colors.primary,
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
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 1,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.secondaryText,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.headerContent}>
            <Text style={dynamicStyles.title}>Make a Difference</Text>
            <Text style={dynamicStyles.subtitle}>
              Every donation can save up to 3 lives
            </Text>
          </View>
          <View style={dynamicStyles.bloodDropIcon}>
            <Ionicons name="water" size={32} color={colors.primary} />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Quick Actions</Text>

          <ActionCard
            title="Request Blood"
            subtitle="Create a request for blood donation"
            icon="add-circle"
            color={colors.primary}
            onPress={handleCreateRequest}
            styles={dynamicStyles}
          />

          <ActionCard
            title="Become a Donor"
            subtitle="Update your profile to help"
            icon="heart"
            color={colors.success}
            onPress={handleBecomeDonor}
            styles={dynamicStyles}
          />

          <ActionCard
            title="Find Donors"
            subtitle="Browse available blood requests"
            icon="search"
            color={colors.secondary}
            onPress={handleFindDonors}
            styles={dynamicStyles}
          />
        </View>

        {/* Blood Donation Info */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Why Donate Blood?</Text>

          <InfoCard
            icon="pulse"
            title="Save Lives"
            description="One donation can help up to 3 patients in need"
            color={colors.primary}
            styles={dynamicStyles}
          />

          <InfoCard
            icon="time"
            title="Quick Process"
            description="Donation takes only 10-15 minutes of your time"
            color={colors.warning}
            styles={dynamicStyles}
          />

          <InfoCard
            icon="refresh"
            title="Regular Impact"
            description="You can donate every 56 days and make ongoing impact"
            color={colors.success}
            styles={dynamicStyles}
          />

          <InfoCard
            icon="shield-checkmark"
            title="Health Benefits"
            description="Regular donation can improve your cardiovascular health"
            color={colors.secondary}
            styles={dynamicStyles}
          />
        </View>

        {/* Emergency Numbers */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Emergency Contacts</Text>

          <View style={dynamicStyles.emergencyCard}>
            <View style={dynamicStyles.emergencyHeader}>
              <Ionicons name="medical" size={24} color={colors.primary} />
              <Text style={dynamicStyles.emergencyTitle}>Egyptian Red Crescent</Text>
            </View>
            <TouchableOpacity 
              style={dynamicStyles.emergencyButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Call Egyptian Red Crescent at 15333"
              onPress={() => { /* Handle call */ }}
            >
              <Ionicons name="call" size={20} color="white" />
              <Text style={dynamicStyles.emergencyButtonText}>Call 15333</Text>
            </TouchableOpacity>
          </View>

          <View style={dynamicStyles.emergencyCard}>
            <View style={dynamicStyles.emergencyHeader}>
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
              <Text style={dynamicStyles.emergencyTitle}>Blood Bank Hotline</Text>
            </View>
            <TouchableOpacity 
              style={dynamicStyles.emergencyButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Call Blood Bank Hotline at 16023"
              onPress={() => { /* Handle call */ }}
            >
              <Ionicons name="call" size={20} color="white" />
              <Text style={dynamicStyles.emergencyButtonText}>Call 16023</Text>
            </TouchableOpacity>
          </View>

          <View style={dynamicStyles.emergencyCard}>
            <View style={dynamicStyles.emergencyHeader}>
              <Ionicons name="warning" size={24} color={colors.primary} />
              <Text style={dynamicStyles.emergencyTitle}>Medical Emergency</Text>
            </View>
            <TouchableOpacity 
              style={dynamicStyles.emergencyButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Call Medical Emergency at 122"
              onPress={() => { /* Handle call */ }}
            >
              <Ionicons name="call" size={20} color="white" />
              <Text style={dynamicStyles.emergencyButtonText}>Call 122</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Community Impact</Text>
          <View style={dynamicStyles.statsContainer}>
            <View style={dynamicStyles.statItem}>
              <Text style={dynamicStyles.statNumber}>2,450</Text>
              <Text style={dynamicStyles.statLabel}>Lives Saved</Text>
            </View>
            <View style={dynamicStyles.statItem}>
              <Text style={dynamicStyles.statNumber}>850</Text>
              <Text style={dynamicStyles.statLabel}>Active Donors</Text>
            </View>
            <View style={dynamicStyles.statItem}>
              <Text style={dynamicStyles.statNumber}>156</Text>
              <Text style={dynamicStyles.statLabel}>This Month</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
