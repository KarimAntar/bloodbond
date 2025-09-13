// app/requests/[id]/edit.tsx
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
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../../../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentLocation, getAddressFromCoordinates, LocationData } from '../../../../utils/locationServices';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const GOVERNORATES = [
  'Cairo', 'Alexandria', 'Giza', 'Port Said', 'Suez', 'Luxor', 'Aswan',
  'Asyut', 'Ismailia', 'Faiyum', 'Zagazig', 'Damanhur', 'Beni Suef',
  'Hurghada', 'Qena', 'Sohag', 'Minya', 'Arish', 'Tanta', 'Mansoura',
  'Kafr El Sheikh', 'Damietta', 'Beheira', 'Matruh', 'New Valley',
  'Red Sea', 'South Sinai', 'North Sinai', 'Monufia', 'Gharbia', 'Sharqia',
  'Qalyubia', 'Dakahlia'
];

const GOVERNORATE_CITIES: { [key: string]: string[] } = {
  'Cairo': [
    'Cairo', 'Helwan', 'Maadi', 'Zamalek', 'Dokki', 'Mohandessin', 'Agouza',
    'Imbaba', 'Boulaq', 'Kasr El Nil', 'Downtown Cairo', 'Islamic Cairo',
    'Coptic Cairo', 'Garden City', 'New Cairo', 'Nasr City', 'Heliopolis',
    'Al Rehab', 'Sheikh Zayed', '6th of October', 'Obour', 'Badr City',
    '15th of May', 'Shorouk', '10th of Ramadan', 'Shubra El Kheima'
  ],
  'Alexandria': [
    'Alexandria', 'Montaza', 'Miami', 'Borg El Arab', 'North Coast', 'Abu Qir',
    'Dekheila', 'Amreya', 'Sidi Gaber', 'Smouha', 'Victoria', 'Raml Station',
    'Moharam Bek', 'Stanley', 'San Stefano', 'Rushdy', 'Louran', 'Glim',
    'Fleming', 'Sporting', 'Karmouz', 'Asafra', 'Mandara', 'El Max', 'El Soyof'
  ],
  'Giza': [
    'Giza', 'Dokki', 'Mohandessin', 'Agouza', 'Imbaba', 'Boulaq', 'Zamalek',
    'Maadi', 'Helwan', '6th of October', 'Sheikh Zayed', 'New Cairo', 'Nasr City',
    'Heliopolis', 'Al Rehab', 'Obour', 'Badr City', 'Shorouk', '10th of Ramadan'
  ],
  'Port Said': ['Port Said', 'Port Fuad'],
  'Suez': ['Suez', 'Ain Sokhna', 'Ras Sedr', 'Ataka', 'Fanara', 'Ras Gharib'],
  'Luxor': [
    'Luxor', 'Armant', 'Qena', 'Nag Hammadi', 'Dishna', 'Farshout', 'Qus',
    'Girga', 'Akhmim', 'Sohag', 'Tahta', 'Gerga', 'El Maragha', 'El Idwa',
    'El Balyana', 'El Fashn', 'Abu Tesht', 'El Badari', 'El Fakhaniya',
    'Beni Mazar', 'Deir Mawas', 'Samasta'
  ],
  'Aswan': [
    'Aswan', 'Kom Ombo', 'Edfu', 'Esna', 'Armant'
  ],
  'Asyut': [
    'Assiut', 'Dayrout', 'Manfalut', 'Abu Tig', 'El Ghanayem', 'Sahel Selim',
    'Bani Adi', 'El Badari', 'Sidfa', 'El Fakhaniya', 'Abnub', 'El Fath',
    'El Gamaliya', 'El Andalus', 'El Hamra', 'El Helal', 'El Mahager',
    'El Mansha', 'El Masara', 'El Qusiya', 'El Salam', 'El Sewak',
    'El Shohada', 'El Waqf', 'El Zawya', 'New Assiut'
  ],
  'Ismailia': [
    'Ismailia', 'Fayed', 'Qantara Sharq', 'Abu Suwir El Mahatta', 'Qantara Gharb'
  ],
  'Faiyum': [
    'Faiyum', 'Sennuris', 'Ibsheway', 'Itsa', 'Yousef El Seddik', 'Tamiya',
    'Al Wasta', 'New Faiyum'
  ],
  'Zagazig': [
    'Zagazig', 'Bilbeis', 'Minya El Qamh', 'Abu Hammad', 'Abu Kabir', 'Faqous'
  ],
  'Damanhur': [
    'Damanhur', 'Kafr El Dawwar', 'Rashid', 'Edku', 'Abu Hummus', 'Wadi El Natrun',
    'Kom Hamada', 'Badr'
  ],
  'Beni Suef': [
    'Beni Suef', 'El Wasta', 'Nasser', 'Ihnasya', 'Beba', 'Fashn', 'Somasta',
    'Al Wasta', 'New Beni Suef'
  ],
  'Hurghada': [
    'Hurghada', 'Safaga', 'El Quseir', 'Marsa Alam', 'El Gouna', 'Sahl Hasheesh'
  ],
  'Qena': ['Qena', 'Nag Hammadi', 'Dishna', 'Farshout', 'Qus'],
  'Sohag': [
    'Sohag', 'Girga', 'Akhmim', 'Tahta', 'Gerga', 'El Maragha', 'El Idwa',
    'El Balyana', 'El Fashn', 'Abu Tesht', 'El Badari', 'El Fakhaniya',
    'Beni Mazar', 'Deir Mawas', 'Samasta'
  ],
  'Minya': [
    'Minya', 'Maghagha', 'Bani Mazar', 'Samalut', 'Mallawi', 'Deir Mawas',
    'Abu Qurqas', 'El Idwa', 'New Minya'
  ],
  'Arish': ['Arish'],
  'Tanta': [
    'Tanta', 'Kafr El Zayat', 'Zefta', 'El Mahalla El Kubra', 'Samannud',
    'Biyala', 'Sers El Lyan', 'Zifta'
  ],
  'Mansoura': [
    'Mansoura', 'Talkha', 'Mitat Ghamr', 'Dekernes', 'Aga', 'El Kurdi',
    'Beni Ebeid', 'El Senbellawein'
  ],
  'Kafr El Sheikh': [
    'Kafr El Sheikh', 'Sidi Salem', 'El Hamoul', 'Baltim', 'Abu Hammad',
    'Mashtul El Sukhna', 'Hihya', 'Qutur'
  ],
  'Damietta': [
    'Damietta', 'New Damietta', 'Faraskur', 'Zarqa', 'Kafr Saad'
  ],
  'Beheira': [
    'Rosetta', 'Edku', 'Kafr El Dawwar', 'Abu Qir', 'El Alamein'
  ],
  'Matruh': [
    'Marsa Matruh', 'Siwa'
  ],
  'New Valley': [
    'Dakhla', 'Kharga', 'Baris', 'Farafra', 'Bahariya'
  ],
  'Red Sea': [
    'Hurghada', 'Safaga', 'El Quseir', 'Marsa Alam', 'Shalateen', 'Halaib'
  ],
  'South Sinai': [
    'Sharm El Sheikh', 'Dahab', 'Nuweiba', 'Taba'
  ],
  'North Sinai': [
    'Arish'
  ],
  'Monufia': [
    'Shibin El Kom', 'Mit Ghamr', 'Dikirnis', 'Samannud'
  ],
  'Gharbia': [
    'Tanta', 'Kafr El Zayat', 'Zefta', 'El Mahalla El Kubra', 'Samannud',
    'Biyala', 'Sers El Lyan', 'Zifta'
  ],
  'Qalyubia': [
    'Banha', 'Qalyub', 'Shubra El Kheima', 'Tukh', 'Qaha', 'Kafr Shukr',
    'El Khanka', 'Khusus', 'Obour', 'Badr City', '15th of May', 'Shorouk',
    '10th of Ramadan'
  ],
  'Dakahlia': [
    'Mansoura', 'Talkha', 'Mitat Ghamr', 'Dekernes', 'Aga', 'El Kurdi',
    'Beni Ebeid', 'El Senbellawein', 'Gamasa', 'El Mansoura El Gedida',
    'Shirbin', 'Belqas', 'Meet Salsil', 'El Mataria'
  ]
};

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

