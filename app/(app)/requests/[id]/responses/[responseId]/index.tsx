// app/requests/[id]/responses/[responseId]/index.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, SafeAreaView, ScrollView, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../../../../../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { useTheme } from '../../../../../../contexts/ThemeContext';
import { Colors } from '../../../../../../constants/Colors';
import { useAuth } from '../../../../../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../../../../../../components/CustomModal';

interface Response {
  id: string;
  userId?: string;
  responderName: string;
  message: string;
  contact: string;
  bloodType?: string;
  createdAt: any;
  requestId: string;
  donated?: boolean;
}

interface Request {
  id: string;
  userId: string;
  fullName: string;
  bloodType: string;
  city: string;
  hospital: string;
  contactNumber: string;
  notes?: string;
  urgent?: boolean;
  createdAt: any;
}

export default function ResponseDetails() {
  const [response, setResponse] = useState<Response | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRequestPoster, setIsRequestPoster] = useState(false);
  const [donateModalVisible, setDonateModalVisible] = useState(false);
  const router = useRouter();
  const { id, responseId } = useLocalSearchParams();
  const { currentTheme } = useTheme();
  const { user, userProfile } = useAuth();
  const colors = Colors[currentTheme];

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (responseId && id) {
          // Fetch response
          const responseDocRef = doc(db, 'responses', responseId as string);
          const responseDocSnap = await getDoc(responseDocRef);

          if (responseDocSnap.exists()) {
            const responseData = { id: responseDocSnap.id, ...responseDocSnap.data() } as Response;
            setResponse(responseData);
          }

          // Fetch request to check ownership
          const requestDocRef = doc(db, 'requests', id as string);
          const requestDocSnap = await getDoc(requestDocRef);

          if (requestDocSnap.exists()) {
            const requestData = { id: requestDocSnap.id, ...requestDocSnap.data() } as Request;
            setRequest(requestData);

            // Check if current user is the request poster
            if (user && requestData.userId === user.uid) {
              setIsRequestPoster(true);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [responseId, id, user]);

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

  const handleMarkAsDonated = () => {
    if (!response || !request || !user) {
      console.log('Missing required data:', { response: !!response, request: !!request, user: !!user });
      return;
    }

    console.log('Mark as donated clicked:', {
      responseId: response.id,
      requestId: request.id,
      userId: user.uid,
      isRequestPoster,
      responseUserId: response.userId
    });

    setDonateModalVisible(true);
  };

  const confirmMarkAsDonated = async () => {
    try {
      console.log('Updating response document...');
      // Update response to mark as donated
      await updateDoc(doc(db, 'responses', response!.id), {
        donated: true,
        donatedAt: new Date(),
        donatedBy: user!.uid,
      });

      console.log('Creating donation record...');
      // Create donation record
      const donationData = {
        donorId: response!.userId || user!.uid,
        donorName: response!.responderName,
        requestId: request!.id,
        responseId: response!.id,
        date: new Date(),
        location: request!.hospital,
        bloodType: response!.bloodType || request!.bloodType,
        status: 'Completed',
        createdAt: new Date(),
        markedBy: user!.uid,
        requestTitle: `${request!.fullName} - ${request!.bloodType}`,
      };

      await addDoc(collection(db, 'donations'), donationData);
      console.log('Donation record created:', donationData);

      // Update local state
      setResponse({ ...response!, donated: true });
      setDonateModalVisible(false);

      // Show success modal
      setTimeout(() => {
        Alert.alert('Success', 'Response marked as donated and added to donor\'s history!');
      }, 500);
    } catch (error) {
      console.error('Error marking as donated:', error);
      setDonateModalVisible(false);
      setTimeout(() => {
        Alert.alert('Error', 'Failed to mark as donated. Please try again.');
      }, 500);
    }
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
    editButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
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
      boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',

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
      writingDirection: 'ltr',
      textAlign: 'left',
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
      writingDirection: 'ltr',
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
    donateButton: {
      backgroundColor: '#38A169',
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    donateButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    donatedBadge: {
      backgroundColor: '#F0FDF4',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: '#BBF7D0',
    },
    donatedBadgeText: {
      color: '#166534',
      fontSize: 16,
      fontWeight: '600',
    },
    privacyNotice: {
      backgroundColor: colors.screenBackground,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    privacyNoticeText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
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

          {/* Contact Information - Only show to request poster or response author */}
          {(isRequestPoster || (user && response.userId === user.uid)) && (
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
          )}

          {/* Privacy notice for unauthorized users */}
          {(!isRequestPoster && (!user || response.userId !== user.uid)) && (
            <View style={dynamicStyles.detailSection}>
              <View style={dynamicStyles.privacyNotice}>
                <Ionicons name="lock-closed" size={20} color={colors.secondaryText} />
                <Text style={[dynamicStyles.privacyNoticeText, { color: colors.secondaryText }]}>
                  Contact information is only visible to the request poster and the person who made this response.
                </Text>
              </View>
            </View>
          )}

          {/* Mark as Donated Button - Only show for request poster if not already donated */}
          {isRequestPoster && !response.donated && (
            <View style={dynamicStyles.detailSection}>
              <TouchableOpacity
                style={dynamicStyles.donateButton}
                onPress={handleMarkAsDonated}
              >
                <Ionicons name="heart" size={20} color="#fff" />
                <Text style={dynamicStyles.donateButtonText}>Mark as Donated</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Donated Badge - Show if already marked as donated */}
          {response.donated && (
            <View style={dynamicStyles.detailSection}>
              <View style={dynamicStyles.donatedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#38A169" />
                <Text style={dynamicStyles.donatedBadgeText}>Marked as Donated</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Custom Modal for Mark as Donated Confirmation */}
      <CustomModal
        visible={donateModalVisible}
        onClose={() => setDonateModalVisible(false)}
        title="Mark as Donated"
        message={`Are you sure you want to mark ${response?.responderName}'s response as donated? This will add this donation to their donation history.`}
        icon="heart"
        iconColor="#38A169"
        confirmText="Mark as Donated"
        cancelText="Cancel"
        onConfirm={confirmMarkAsDonated}
        onCancel={() => setDonateModalVisible(false)}
        type="success"
        theme={currentTheme}
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
  detailsCard: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

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
