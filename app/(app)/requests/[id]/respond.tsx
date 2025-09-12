// app/requests/[id]/respond.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '../../../../firebase/firebaseConfig';
import { addDoc, collection, Timestamp, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { performAntiSpamVerification, initializeRecaptcha } from '../../../../utils/captcha';

interface BloodRequest {
  id: string;
  fullName: string;
  bloodType: string;
  city: string;
  hospital: string;
  urgent?: boolean;
}

export default function RespondScreen() {
  const { id: requestId } = useLocalSearchParams();
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [formData, setFormData] = useState({
    message: '',
    contactInfo: '',
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetchingRequest, setFetchingRequest] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const requestDoc = await getDoc(doc(db, 'requests', requestId as string));
        if (requestDoc.exists()) {
          setRequest({ id: requestDoc.id, ...requestDoc.data() } as BloodRequest);
        }
      } catch (error) {
        console.error('Error fetching request:', error);
      } finally {
        setFetchingRequest(false);
      }
    };

    // Pre-fill form with user data
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        name: userProfile.fullName || '',
        contactInfo: userProfile.phone || '',
      }));
    }

    // Initialize reCAPTCHA on web
    if (Platform.OS === 'web') {
      initializeRecaptcha().catch(console.error);
    }

    fetchRequest();
  }, [requestId, userProfile]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Your name is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Please provide a message';
    }

    if (!formData.contactInfo.trim()) {
      newErrors.contactInfo = 'Contact information is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to respond to requests');
      return;
    }

    setLoading(true);
    setVerificationLoading(true);

    try {
      // Perform anti-spam verification
      const verification = await performAntiSpamVerification(
        user.uid,
        'response',
        'respond_to_blood_request'
      );

      setVerificationLoading(false);

      if (!verification.success) {
        Alert.alert(
          'Response Blocked',
          verification.error || 'Unable to verify response. Please try again later.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }
      await addDoc(collection(db, 'responses'), {
        requestId: requestId,
        userId: user.uid,
        responderName: formData.name.trim(),
        message: formData.message.trim(),
        contact: formData.contactInfo.trim(),
        bloodType: userProfile?.bloodType || null,
        // Anti-spam verification data
        captchaToken: verification.captchaToken,
        verifiedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      });

      // Log this action to the user's activity feed
      await addDoc(collection(db, 'activity'), {
          userId: user.uid,
          type: 'response_sent',
          title: 'Response Sent',
          description: `You responded to a request for ${request?.bloodType || 'unknown'} blood.`,
          timestamp: Timestamp.now(),
          relatedId: requestId, // Link to the request document
      });

      // Show success message and navigate back
      Alert.alert(
        'Response Sent! 🩸',
        'Your response has been sent successfully. The requester will be able to see your offer to help.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting response:', error);
      
      // Handle specific spam/verification errors
      if (error instanceof Error && error.message.includes('spam')) {
        Alert.alert(
          'Response Blocked',
          'Your response has been blocked due to spam protection. Please try again later or contact support if you believe this is an error.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to submit your response. Please check your internet connection and try again.'
        );
      }
    } finally {
      setLoading(false);
      setVerificationLoading(false);
    }
  };

  if (fetchingRequest) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53E3E" />
        <Text style={styles.loadingText}>Loading request details...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#E53E3E" />
          <Text style={styles.errorTitle}>Request Not Found</Text>
          <TouchableOpacity 
            style={styles.errorButton} 
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Respond to Request</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Request Summary */}
          <LinearGradient
            colors={request.urgent ? ['#F56500', '#DD6B20'] : ['#E53E3E', '#C53030']}
            style={styles.requestSummary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {request.urgent && (
              <View style={styles.urgentBadge}>
                <Ionicons name="warning" size={14} color="#fff" />
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
            <View style={styles.bloodTypeContainer}>
              <Text style={styles.bloodTypeText}>{request.bloodType}</Text>
            </View>
            <Text style={styles.patientName}>{request.fullName}</Text>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.locationText}>{request.city}</Text>
            </View>
          </LinearGradient>

          {/* Response Form */}
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Your Response</Text>
            <Text style={styles.formSubtitle}>
              Help save a life by offering your support
            </Text>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Your Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputContainer, errors.name && styles.inputError]}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  editable={!loading}
                />
              </View>
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            {/* Message */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Your Message <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.textAreaContainer, errors.message && styles.inputError]}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Let them know how you can help, when you're available, or any relevant information..."
                  placeholderTextColor="#999"
                  value={formData.message}
                  onChangeText={(value) => handleInputChange('message', value)}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>
              {errors.message && (
                <Text style={styles.errorText}>{errors.message}</Text>
              )}
            </View>

            {/* Contact Info */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Contact Information <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputContainer, errors.contactInfo && styles.inputError]}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Phone number or email"
                  placeholderTextColor="#999"
                  value={formData.contactInfo}
                  onChangeText={(value) => handleInputChange('contactInfo', value)}
                  editable={!loading}
                />
              </View>
              {errors.contactInfo && (
                <Text style={styles.errorText}>{errors.contactInfo}</Text>
              )}
            </View>

            {/* Blood Type Info */}
            {userProfile?.bloodType && (
              <View style={styles.bloodTypeInfo}>
                <Ionicons name="information-circle" size={20} color="#3182CE" />
                <Text style={styles.bloodTypeInfoText}>
                  Your blood type ({userProfile.bloodType}) will be shared with the requester.
                </Text>
              </View>
            )}

            {/* Guidelines */}
            <View style={styles.guidelinesCard}>
              <View style={styles.guidelinesHeader}>
                <Ionicons name="shield-checkmark" size={20} color="#38A169" />
                <Text style={styles.guidelinesTitle}>Response Guidelines</Text>
              </View>
              <Text style={styles.guidelinesText}>
                • Be honest about your availability and blood type{'\n'}
                • Respond only if you're genuinely able to help{'\n'}
                • Follow up promptly with the requester{'\n'}
                • Donate only through verified medical facilities
              </Text>
            </View>

            {/* Security Notice */}
            <View style={styles.securityBox}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              <Text style={styles.securityText}>
                This form is protected by anti-spam verification to ensure genuine responses only.
              </Text>
            </View>

            {/* Verification Status */}
            {verificationLoading && (
              <View style={styles.verificationBox}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={styles.verificationText}>
                  Verifying response authenticity...
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (loading || verificationLoading) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading || verificationLoading}
            >
              {loading || verificationLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={20} color="white" />
                  <Text style={styles.submitButtonText}>Send Response</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={loading || verificationLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
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
  headerRight: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  requestSummary: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  urgentText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  bloodTypeContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bloodTypeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  formSection: {
    padding: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  required: {
    color: '#E53E3E',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#E53E3E',
  },
  textInput: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  textAreaContainer: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 100,
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 12,
    marginTop: 4,
  },
  bloodTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  bloodTypeInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#2D3748',
    marginLeft: 8,
  },
  guidelinesCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginLeft: 8,
  },
  guidelinesText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#E53E3E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 16,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  securityBox: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    color: '#065F46',
    marginLeft: 12,
    lineHeight: 20,
  },
  verificationBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  verificationText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 12,
    fontWeight: '500',
  },
});
