import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  type: 'hospital' | 'blood_bank' | 'emergency' | 'police';
  address?: string;
  description?: string;
}

const EmergencyCard: React.FC<{
  contact: EmergencyContact;
  onCall: () => void;
}> = ({ contact, onCall }) => {
  const getContactIcon = () => {
    switch (contact.type) {
      case 'hospital':
        return { name: 'medical', color: '#E53E3E' };
      case 'blood_bank':
        return { name: 'water', color: '#3182CE' };
      case 'emergency':
        return { name: 'call', color: '#F56500' };
      case 'police':
        return { name: 'shield', color: '#38A169' };
      default:
        return { name: 'call', color: '#666' };
    }
  };

  const icon = getContactIcon();

  return (
    <View style={styles.emergencyCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.contactIcon, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name as any} size={24} color={icon.color} />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
          {contact.address && (
            <Text style={styles.contactAddress}>{contact.address}</Text>
          )}
        </View>
      </View>

      {contact.description && (
        <Text style={styles.contactDescription}>{contact.description}</Text>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: icon.color }]}
          onPress={onCall}
        >
          <Ionicons name="call" size={16} color="white" />
          <Text style={styles.actionButtonText}>Call Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function EmergencyContactsScreen() {
  const router = useRouter();

  // Egyptian emergency contacts data
  const emergencyContacts: EmergencyContact[] = [
    {
      id: '1',
      name: 'Egyptian Red Crescent',
      phone: '15333',
      type: 'emergency',
      description: '24/7 emergency medical and blood donation services',
    },
    {
      id: '2',
      name: 'Blood Bank Hotline',
      phone: '16023',
      type: 'blood_bank',
      description: 'National blood bank emergency coordination',
    },
    {
      id: '3',
      name: 'Medical Emergency',
      phone: '122',
      type: 'emergency',
      description: 'General medical emergency and ambulance services',
    },
    {
      id: '4',
      name: 'Police Emergency',
      phone: '122',
      type: 'police',
      description: 'Law enforcement and emergency response',
    },
    {
      id: '5',
      name: 'Fire Emergency',
      phone: '180',
      type: 'emergency',
      description: 'Fire department and rescue services',
    },
    {
      id: '6',
      name: 'Traffic Police',
      phone: '128',
      type: 'police',
      description: 'Traffic accidents and road emergencies',
    },
  ];

  const handleCall = async (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to make phone call from this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate call');
    }
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      'Emergency Call',
      'Are you sure you want to call emergency services?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 122', onPress: () => handleCall('122') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E53E3E', '#C53030']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.title}>Emergency Contacts</Text>
        <Text style={styles.subtitle}>Get help when you need it most</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Emergency Alert */}
        <View style={styles.emergencyAlert}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning" size={24} color="#F56500" />
            <Text style={styles.alertTitle}>Blood Emergency?</Text>
          </View>
          <Text style={styles.alertText}>
            If someone needs blood immediately, call emergency services first.
          </Text>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleEmergencyCall}
          >
            <Ionicons name="call" size={20} color="white" />
            <Text style={styles.emergencyButtonText}>Call 122</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: '#E53E3E' }]}
            onPress={() => router.push('/requests/create')}
          >
            <Ionicons name="add-circle" size={24} color="white" />
            <Text style={styles.quickActionText}>Create Request</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: '#3182CE' }]}
            onPress={() => router.push('/requests')}
          >
            <Ionicons name="search" size={24} color="white" />
            <Text style={styles.quickActionText}>Find Donors</Text>
          </TouchableOpacity>
        </View>

        {/* Contact List */}
        <View style={styles.contactsSection}>
          <Text style={styles.sectionTitle}>Important Contacts</Text>
          {emergencyContacts.map((contact) => (
            <EmergencyCard
              key={contact.id}
              contact={contact}
              onCall={() => handleCall(contact.phone)}
            />
          ))}
        </View>

        {/* Additional Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 Remember</Text>
          <Text style={styles.infoText}>
            • Always call emergency services (122) first in life-threatening situations{'\n'}
            • Blood banks can guide you to the nearest donation center{'\n'}
            • Hospitals have emergency blood supplies for critical cases{'\n'}
            • Your quick action can save lives
          </Text>
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  emergencyAlert: {
    backgroundColor: '#FFF5F5',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F56500',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F56500',
    marginLeft: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  emergencyButton: {
    backgroundColor: '#F56500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',

  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginTop: 8,
  },
  contactsSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  emergencyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 16,
    color: '#E53E3E',
    fontWeight: '500',
    marginBottom: 2,
  },
  contactAddress: {
    fontSize: 14,
    color: '#666',
  },
  contactDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
  },
});