const GovernorateDropdown: React.FC<{
  selectedGovernorate: string;
  onSelect: (governorate: string) => void;
  error?: boolean;
}> = ({ selectedGovernorate, onSelect, error }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (governorate: string) => {
    onSelect(governorate);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.dropdownContainer, error && styles.inputError]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="location-outline" size={20} color="#666" />
        <Text style={[styles.dropdownText, !selectedGovernorate && styles.placeholderText]}>
          {selectedGovernorate || 'Select governorate'}
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
              <Text style={styles.modalTitle}>Select Governorate</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={GOVERNORATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.cityItem,
                    selectedGovernorate === item && styles.cityItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[
                      styles.cityItemText,
                      selectedGovernorate === item && styles.cityItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {selectedGovernorate === item && (
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

const CityDropdown: React.FC<{
  selectedCity: string;
  selectedGovernorate: string;
  onSelect: (city: string) => void;
  error?: boolean;
}> = ({ selectedCity, selectedGovernorate, onSelect, error }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (city: string) => {
    onSelect(city);
    setModalVisible(false);
  };

  const availableCities = selectedGovernorate ? GOVERNORATE_CITIES[selectedGovernorate] || [] : [];

  return (
    <>
      <TouchableOpacity
        style={[styles.dropdownContainer, error && styles.inputError]}
        onPress={() => setModalVisible(true)}
        disabled={!selectedGovernorate}
      >
        <Ionicons name="location-outline" size={20} color="#666" />
        <Text style={[styles.dropdownText, !selectedCity && styles.placeholderText]}>
          {selectedCity || (selectedGovernorate ? 'Select city' : 'Select governorate first')}
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
              <Text style={styles.modalTitle}>Select City in {selectedGovernorate}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableCities}
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

export default function EditRequestScreen() {
  const { id } = useLocalSearchParams();
  const [formData, setFormData] = useState({
    fullName: '',
    bloodType: '',
    governorate: '',
    city: '',
    hospital: '',
    contactNumber: '',
    notes: '',
    urgent: false,
    dropOffAddress: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const router = useRouter();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    const fetchRequest = async () => {
      if (!id) return;

      try {
        const requestRef = doc(db, 'requests', id as string);
        const requestDoc = await getDoc(requestRef);

        if (requestDoc.exists()) {
          const requestData = requestDoc.data();
          setFormData({
            fullName: requestData.fullName || '',
            bloodType: requestData.bloodType || '',
            governorate: requestData.governorate || '',
            city: requestData.city || '',
            hospital: requestData.hospital || '',
            contactNumber: requestData.contactNumber || '',
            notes: requestData.notes || '',
            urgent: requestData.urgent || false,
            dropOffAddress: requestData.dropOffAddress || '',
          });

          const isOwner = requestData.createdBy === user.uid;
          const userRole = userProfile?.role?.toLowerCase();
          const isAdminOrMod = userRole && ['admin', 'moderator'].includes(userRole);
          const canAccess = isOwner || isAdminOrMod;

          if (!canAccess) {
            Alert.alert('Access Denied', 'You do not have permission to edit this request.');
            router.back();
            return;
          }

          setCanEdit(true);

          if (requestData.location) {
            setCurrentLocation(requestData.location);
          }
        } else {
          Alert.alert('Error', 'Request not found');
          router.back();
        }
      } catch (error) {
        console.error('Error fetching request:', error);
        Alert.alert('Error', 'Failed to load request details');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

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

  const handleUseCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        const address = await getAddressFromCoordinates(location.latitude, location.longitude);
        if (address) {
          handleInputChange('dropOffAddress', address);
        }
        Alert.alert(
          'Location Found',
          `Current location has been set as the drop-off location.`,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Location Error',
          'Unable to get your current location. Please make sure location services are enabled and try again.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert(
        'Location Error',
        'Failed to get your current location. Please try again or enter the address manually.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    if (!user?.uid || !id) {
      Alert.alert('Error', 'Unable to save changes');
      return;
    }

    setSaving(true);

    try {
      const requestRef = doc(db, 'requests', id as string);

      const updateData = {
        fullName: formData.fullName.trim(),
        bloodType: formData.bloodType,
        governorate: formData.governorate,
        city: formData.city,
        hospital: formData.hospital.trim(),
        contactNumber: formData.contactNumber.trim(),
        notes: formData.notes.trim(),
        urgent: formData.urgent,
        dropOffAddress: formData.dropOffAddress.trim(),
        location: currentLocation,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(requestRef, updateData);

      Alert.alert(
        'Success!',
        'Your request has been updated successfully.',
        [
          {
            text: 'View Request',
            onPress: () => router.replace(`/requests/${id}`),
          },
          {
            text: 'OK',
            onPress: () => router.back(),
            style: 'default',
          },
        ]
      );
    } catch (error) {
      console.error('Error updating request:', error);
      Alert.alert(
        'Error',
        'Failed to update your request. Please check your internet connection and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const requestRef = doc(db, 'requests', id as string);
              await deleteDoc(requestRef);
              Alert.alert(
                'Success',
                'Request deleted successfully.',
                [{ text: 'OK', onPress: () => router.push('/(app)/profile/my-requests') }]
              );
            } catch (error) {
              console.error('Error deleting request:', error);
              Alert.alert('Error', 'Failed to delete request. Please try again.');
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
          <Text style={styles.loadingText}>Loading request details...</Text>
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
          <Text style={styles.headerTitle}>Edit Request</Text>
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
            <Text style={styles.heroTitle}>Edit Blood Request</Text>
            <Text style={styles.heroSubtitle}>
              Update your request details to help donors find you better
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
                  editable={!saving}
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

            {/* Governorate */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Governorate <Text style={styles.required}>*</Text>
              </Text>
              <GovernorateDropdown
                selectedGovernorate={formData.governorate}
                onSelect={(governorate) => {
                  handleInputChange('governorate', governorate);
                  handleInputChange('city', ''); // Clear city when governorate changes
                }}
                error={!!errors.governorate}
              />
              {errors.governorate && (
                <Text style={styles.errorText}>{errors.governorate}</Text>
              )}
            </View>

            {/* City */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                City <Text style={styles.required}>*</Text>
              </Text>
              <CityDropdown
                selectedCity={formData.city}
                selectedGovernorate={formData.governorate}
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
                  editable={!saving}
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
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={handleUseCurrentLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color="#3182CE" />
                  ) : (
                    <Ionicons name="location-outline" size={20} color="#3182CE" />
                  )}
                  <Text style={styles.locationButtonText}>
                    {locationLoading ? 'Getting Location...' : 'Use Current Location'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.orText}>or</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="map-outline" size={20} color="#666" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter drop-off address"
                    placeholderTextColor="#999"
                    value={formData.dropOffAddress}
                    onChangeText={(value) => handleInputChange('dropOffAddress', value)}
                    editable={!saving}
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
                  editable={!saving}
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
                  editable={!saving}
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
                disabled={saving}
              />
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#3182CE" />
              <Text style={styles.infoText}>
                Your changes will be visible to donors immediately.
                Please ensure all information is accurate.
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
                <Text style={styles.deleteButtonText}>Delete Request</Text>
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
