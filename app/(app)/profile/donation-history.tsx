// app/profile/donation-history.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Donation {
  id: string;
  date: string;
  location: string;
  bloodType: string;
}

const donationHistory: Donation[] = [
  { id: '1', date: '2024-08-15', location: 'City Hospital', bloodType: 'A+' },
  { id: '2', date: '2024-05-20', location: 'Red Crescent Center', bloodType: 'A+' },
  { id: '3', date: '2024-02-10', location: 'Community Blood Drive', bloodType: 'A+' },
];

const DonationCard: React.FC<{ donation: Donation }> = ({ donation }) => (
  <View style={styles.donationCard}>
    <View style={styles.iconContainer}>
      <Ionicons name="heart-circle" size={32} color="#E53E3E" />
    </View>
    <View style={styles.donationInfo}>
      <Text style={styles.donationDate}>{donation.date}</Text>
      <Text style={styles.donationLocation}>{donation.location}</Text>
    </View>
    <View style={styles.bloodTypeBadge}>
      <Text style={styles.bloodTypeText}>{donation.bloodType}</Text>
    </View>
  </View>
);

export default function DonationHistoryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Donation History</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={donationHistory}
        renderItem={({ item }) => <DonationCard donation={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="timer-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Donations Yet</Text>
            <Text style={styles.emptyText}>Your donation history will appear here.</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  bloodTypeBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bloodTypeText: {
    color: '#E53E3E',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
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
  },
});