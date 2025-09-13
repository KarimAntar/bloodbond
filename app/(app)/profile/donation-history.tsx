// app/(app)/profile/donation-history.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../../firebase/firebaseConfig';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors } from '../../../constants/Colors';

interface Donation {
  id: string;
  donorId: string;
  requestId: string;
  responseId: string;
  date: any;
  location: string;
  bloodType: string;
  status: string;
  createdAt: any;
}

const DonationCard: React.FC<{ donation: Donation; colors: any }> = ({ donation, colors }) => {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown Date';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toDateString();
    } catch (error) {
      return 'Unknown Date';
    }
  };

  return (
    <View style={[styles.donationCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.iconContainer}>
        <Ionicons name="heart-circle" size={40} color="#E53E3E" />
      </View>
      <View style={styles.donationInfo}>
        <Text style={[styles.donationDate, { color: colors.primaryText }]}>{formatDate(donation.date)}</Text>
        <Text style={[styles.donationLocation, { color: colors.secondaryText }]}>{donation.location}</Text>
      </View>
      <View style={styles.rightContainer}>
        <View style={styles.bloodTypeBadge}>
          <Text style={styles.bloodTypeText}>{donation.bloodType}</Text>
        </View>
        <Text style={[styles.statusText, { color: donation.status === 'Completed' ? '#38A169' : '#F59E0B' }]}>
          {donation.status}
        </Text>
      </View>
    </View>
  );
};

export default function DonationHistoryScreen() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];

  useEffect(() => {
    const fetchDonations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'donations'),
          where('donorId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const donationsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Donation));

        setDonations(donationsList);
      } catch (error) {
        console.error('Error fetching donations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, [user]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]}>
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.primaryText }]}>Donation History</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading donations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primaryText }]}>Donation History</Text>
        <View style={styles.headerRight} />
      </View>
      <FlatList
        data={donations}
        renderItem={({ item }) => <DonationCard donation={item} colors={colors} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="timer-outline" size={64} color={colors.secondaryText + '60'} />
            <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>No Donations Yet</Text>
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              Your past and scheduled donations will appear here.
            </Text>
          </View>
        )}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
      width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  listContainer: {
    padding: 16,
  },
  donationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

  },
  iconContainer: {
    marginRight: 16,
  },
  donationInfo: {
    flex: 1,
  },
  donationDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  donationLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  bloodTypeBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  bloodTypeText: {
    color: '#E53E3E',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusText: {
      fontSize: 12,
      fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
