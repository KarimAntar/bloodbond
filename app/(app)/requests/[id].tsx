// app/requests/[id].tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Share,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../../firebase/firebaseConfig';
import { doc, getDoc, collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors } from '../../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentLocation } from '../../../utils/locationServices';

interface BloodRequest {
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
  // Optional fields saved when the requester used "Use Current Location"
  dropOffAddress?: string;
  location?: { latitude: number; longitude: number } | null;
}

interface Response {
  id: string;
  userId: string;
  responderName: string;
  message: string;
  contact: string;
  createdAt: any;
}

const ActionButton: React.FC<{
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  color: string;
  variant?: 'primary' | 'secondary';
}> = ({ icon, title, subtitle, onPress, color, variant = 'primary' }) => (
  <TouchableOpacity
    style={[
      styles.actionButton,
      variant === 'primary' ? { backgroundColor: color } : { backgroundColor: color + '20', borderWidth: 2, borderColor: color }
    ]}
    onPress={onPress}
  >
    <Ionicons 
      name={icon as any} 
      size={24} 
      color={variant === 'primary' ? 'white' : color} 
    />
    <View style={styles.actionButtonText}>
      <Text style={[
        styles.actionButtonTitle,
        { color: variant === 'primary' ? 'white' : color }
      ]}>
        {title}
      </Text>
      <Text style={[
        styles.actionButtonSubtitle,
        { color: variant === 'primary' ? 'rgba(255,255,255,0.8)' : color + 'CC' }
      ]}>
        {subtitle}
      </Text>
    </View>
    <Ionicons 
      name="chevron-forward" 
      size={20} 
      color={variant === 'primary' ? 'white' : color} 
    />
  </TouchableOpacity>
);

