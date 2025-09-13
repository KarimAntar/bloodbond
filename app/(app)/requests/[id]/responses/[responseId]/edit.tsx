// app/requests/[id]/responses/[responseId]/edit.tsx
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../../../../../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../../../../../contexts/AuthContext';
import { useTheme } from '../../../../../../contexts/ThemeContext';
import { Colors } from '../../../../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function EditResponseScreen() {
  const { id, responseId } = useLocalSearchParams();
  const [formData, setFormData] = useState({
    message: '',
    contact: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];

  useEffect(() => {
    const fetchResponse = async () => {
      if (!responseId) return;

      try {
        const responseRef = doc(db, 'responses', responseId as string);
        const responseDoc = await getDoc(responseRef);

        if (responseDoc.exists()) {
          const responseData = responseDoc.data();

          // Check if user can edit this response
          const userRole = userProfile?.role?.toLowerCase();
          if (responseData.userId !== user?.uid && !['admin', 'moderator'].includes(userRole || '')) {
            Alert.alert('Access Denied', 'You can only edit your own responses.');
            router.back();
            return;
          }

          setCanEdit(true);

          setFormData({
            message: responseData.message || '',
            contact: responseData.contact || '',
          });
        } else {
          Alert.alert('Error', 'Response not found');
          router.back();
        }
      } catch (error) {
        console.error('Error fetching response:', error);
        Alert.alert('Error', 'Failed to load response details');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchResponse();
  }, [responseId, user?.uid, userProfile?.role]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }

    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact information is required';
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

  const handleSave = async () => {
    if (!validateForm()) return;

    if (!user?.uid || !responseId) {
      Alert.alert('Error', 'Unable to save changes');
      return;
    }

    setSaving(true);

    try {
      const responseRef = doc(db, 'responses', responseId as string);

      const updateData = {
        message: formData.message.trim(),
        contact: formData.contact.trim(),
        updatedAt: Timestamp.now(),
      };

      await updateDoc(responseRef, updateData);

      Alert.alert(
        'Success!',
        'Your response has been updated successfully.',
        [
          {
            text: 'View Response',
            onPress: () => router.replace(`/requests/${id}/responses/${responseId}`),
          },
          {
            text: 'OK',
            onPress: () => router.back(),
            style: 'default',
          },
        ]
      );
    } catch (error) {
      console.error('Error updating response:', error);
      Alert.alert(
        'Error',
        'Failed to update your response. Please check your internet connection and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this response? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const responseRef = doc(db, 'responses', responseId as string);
              await deleteDoc(responseRef);
              Alert.alert(
                'Success',
                'Response deleted successfully.',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error) {
              console.error('Error deleting response:', error);
              Alert.alert('Error', 'Failed to delete response. Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E53E3E" />
          <Text style={styles.loadingText}>Loading response details...</Text>
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
        <LinearGradient
          colors={['#E53E3E', '#C53030']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Response</Text>
          <View style={styles.headerRight} />
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Ionicons name="create" size={32} color="#E53E3E" />
            </View>
            <Text style={styles.heroTitle}>Edit Your Response</Text>
            <Text style={styles.heroSubtitle}>
              Update your message and contact information
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Message */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Message <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.textAreaContainer, errors.message && styles.inputError]}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Explain how you can help with this blood donation request..."
                  placeholderTextColor="#999"
                  value={formData.message}
                  onChangeText={(value) => handleInputChange('message', value)}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={!saving}
                />
              </View>
              {errors.message && (
                <Text style={styles.errorText}>{errors.message}</Text>
              )}
            </View>

            {/* Contact Information */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Contact Information <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputContainer, errors.contact && styles.inputError]}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Phone number or other contact details"
                  placeholderTextColor="#999"
                  value={formData.contact}
                  onChangeText={(value) => handleInputChange('contact', value)}
                  editable={!saving}
                />
              </View>
              {errors.contact && (
                <Text style={styles.errorText}>{errors.contact}</Text>
              )}
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#3182CE" />
              <Text style={styles.infoText}>
                Your changes will be visible to the person who created the blood request immediately.
                Please ensure your contact information is accurate.
              </Text>
            </View>

            {/* Save Button */}
            <LinearGradient
              colors={['#E53E3E', '#C53030']}
              style={[styles.submitButton, saving && styles.buttonDisabled]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <TouchableOpacity
                style={styles.submitButtonInner}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="save" size={20} color="white" />
                    <Text style={styles.submitButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {canEdit && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={saving}
              >
                <Text style={styles.deleteButtonText}>Delete Response</Text>
              </TouchableOpacity>
            )}
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
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#FEE2E2',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',

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
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 120,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#2D3748',
    marginLeft: 12,
    lineHeight: 20,
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  submitButtonInner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
  errorText: {
    color: '#E53E3E',
    fontSize: 12,
    marginTop: 4,
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
  deleteButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E53E3E',
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#E53E3E',
    fontSize: 16,
    fontWeight: '600',
  },
});
