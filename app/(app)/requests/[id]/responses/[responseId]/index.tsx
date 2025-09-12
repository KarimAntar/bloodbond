// app/requests/[id]/responses/[responseId]/index.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView, ScrollView, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../../../../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../../../../../contexts/ThemeContext';
import { Colors } from '../../../../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface Response {
  id: string;
  responderName: string;
  message: string;
  contact: string;
  bloodType?: string;
  createdAt: any;
  requestId: string;
}

export default function ResponseDetails() {
  const [response, setResponse] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id, responseId } = useLocalSearchParams();
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];

  useEffect(() => {
    const fetchResponse = async () => {
      try {
        if (responseId) {
          // Fetch from main responses collection, not subcollection
          const responseDocRef = doc(db, 'responses', responseId as string);
          const responseDocSnap = await getDoc(responseDocRef);

          if (responseDocSnap.exists()) {
            const responseData = { id: responseDocSnap.id, ...responseDocSnap.data() } as Response;
            setResponse(responseData);
          }
        }
      } catch (error) {
        console.error('Error fetching response details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResponse();
  }, [responseId]);

  const handleContactPress = async (contact: string) => {
    const phoneRegex = /^[\+]?[0-9\-\(\)\s]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (phoneRegex.test(contact.replace(/\s/g, ''))) {
      // It's a phone number
      const url = `tel:${contact}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    } else if (emailRegex.test(contact)) {
      // It's an email
      const url = `mailto:${contact}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Email is not supported on this device');
      }
    } else {
      // Copy to clipboard or show alert
      Alert.alert('Contact Info', contact);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primaryText,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: colors.secondaryText,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    errorIcon: {
      marginBottom: 16,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primaryText,
      marginBottom: 8,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 16,
      color: colors.secondaryText,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 24,
    },
    backButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    backButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    scrollContent: {
      padding: 16,
    },
    responseCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    responseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    nameContainer: {
      flex: 1,
    },
    responderName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primaryText,
      marginBottom: 4,
    },
    responseTime: {
      fontSize: 14,
      color: colors.secondaryText,
    },
    bloodTypeBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    bloodTypeText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
    },
    detailSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primaryText,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    messageContainer: {
      backgroundColor: colors.screenBackground,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    messageText: {
      fontSize: 16,
      color: colors.primaryText,
      lineHeight: 24,
    },
    contactContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.screenBackground,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contactText: {
      flex: 1,
      fontSize: 16,
      color: colors.primary,
      marginLeft: 12,
    },
    contactButton: {
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginLeft: 12,
    },
    contactButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
  });

  if (loading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={dynamicStyles.loadingText}>Loading response details...</Text>
      </View>
    );
  }

  if (!response) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
          </TouchableOpacity>
          <Text style={dynamicStyles.title}>Response Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={dynamicStyles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.danger} style={dynamicStyles.errorIcon} />
          <Text style={dynamicStyles.errorTitle}>Response Not Found</Text>
          <Text style={dynamicStyles.errorText}>
            The response you're looking for couldn't be found. It may have been deleted or doesn't exist.
          </Text>
          <TouchableOpacity style={dynamicStyles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={16} color="#fff" />
            <Text style={dynamicStyles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={dynamicStyles.title}>Response Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={dynamicStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={dynamicStyles.responseCard}>
          <View style={dynamicStyles.responseHeader}>
            <View style={dynamicStyles.avatar}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
            <View style={dynamicStyles.nameContainer}>
              <Text style={dynamicStyles.responderName}>{response.responderName}</Text>
              <Text style={dynamicStyles.responseTime}>{formatDate(response.createdAt)}</Text>
            </View>
            {response.bloodType && (
              <View style={dynamicStyles.bloodTypeBadge}>
                <Text style={dynamicStyles.bloodTypeText}>{response.bloodType}</Text>
              </View>
            )}
          </View>

          <View style={dynamicStyles.detailSection}>
            <View style={dynamicStyles.sectionTitle}>
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
              <Text style={[dynamicStyles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>Message</Text>
            </View>
            <View style={dynamicStyles.messageContainer}>
              <Text style={dynamicStyles.messageText}>{response.message}</Text>
            </View>
          </View>

          <View style={dynamicStyles.detailSection}>
            <View style={dynamicStyles.sectionTitle}>
              <Ionicons name="call" size={18} color={colors.primary} />
              <Text style={[dynamicStyles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>Contact Information</Text>
            </View>
            <TouchableOpacity 
              style={dynamicStyles.contactContainer}
              onPress={() => handleContactPress(response.contact)}
            >
              <Ionicons name="call-outline" size={20} color={colors.primary} />
              <Text style={dynamicStyles.contactText}>{response.contact}</Text>
              <View style={dynamicStyles.contactButton}>
                <Text style={dynamicStyles.contactButtonText}>Contact</Text>
              </View>
            </TouchableOpacity>
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
  detailsCard: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#E53E3E',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