const InfoCard: React.FC<{
  icon: string;
  title: string;
  value: string;
  color: string;
  colors: any;
}> = ({ icon, title, value, color, colors }) => (
  <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
    <View style={[styles.infoCardIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <View style={styles.infoCardContent}>
      <Text style={[styles.infoCardTitle, { color: colors.secondaryText }]}>{title}</Text>
      <Text style={[styles.infoCardValue, { color: colors.primaryText }]}>{value}</Text>
    </View>
  </View>
);

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams();
  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    const fetchRequestData = async () => {
      try {
        console.log('Fetching request with ID:', id);

        // Fetch request details
        const requestRef = doc(db, 'requests', id as string);
        const requestDoc = await getDoc(requestRef);

        console.log('Request doc exists:', requestDoc.exists());
        console.log('Request data:', requestDoc.data());

        if (requestDoc.exists()) {
          setRequest({ ...requestDoc.data(), id: requestDoc.id } as BloodRequest);
        } else {
          setError('Request not found');
          return;
        }

        // Fetch responses from the top-level responses collection
        const responsesQuery = query(
          collection(db, 'responses'),
          where('requestId', '==', id),
          orderBy('createdAt', 'desc')
        );
        const responsesSnapshot = await getDocs(responsesQuery);
        const responsesList = responsesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Response));

        console.log('Found responses:', responsesList.length);
        setResponses(responsesList);
      } catch (err) {
        console.error('Error fetching request:', err);
        setError('Failed to load request details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRequestData();
    }
  }, [id]);

  const handleRespond = () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please login to respond to blood requests.',
        [{ text: 'Login', onPress: () => router.push('/(auth)/login') }]
      );
      return;
    }
    router.push(`/requests/${id}/respond`);
  };

  const handleCall = () => {
    if (request?.contactNumber) {
      Linking.openURL(`tel:${request.contactNumber}`);
    }
  };

  const handleShare = async () => {
    if (!request) return;
    
    try {
      const message = `🩸 BLOOD DONATION NEEDED 🩸\n\nPatient: ${request.fullName}\nBlood Type: ${request.bloodType}\nLocation: ${request.city}\nHospital: ${request.hospital}\n${request.urgent ? '🚨 URGENT REQUEST' : ''}\n\nHelp save a life! Contact: ${request.contactNumber}`;
      
      await Share.share({
        message,
        title: 'Blood Donation Request - BloodBond',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleViewResponses = () => {
    router.push(`/requests/${id}/responses`);
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    
    const now = new Date();
    const requestTime = timestamp.toDate();
    const diffInHours = Math.floor((now.getTime() - requestTime.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.screenBackground }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading request details...</Text>
      </View>
    );
  }

  if (error || !request) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.danger} />
          <Text style={[styles.errorTitle, { color: colors.primaryText }]}>Request Not Found</Text>
          <Text style={[styles.errorText, { color: colors.secondaryText }]}>
            {error || 'The requested blood donation request could not be found.'}
          </Text>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.errorButtonText, { color: colors.primaryText }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isUrgent = request.urgent;
  const timeAgo = getTimeAgo(request.createdAt);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primaryText }]}>Request Details</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={colors.primaryText} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={isUrgent ? ['#F56500', '#DD6B20'] : ['#E53E3E', '#C53030']}
          style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Ionicons name="warning" size={16} color="#fff" />
                <Text style={styles.urgentText}>URGENT REQUEST</Text>
              </View>
            )}
            <View style={styles.bloodTypeContainer}>
              <Text style={styles.bloodTypeText}>{request.bloodType}</Text>
            </View>
            <Text style={styles.patientName}>{request.fullName}</Text>
            <Text style={styles.timeAgo}>{timeAgo}</Text>
          </View>
        </LinearGradient>

        {/* Request Info */}
        <View style={styles.infoSection}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Request Information</Text>
          <View style={styles.infoGrid}>
            <InfoCard
              icon="location"
              title="City"
              value={request.city}
              color="#3182CE"
              colors={colors}
            />
            <InfoCard
              icon="medical"
              title="Hospital"
              value={request.hospital}
              color="#E53E3E"
              colors={colors}
            />
            <InfoCard
              icon="call"
              title="Contact"
              value={request.contactNumber}
              color="#38A169"
              colors={colors}
            />
            <InfoCard
              icon="time"
              title="Posted"
              value={timeAgo}
              color="#F56500"
              colors={colors}
            />
          </View>
        </View>

        {/* Drop-off Location Preview */}
        {request.location && (
          <View style={styles.mapSection}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Drop-off Location</Text>
            <View style={[styles.mapCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text style={[styles.mapAddressText, { color: colors.primaryText }]}>
                {request.dropOffAddress || `${request.location.latitude.toFixed(6)}, ${request.location.longitude.toFixed(6)}`}
              </Text>

              {apiKey ? (
                <Image
                  source={{
                    uri: `https://maps.googleapis.com/maps/api/staticmap?center=${request.location.latitude},${request.location.longitude}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${request.location.latitude},${request.location.longitude}&key=${apiKey}`
                  }}
                  style={styles.detailMapImage}
                />
              ) : (
                <View style={styles.mapFallback}>
                  <Text style={{ color: colors.secondaryText }}>
                    Map preview unavailable. Open map to get directions.
                  </Text>
                </View>
              )}

              <View style={styles.mapActionsRow}>
                <TouchableOpacity
                  style={[styles.getDirectionsButton, { backgroundColor: colors.primary }]}
                onPress={async () => {
                    try {
                      const dest = `${request.location!.latitude},${request.location!.longitude}`;
                      const originLoc = await getCurrentLocation();
                      const origin = originLoc ? `${originLoc.latitude.toFixed(6)},${originLoc.longitude.toFixed(6)}` : '';
                      const url = origin
                        ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`
                        : `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
                      Linking.openURL(url).catch(err => console.error('Error opening directions:', err));
                    } catch (err) {
                      console.error('Error getting user location for directions:', err);
                      const dest = `${request.location!.latitude},${request.location!.longitude}`;
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
                      Linking.openURL(url).catch(e => console.error('Error opening directions:', e));
                    }
                  }}
                >
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.getDirectionsText}>Get Directions</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.openMapsButtonAlt, { borderColor: colors.border }]}
                  onPress={() => {
                    const q = `${request.location!.latitude},${request.location!.longitude}`;
                    const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
                    Linking.openURL(url).catch(err => console.error('Error opening map:', err));
                  }}
                >
                  <Ionicons name="map-outline" size={18} color={colors.primary} />
                  <Text style={[styles.openMapsButtonAltText, { color: colors.primary }]}>Open Map</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Notes */}
        {request.notes && (
          <View style={styles.notesSection}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Additional Notes</Text>
            <View style={[styles.notesCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="document-text" size={20} color={colors.secondaryText} />
              <Text style={[styles.notesText, { color: colors.primaryText }]}>{request.notes}</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Actions</Text>
          
          <ActionButton
            icon="hand-left"
            title="Respond to Request"
            subtitle="Offer to help with blood donation"
            onPress={handleRespond}
            color="#E53E3E"
            variant="primary"
          />
          
          <ActionButton
            icon="call"
            title="Call Directly"
            subtitle="Contact the requester immediately"
            onPress={handleCall}
            color="#38A169"
            variant="secondary"
          />
          
          <ActionButton
            icon="chatbubble-ellipses"
            title="View Responses"
            subtitle={`${responses.length} people have responded`}
            onPress={handleViewResponses}
            color="#3182CE"
            variant="secondary"
          />
        </View>

        {/* Recent Responses Preview */}
        {responses.length > 0 && (
          <View style={styles.responsesSection}>
            <View style={styles.responsesSectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Recent Responses</Text>
              <TouchableOpacity onPress={handleViewResponses}>
                <Text style={styles.viewAllText}>View All ({responses.length})</Text>
              </TouchableOpacity>
            </View>

            {responses.slice(0, 2).map((response) => (
              <TouchableOpacity
                key={response.id}
                style={[styles.responsePreview, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => router.push(`/requests/${id}/responses/${response.id}`)}
              >
                <View style={styles.responseAvatar}>
                  <Text style={styles.responseAvatarText}>
                    {response.responderName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.responseContent}>
                  <Text style={[styles.responseName, { color: colors.primaryText }]}>{response.responderName}</Text>
                  <Text style={[styles.responseMessage, { color: colors.secondaryText }]} numberOfLines={2}>
                    {response.message}
                  </Text>
                  <Text style={[styles.responseTime, { color: colors.secondaryText }]}>
                    {getTimeAgo(response.createdAt)}
                  </Text>
                </View>
                <View style={styles.responseArrow}>
                  <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Safety Guidelines */}
        <View style={styles.safetySection}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Safety Guidelines</Text>
          <View style={styles.safetyCard}>
            <Ionicons name="shield-checkmark" size={24} color="#38A169" />
            <View style={styles.safetyContent}>
              <Text style={styles.safetyTitle}>Stay Safe</Text>
              <Text style={styles.safetyText}>
                • Always donate through verified medical facilities{'\n'}
                • Verify the authenticity of requests before responding{'\n'}
                • Never share personal financial information{'\n'}
                • Meet in public, safe locations when necessary
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorButton: {
    backgroundColor: '#E53E3E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  shareButton: {
    padding: 8,
  },
  heroSection: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  urgentText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  bloodTypeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bloodTypeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'left',
    marginBottom: 8,
    writingDirection: 'ltr',
  },

  timeAgo: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  infoSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'left',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

  },
  infoCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  notesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  notesCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

  },
  notesText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 24,
    marginLeft: 12,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  actionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

  },
  actionButtonText: {
    flex: 1,
    marginLeft: 16,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 14,
  },
  responsesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  responsesSectionHeader: {
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
  responsePreview: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 8,
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

  },
  responseAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E53E3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  responseAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  responseContent: {
    flex: 1,
  },
  responseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  responseMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  responseTime: {
    fontSize: 12,
    color: '#999',
  },
  responseArrow: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  safetySection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  safetyCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  safetyContent: {
    flex: 1,
    marginLeft: 12,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  safetyText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },

  /* Map preview styles */
  mapSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mapCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    width: '100%',
  },
  mapAddressText: {
    fontSize: 14,
    marginBottom: 8,
  },
  detailMapImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
  },
  mapFallback: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mapActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  getDirectionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  getDirectionsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  openMapsButtonAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
  openMapsButtonAltText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
