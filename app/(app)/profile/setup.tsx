import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../../../firebase/firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors } from '../../../constants/Colors';
import { useFocusEffect } from '@react-navigation/native';

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
  'Sharqia': [
    'Zagazig', 'Bilbeis', 'Minya El Qamh', 'Abu Hammad', 'Abu Kabir', 'Faqous',
    'Mansoura', 'Talkha', 'Mitat Ghamr', 'Dekernes', 'Aga', 'El Kurdi',
    'Beni Ebeid', 'El Senbellawein'
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

export default function ProfileSetupScreen() {
  const [formData, setFormData] = useState({
    fullName: '',
    bloodType: '',
    governorate: '',
    city: '',
    profilePicture: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [bloodTypeModalVisible, setBloodTypeModalVisible] = useState(false);
  const [governorateModalVisible, setGovernorateModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);

  const { user, userProfile, refreshUserProfile } = useAuth();
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];
  const router = useRouter();

  useEffect(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || '',
        bloodType: userProfile.bloodType || '',
        governorate: userProfile.governorate || '',
        city: userProfile.city || '',
        profilePicture: userProfile.profilePicture || '',
      });
    } else if (user) {
      // For Google sign-in users without profile, pre-fill email and use Google profile picture
      setFormData({
        fullName: user.displayName || '',
        bloodType: '',
        governorate: '',
        city: '',
        profilePicture: user.photoURL || '', // Use Google profile picture if available
      });
    }
    setLoading(false);
  }, [userProfile, user]);

  // Fetch fresh data every time the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const fetchFreshProfileData = async () => {
        if (!user?.uid) return;

        try {
          setLoading(true);
          // Fetch fresh data from Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const freshProfileData = userDocSnap.data();
            setFormData({
              fullName: freshProfileData.fullName || '',
              bloodType: freshProfileData.bloodType || '',
              governorate: freshProfileData.governorate || '',
              city: freshProfileData.city || '',
              profilePicture: freshProfileData.profilePicture || '',
            });
          } else if (user) {
            // For Google sign-in users without profile, pre-fill email and use Google profile picture
            setFormData({
              fullName: user.displayName || '',
              bloodType: '',
              governorate: '',
              city: '',
              profilePicture: user.photoURL || '', // Use Google profile picture if available
            });
          }
        } catch (error) {
          console.error('Error fetching fresh profile data:', error);
          // Fallback to context data if direct fetch fails
          if (userProfile) {
            setFormData({
              fullName: userProfile.fullName || '',
              bloodType: userProfile.bloodType || '',
              governorate: userProfile.governorate || '',
              city: userProfile.city || '',
              profilePicture: userProfile.profilePicture || '',
            });
          }
        } finally {
          setLoading(false);
        }
      };

      fetchFreshProfileData();
    }, [user?.uid, userProfile])
  );

  const requestImagePermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to upload your profile picture!'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      // For web, use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event: any) => {
            const imageUri = event.target.result;
            setLocalImageUri(imageUri);
            await uploadImageToFirebase(imageUri);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      // For mobile, go directly to gallery
      const hasPermission = await requestImagePermissions();
      if (!hasPermission) return;
      await openGallery();
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
      await uploadImageToFirebase(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
      await uploadImageToFirebase(result.assets[0].uri);
    }
  };

  const uploadImageToFirebase = async (imageUri: string) => {
    if (!user) return;

    setUploadingImage(true);
    try {
      // Create a unique filename
      const filename = `profile_pictures/${user.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      // Convert image to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Delete old profile picture if exists
      if (formData.profilePicture) {
        try {
          const oldImageRef = ref(storage, formData.profilePicture);
          await deleteObject(oldImageRef);
        } catch (error) {
          console.log('Old image deletion failed (might not exist):', error);
        }
      }

      // Update form data
      setFormData(prev => ({ ...prev, profilePicture: downloadURL }));

      Alert.alert('Success', 'Profile picture uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
      setLocalImageUri(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfilePicture = async () => {
    if (Platform.OS === 'web') {
      // For web, remove directly without alert
      if (formData.profilePicture) {
        try {
          const imageRef = ref(storage, formData.profilePicture);
          await deleteObject(imageRef);
        } catch (error) {
          console.log('Image deletion failed:', error);
        }
      }
      setFormData(prev => ({ ...prev, profilePicture: '' }));
      setLocalImageUri(null);
    } else {
      // For mobile, use alert
      Alert.alert(
        'Remove Profile Picture',
        'Are you sure you want to remove your profile picture?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              if (formData.profilePicture) {
                try {
                  const imageRef = ref(storage, formData.profilePicture);
                  await deleteObject(imageRef);
                } catch (error) {
                  console.log('Image deletion failed:', error);
                }
              }
              setFormData(prev => ({ ...prev, profilePicture: '' }));
              setLocalImageUri(null);
            },
          },
        ]
      );
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.bloodType) newErrors.bloodType = "Blood type is required";
    if (!formData.governorate) newErrors.governorate = "Governorate is required";
    if (!formData.city) newErrors.city = "City is required";
    // Profile picture is now optional
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCompleteProfile = async () => {
    if (!validateForm()) return;
    if (!user) return;

    setSaving(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const profileData = {
        ...formData,
        email: user.email || '', // Include email from Firebase user
        profileComplete: true,
        createdAt: userProfile?.createdAt || new Date(),
        role: userProfile?.role || 'user',
      };

      console.log('=== COMPLETING PROFILE ===');
      console.log('User ID:', user.uid);
      console.log('Profile data to save:', profileData);

      await setDoc(userDocRef, profileData, { merge: true });
      console.log('Profile completed and saved to Firestore successfully');

      // Wait a moment for Firestore to update
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Waiting for Firestore update...');

      // Refresh the user profile in context
      await refreshUserProfile();
      console.log('Profile refreshed in context');

      console.log('Navigating to main app...');
      // Navigate to main app
      router.replace('/(app)/(tabs)');
    } catch (error) {
      console.error('Error completing profile:', error);
      Alert.alert('Error', 'Failed to complete your profile. Please try again.');
    } finally {
      setSaving(false);
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
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primaryText,
    },
    form: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',

    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primaryText,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.screenBackground,
    },
    inputError: {
      borderColor: colors.primary,
    },
    textInput: {
      flex: 1,
      paddingVertical: 16,
      paddingLeft: 12,
      fontSize: 16,
      color: colors.primaryText,
    },
    pickerContainer: {
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      backgroundColor: colors.screenBackground,
      justifyContent: 'center',
    },
    errorText: {
      color: colors.primary,
      fontSize: 12,
      marginTop: 4,
    },
    profilePictureSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    profilePictureContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    profilePicture: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profilePictureImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    profilePictureOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cameraButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.cardBackground,
    },
    removeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.screenBackground,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    removeButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 4,
    },
    uploadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
    },
    defaultAvatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
    },
    defaultAvatarText: {
      color: 'white',
      fontSize: 36,
      fontWeight: 'bold',
    },
  });

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.screenBackground }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={dynamicStyles.container}
      >
        <View style={dynamicStyles.header}>
          <TouchableOpacity
            onPress={() => {
              // For profile setup, redirect to main app instead of going back
              router.replace('/(app)/(tabs)');
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={dynamicStyles.title}>Complete Your Profile</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={dynamicStyles.form}>
            {/* Profile Picture Section */}
            <View style={dynamicStyles.profilePictureSection}>
              <View style={dynamicStyles.profilePictureContainer}>
                <TouchableOpacity
                  style={dynamicStyles.profilePicture}
                  onPress={pickImage}
                  disabled={uploadingImage}
                >
                  {localImageUri || (formData.profilePicture && formData.profilePicture.trim() !== '') ? (
                    <Image
                      source={{ uri: localImageUri || formData.profilePicture }}
                      style={dynamicStyles.profilePictureImage}
                    />
                  ) : (
                    <View style={[dynamicStyles.defaultAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={dynamicStyles.defaultAvatarText}>
                        {formData.fullName
                          ? formData.fullName
                              .split(' ')
                              .map(name => name.charAt(0).toUpperCase())
                              .slice(0, 2)
                              .join('')
                          : '?'}
                      </Text>
                    </View>
                  )}

                  {uploadingImage && (
                    <View style={dynamicStyles.uploadingOverlay}>
                      <ActivityIndicator size="large" color="white" />
                      <Text style={{ color: 'white', marginTop: 8, fontSize: 12 }}>
                        Uploading...
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {!uploadingImage && (
                  <TouchableOpacity style={dynamicStyles.cameraButton} onPress={pickImage}>
                    <Ionicons name="camera" size={18} color="white" />
                  </TouchableOpacity>
                )}
              </View>

              {(formData.profilePicture && formData.profilePicture.trim() !== '') && !uploadingImage && (
                <TouchableOpacity style={dynamicStyles.removeButton} onPress={removeProfilePicture}>
                  <Ionicons name="trash-outline" size={16} color={colors.primary} />
                  <Text style={dynamicStyles.removeButtonText}>Remove Picture</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={dynamicStyles.inputLabel}>Full Name <Text style={styles.required}>*</Text></Text>
              <View style={[dynamicStyles.inputContainer, errors.fullName && dynamicStyles.inputError]}>
                <Ionicons name="person-outline" size={20} color={colors.secondaryText} />
                <TextInput
                  style={dynamicStyles.textInput}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.secondaryText}
                  value={formData.fullName}
                  onChangeText={(value) => handleInputChange('fullName', value)}
                />
              </View>
              {errors.fullName && <Text style={dynamicStyles.errorText}>{errors.fullName}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={dynamicStyles.inputLabel}>Blood Type <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={[dynamicStyles.pickerContainer, errors.bloodType && dynamicStyles.inputError]}
                onPress={() => setBloodTypeModalVisible(true)}
              >
                <View style={styles.pickerContent}>
                  <Text style={[styles.pickerText, { color: formData.bloodType ? colors.primaryText : colors.secondaryText }]}>
                    {formData.bloodType || 'Select Blood Type...'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.secondaryText} />
                </View>
              </TouchableOpacity>
              {errors.bloodType && <Text style={dynamicStyles.errorText}>{errors.bloodType}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={dynamicStyles.inputLabel}>Governorate <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={[dynamicStyles.pickerContainer, errors.governorate && dynamicStyles.inputError]}
                onPress={() => setGovernorateModalVisible(true)}
              >
                <View style={styles.pickerContent}>
                  <Text style={[styles.pickerText, { color: formData.governorate ? colors.primaryText : colors.secondaryText }]}>
                    {formData.governorate || 'Select Governorate...'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.secondaryText} />
                </View>
              </TouchableOpacity>
              {errors.governorate && <Text style={dynamicStyles.errorText}>{errors.governorate}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={dynamicStyles.inputLabel}>City <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={[dynamicStyles.pickerContainer, errors.city && dynamicStyles.inputError]}
                onPress={() => setCityModalVisible(true)}
                disabled={!formData.governorate}
              >
                <View style={styles.pickerContent}>
                  <Text style={[styles.pickerText, { color: formData.city ? colors.primaryText : colors.secondaryText }]}>
                    {formData.city || (formData.governorate ? 'Select City...' : 'Select Governorate first')}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.secondaryText} />
                </View>
              </TouchableOpacity>
              {errors.city && <Text style={dynamicStyles.errorText}>{errors.city}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled, { backgroundColor: colors.primary }]}
              onPress={handleCompleteProfile}
              disabled={saving || uploadingImage}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Complete Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Blood Type Selection Modal */}
        <Modal
          visible={bloodTypeModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setBloodTypeModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Select Blood Type</Text>
                <TouchableOpacity onPress={() => setBloodTypeModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.primaryText} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={BLOOD_TYPES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      handleInputChange('bloodType', item);
                      setBloodTypeModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, { color: colors.primaryText }]}>{item}</Text>
                    {formData.bloodType === item && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Governorate Selection Modal */}
        <Modal
          visible={governorateModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setGovernorateModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Select Governorate</Text>
                <TouchableOpacity onPress={() => setGovernorateModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.primaryText} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={GOVERNORATES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      handleInputChange('governorate', item);
                      handleInputChange('city', ''); // Clear city when governorate changes
                      setGovernorateModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, { color: colors.primaryText }]}>{item}</Text>
                    {formData.governorate === item && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* City Selection Modal */}
        <Modal
          visible={cityModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setCityModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.primaryText }]}>
                  Select City in {formData.governorate}
                </Text>
                <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.primaryText} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={formData.governorate ? GOVERNORATE_CITIES[formData.governorate] || [] : []}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      handleInputChange('city', item);
                      setCityModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, { color: colors.primaryText }]}>{item}</Text>
                    {formData.city === item && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    width: 40,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  required: {
    color: '#E53E3E',
  },
  picker: {
    height: 58,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  pickerText: {
    fontSize: 16,
    flex: 1,
  },
  button: {
    backgroundColor: '#E53E3E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#FEE2E2'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
  },
});
