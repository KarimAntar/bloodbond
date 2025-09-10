// app/requests/create.tsx
import React, { useState } from 'react';
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
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../../firebase/firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const CITIES = [
  'Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said', 'Suez',
  'Luxor', 'Aswan', 'Asyut', 'Ismailia', 'Faiyum', 'Zagazig', 'Ashmoun',
  'Minya', 'Damanhur', 'Beni Suef', 'Hurghada', 'Qena', 'Sohag', 'Shibin El Kom'
];

const BloodTypeSelector: React.FC<{
  selectedType: string;
  onSelect: (type: string) => void;
}> = ({ selectedType, onSelect }) => (
  <View style={styles.bloodTypeGrid}>
    {BLOOD_TYPES.map((type) => (
      <TouchableOpacity
        key={type}
        style={[
          styles.bloodTypeChip,
          selectedType === type && styles.bloodTypeChipSelected,
        ]}
        onPress={() => onSelect(type)}
      >
        <Text
          style={[
            styles.bloodTypeChipText,
            selectedType === type && styles.bloodTypeChipTextSelected,
          ]}
        >
          {type}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const CityDropdown: React.FC<{
  selectedCity: string;
  onSelect: (city: string) => void;
  error?: boolean;
}> = ({ selectedCity, onSelect, error }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (city: string) => {
    onSelect(city);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.dropdownContainer, error && styles.inputError]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="location-outline" size={20} color="#666" />
        <Text style={[styles.dropdownText, !selectedCity && styles.placeholderText]}>
          {selectedCity || 'Select city'}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CITIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.cityItem,
                    selectedCity === item && styles.cityItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[
                      styles.cityItemText,
                      selectedCity === item && styles.cityItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {selectedCity === item && (
                    <Ionicons name="checkmark" size={20} color="#E53E3E" />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

export default function CreateRequestScreen() {
  const [formData, setFormData] = useState({
    fullName: '',
    bloodType: '',
    city: '',
    hospital: '',
    contactNumber: '',
    notes: '',
    urgent: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const router = useRouter();
  const { user, userProfile } = useAuth();

  React.useEffect(() => {
    // Pre-fill with user profile data
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        fullName: userProfile.fullName || '',
        city: userProfile.city || '',
      }));
    }
  }, [userProfile]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Patient name is required';
    }

    if (!formData.bloodType) {
      newErrors.bloodType = 'Blood type is required';
    }

    if (!formData.city) {
      newErrors.city = 'City is required';
    }

    if (!formData.hospital.trim()) {
      newErrors.hospital = 'Hospital name is required';
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (!/^\d{10,15}$/.test(formData.contactNumber.replace(/\s/g, ''))) {
      newErrors.contactNumber = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const requestData = {
        userId: user?.uid,
        fullName: formData.fullName.trim(),
        bloodType: formData.bloodType,
        city: formData.city,
        hospital: formData.hospital.trim(),
        contactNumber: formData.contactNumber.trim(),
        notes: formData.notes.trim(),
        urgent: formData.urgent,
        createdAt: Timestamp.now(),
        status: 'active',
      };

      const docRef = await addDoc(collection(db, 'requests'), requestData);

      await addDoc(collection(db, 'activity'), {
        userId: user?.uid,
        type: 'request_created',
        title: 'Blood Request Created',
        description: `You created a request for ${formData.bloodType} blood.`,
        timestamp: Timestamp.now(),
        relatedId: docRef.id, // Link to the request document
      });

      Alert.alert(
        'Request Created Successfully! 🩸',
        'Your blood request has been posted. Donors in your area will be able to see and respond to your request.',
        [
          {
            text: 'View Requests',
            onPress: () => router.replace('/requests'),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating request:', error);
      Alert.alert(
        'Error',
        'Failed to create your request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.headerTitle}>Create Request</Text>
          <View style={styles.headerRight} />
        </LinearGradient>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Ionicons name="heart" size={32} color="#E53E3E" />
            </View>
            <Text style={styles.heroTitle}>Request Blood Donation</Text>
            <Text style={styles.heroSubtitle}>
              Fill in the details to connect with potential donors in your area
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Patient Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Patient Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputContainer, errors.fullName && styles.inputError]}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter patient's full name"
                  placeholderTextColor="#999"
                  value={formData.fullName}
                  onChangeText={(value) => handleInputChange('fullName', value)}
                  editable={!loading}
                />
              </View>
              {errors.fullName && (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              )}
            </View>

            {/* Blood Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Blood Type Needed <Text style={styles.required}>*</Text>
              </Text>
              <BloodTypeSelector
                selectedType={formData.bloodType}
                onSelect={(type) => handleInputChange('bloodType', type)}
              />
              {errors.bloodType && (
                <Text style={styles.errorText}>{errors.bloodType}</Text>
              )}
            </View>

            {/* City */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                City <Text style={styles.required}>*</Text>
              </Text>
              <CityDropdown
                selectedCity={formData.city}
                onSelect={(city) => handleInputChange('city', city)}
                error={!!errors.city}
              />
              {errors.city && (
                <Text style={styles.errorText}>{errors.city}</Text>
              )}
            </View>

            {/* Hospital */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Hospital/Medical Center <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputContainer, errors.hospital && styles.inputError]}>
                <Ionicons name="medical-outline" size={20} color="#666" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter hospital or medical center name"
                  placeholderTextColor="#999"
                  value={formData.hospital}
                  onChangeText={(value) => handleInputChange('hospital', value)}
                  editable={!loading}
                />
              </View>
              {errors.hospital && (
                <Text style={styles.errorText}>{errors.hospital}</Text>
              )}
            </View>

            {/* Drop-off Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Drop-off Location (Optional)</Text>
              <Text style={styles.helperText}>
                Specify where donors should deliver the blood
              </Text>
              <View style={styles.locationContainer}>
                <TouchableOpacity style={styles.locationButton}>
                  <Ionicons name="location-outline" size={20} color="#E53E3E" />
                  <Text style={styles.locationButtonText}>Use Current Location</Text>
                </TouchableOpacity>
                <Text style={styles.orText}>or</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="map-outline" size={20} color="#666" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter drop-off address"
                    placeholderTextColor="#999"
                    editable={!loading}
                  />
                </View>
              </View>
            </View>

            {/* Contact Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Contact Number <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputContainer, errors.contactNumber && styles.inputError]}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter contact phone number"
                  placeholderTextColor="#999"
                  value={formData.contactNumber}
                  onChangeText={(value) => handleInputChange('contactNumber', value)}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
              {errors.contactNumber && (
                <Text style={styles.errorText}>{errors.contactNumber}</Text>
              )}
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Additional Notes</Text>
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Any additional information (medical condition, urgency details, etc.)"
                  placeholderTextColor="#999"
                  value={formData.notes}
                  onChangeText={(value) => handleInputChange('notes', value)}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Urgent Toggle */}
            <View style={styles.urgentContainer}>
              <View style={styles.urgentLeft}>
                <Ionicons name="warning" size={20} color="#F56500" />
                <View style={styles.urgentTextContainer}>
                  <Text style={styles.urgentTitle}>Mark as Urgent</Text>
                  <Text style={styles.urgentSubtitle}>
                    This will prioritize your request for immediate attention
                  </Text>
                </View>
              </View>
              <Switch
                value={formData.urgent}
                onValueChange={(value) => handleInputChange('urgent', value)}
                trackColor={{ false: '#e1e5e9', true: '#F56500' }}
                thumbColor={formData.urgent ? '#fff' : '#f4f3f4'}
                disabled={loading}
              />
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#3182CE" />
              <Text style={styles.infoText}>
                Your request will be visible to verified donors in your area. 
                Please ensure all information is accurate for effective communication.
              </Text>
            </View>

            {/* Submit Button */}
            <LinearGradient
              colors={['#E53E3E', '#C53030']}
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <TouchableOpacity
                style={styles.submitButtonInner}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="heart" size={20} color="white" />
                    <Text style={styles.submitButtonText}>Post Blood Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={loading}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  pickerContainer: {
    paddingHorizontal: 8,
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
  picker: {
    flex: 1,
    marginLeft: 8,
  },
  bloodTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  bloodTypeChip: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  bloodTypeChipSelected: {
    backgroundColor: '#E53E3E',
    borderColor: '#E53E3E',
  },
  bloodTypeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  bloodTypeChipTextSelected: {
    color: 'white',
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
    minHeight: 100,
  },
  urgentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  urgentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  urgentTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  urgentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  urgentSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'space-between',
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
  },
  placeholderText: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cityItemSelected: {
    backgroundColor: '#FEE2E2',
  },
  cityItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  cityItemTextSelected: {
    color: '#E53E3E',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  locationContainer: {
    gap: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#3182CE',
    borderRadius: 12,
    padding: 16,
  },
  locationButtonText: {
    color: '#3182CE',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
