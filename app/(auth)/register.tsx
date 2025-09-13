// app/(auth)/register.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../../firebase/firebaseConfig';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { doc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { Modal, TouchableWithoutFeedback } from 'react-native';

// --- (Toast component remains the same) ---

const Toast = ({ message, type, visible, onHide }: {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
  onHide: () => void;
}) => {
  React.useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  if (!visible) return null;

  const getToastStyle = () => {
    switch (type) {
      case 'success': return { backgroundColor: '#10B981', icon: 'checkmark-circle' };
      case 'error': return { backgroundColor: '#EF4444', icon: 'alert-circle' };
      case 'info': return { backgroundColor: '#3B82F6', icon: 'information-circle' };
      default: return { backgroundColor: '#6B7280', icon: 'information-circle' };
    }
  };

  const { backgroundColor, icon } = getToastStyle();

  return (
    <View style={[styles.toast, { backgroundColor }]}>
      <Ionicons name={icon as any} size={20} color="white" />
      <Text style={styles.toastText}>{message}</Text>
      <TouchableOpacity onPress={onHide}>
        <Ionicons name="close" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
};

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


export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    bloodType: '',
    governorate: '',
    city: '',
  });
  // ... (other state variables remain the same)
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [registrationStep, setRegistrationStep] = useState<'form' | 'verification' | 'complete'>('form');
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'info',
  });
  const [verificationTimer, setVerificationTimer] = useState(0);

  // Custom picker states
  const [showBloodTypePicker, setShowBloodTypePicker] = useState(false);
  const [showGovernoratePicker, setShowGovernoratePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);


  const router = useRouter();
  const { logout } = useAuth();
  
  // ... (showToast, hideToast, useEffect for timer remain the same)

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (verificationTimer > 0) {
      interval = setInterval(() => {
        setVerificationTimer(prev => prev - 1);
      }, 1000) as unknown as NodeJS.Timeout;
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [verificationTimer]);


  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.bloodType) newErrors.bloodType = "Blood type is required";
    if (!formData.governorate) newErrors.governorate = "Governorate is required";
    if (!formData.city) newErrors.city = "City is required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one letter and one number';
    }

    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      showToast('Please fix the errors above', 'error');
      return;
    }

    setLoading(true);
    showToast('Creating your account...', 'info');

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );
      const user = userCredential.user;

      // Check if this is the first user
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const isFirstUser = usersSnapshot.empty;
      const role = isFirstUser ? 'admin' : 'user';

      // Save user profile to Firestore with all details
      await setDoc(doc(db, 'users', user.uid), {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        bloodType: formData.bloodType,
        governorate: formData.governorate,
        city: formData.city,
        profileComplete: true, // Profile is now complete on registration
        role: role,
        createdAt: serverTimestamp(),
      });

      await sendEmailVerification(user);
      await logout();

      setRegistrationStep('verification');
      setVerificationTimer(60);
      showToast('Account created! Please check your email to verify.', 'success');

      // Clear form data for security
      setFormData({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        bloodType: '',
        governorate: '',
        city: '',
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      let message = 'Registration failed. Please try again.';

      if (error.code === 'auth/email-already-in-use') {
          message = 'This email is already registered. Try signing in instead.';
      }

      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ... (handleResendVerification and handleGoToLogin logic remains the same)
  // ... (Verification step JSX remains the same)
  const handleResendVerification = async () => {
    if (verificationTimer > 0) return;
    
    setLoading(true);
    showToast('Sending verification email...', 'info');
    
    try {
      // Try to sign in temporarily to resend verification
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      await sendEmailVerification(userCredential.user);
      await logout();
      
      setVerificationTimer(60);
      showToast('Verification email sent! Please check your inbox.', 'success');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        // Email is already in use, which means account exists
        showToast('Account already exists. Please sign in to resend verification.', 'info');
        router.push('/(auth)/login');
      } else {
        showToast('Failed to resend verification email. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/(auth)/login');
  };

  // Verification Success View
  if (registrationStep === 'verification') {
    return (
      <SafeAreaView style={styles.container}>
        <Toast {...toast} onHide={hideToast} />
        <View style={styles.verificationContainer}>
          <View style={styles.verificationHeader}>
            <View style={styles.successIcon}>
              <Ionicons name="mail" size={40} color="#3B82F6" />
            </View>
            <Text style={styles.verificationTitle}>Check Your Email</Text>
            <Text style={styles.verificationSubtitle}>
              We've sent a verification link to:
            </Text>
            <Text style={styles.emailText}>{formData.email}</Text>
          </View>

          <View style={styles.verificationContent}>
            <View style={styles.instructionBox}>
              <Text style={styles.instructionTitle}>What's next?</Text>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>Check your email inbox (and spam folder)</Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Click the verification link in the email</Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Return here and sign in to your account</Text>
              </View>
            </View>

            <View style={styles.verificationActions}>
              <TouchableOpacity
                style={[styles.resendButton, (loading || verificationTimer > 0) && styles.buttonDisabled]}
                onPress={handleResendVerification}
                disabled={loading || verificationTimer > 0}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Text style={styles.resendButtonText}>
                    {verificationTimer > 0 
                      ? `Resend in ${verificationTimer}s` 
                      : 'Resend Verification Email'
                    }
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.loginButton} onPress={handleGoToLogin}>
                <Text style={styles.loginButtonText}>Go to Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <Toast {...toast} onHide={hideToast} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
             <LinearGradient colors={['#E53E3E', '#C53030']} style={styles.logoContainer}>
              <Ionicons name="heart" size={32} color="white" />
            </LinearGradient>
            <Text style={styles.title}>Join BloodBond</Text>
            <Text style={styles.subtitle}>Create your account to start saving lives</Text>
          </View>

          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={[styles.inputContainer, errors.fullName && styles.inputError]}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your full name"
                  placeholderTextColor="#666"
                  value={formData.fullName}
                  onChangeText={(v) => handleInputChange('fullName', v)}
                  editable={!loading}
                  autoComplete="name"
                />
              </View>
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>

            {/* Blood Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Blood Type</Text>
              <TouchableOpacity
                style={[styles.dropdownContainer, errors.bloodType && styles.inputError]}
                onPress={() => setShowBloodTypePicker(true)}
                disabled={loading}
              >
                <Text style={[styles.dropdownText, !formData.bloodType && styles.placeholderText]}>
                  {formData.bloodType || 'Select your blood type...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {errors.bloodType && <Text style={styles.errorText}>{errors.bloodType}</Text>}
            </View>

            {/* Governorate */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Governorate</Text>
              <TouchableOpacity
                style={[styles.dropdownContainer, errors.governorate && styles.inputError]}
                onPress={() => setShowGovernoratePicker(true)}
                disabled={loading}
              >
                <Text style={[styles.dropdownText, !formData.governorate && styles.placeholderText]}>
                  {formData.governorate || 'Select your governorate...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {errors.governorate && <Text style={styles.errorText}>{errors.governorate}</Text>}
            </View>

            {/* City */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>City</Text>
              <TouchableOpacity
                style={[styles.dropdownContainer, errors.city && styles.inputError]}
                onPress={() => setShowCityPicker(true)}
                disabled={loading || !formData.governorate}
              >
                <Text style={[styles.dropdownText, !formData.city && styles.placeholderText]}>
                  {formData.city || (formData.governorate ? 'Select your city...' : 'Select governorate first')}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            </View>
            
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email"
                  placeholderTextColor="#666"
                  value={formData.email}
                  onChangeText={(v) => handleInputChange('email', v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                  autoComplete="email"
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>
            
            {/* Password Fields */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Create a strong password (8+ chars, letters & numbers)"
                  placeholderTextColor="#666"
                  value={formData.password}
                  onChangeText={(v) => handleInputChange('password', v)}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  autoComplete="new-password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#666" />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Confirm your password"
                  placeholderTextColor="#666"
                  value={formData.confirmPassword}
                  onChangeText={(v) => handleInputChange('confirmPassword', v)}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                  autoComplete="new-password"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                  <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#666" />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>
            
            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.buttonDisabled]} 
              onPress={handleRegister} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color="white" />
                  <Text style={styles.registerButtonText}>Create Account</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} disabled={loading}>
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Blood Type Picker Modal */}
          <Modal
            visible={showBloodTypePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowBloodTypePicker(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowBloodTypePicker(false)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Blood Type</Text>
                    <ScrollView style={styles.pickerScrollView}>
                      {BLOOD_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={styles.pickerOption}
                          onPress={() => {
                            handleInputChange('bloodType', type);
                            setShowBloodTypePicker(false);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{type}</Text>
                          {formData.bloodType === type && (
                            <Ionicons name="checkmark" size={20} color="#E53E3E" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setShowBloodTypePicker(false)}
                    >
                      <Text style={styles.modalCloseButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Governorate Picker Modal */}
          <Modal
            visible={showGovernoratePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowGovernoratePicker(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowGovernoratePicker(false)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Governorate</Text>
                    <ScrollView style={styles.pickerScrollView}>
                      {GOVERNORATES.map((governorate) => (
                        <TouchableOpacity
                          key={governorate}
                          style={styles.pickerOption}
                          onPress={() => {
                            handleInputChange('governorate', governorate);
                            handleInputChange('city', ''); // Clear city when governorate changes
                            setShowGovernoratePicker(false);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{governorate}</Text>
                          {formData.governorate === governorate && (
                            <Ionicons name="checkmark" size={20} color="#E53E3E" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setShowGovernoratePicker(false)}
                    >
                      <Text style={styles.modalCloseButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* City Picker Modal */}
          <Modal
            visible={showCityPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowCityPicker(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowCityPicker(false)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>
                      Select City in {formData.governorate}
                    </Text>
                    <ScrollView style={styles.pickerScrollView}>
                      {formData.governorate ? GOVERNORATE_CITIES[formData.governorate]?.map((city: string) => (
                        <TouchableOpacity
                          key={city}
                          style={styles.pickerOption}
                          onPress={() => {
                            handleInputChange('city', city);
                            setShowCityPicker(false);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{city}</Text>
                          {formData.city === city && (
                            <Ionicons name="checkmark" size={20} color="#E53E3E" />
                          )}
                        </TouchableOpacity>
                      )) : null}
                    </ScrollView>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setShowCityPicker(false)}
                    >
                      <Text style={styles.modalCloseButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... (Existing styles plus new picker styles)
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  keyboardView: { 
    flex: 1 
  },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 24 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 40 
  },
  logoContainer: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#1a1a1a' 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#666', 
    marginTop: 8, 
    textAlign: 'center' 
  },
  form: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 24, 
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
},
  inputGroup: { 
    marginBottom: 20 
  },
  inputLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#1a1a1a', 
    marginBottom: 8 
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#e1e5e9', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    backgroundColor: '#f8f9fa' 
  },
  pickerContainer: {
    borderColor: '#e1e5e9',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picker: {
    height: 58,
    color: '#1a1a1a',
    fontSize: 16,
  },
  pickerItem: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  inputError: { 
    borderColor: '#E53E3E' 
  },
  textInput: { 
    flex: 1, 
    paddingVertical: 16, 
    paddingLeft: 12, 
    fontSize: 16, 
    color: '#1a1a1a' 
  },
  eyeButton: { 
    padding: 4 
  },
  errorText: { 
    color: '#E53E3E', 
    fontSize: 12, 
    marginTop: 4 
  },
  registerButton: { 
    backgroundColor: '#E53E3E', 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: { 
    opacity: 0.6 
  },
  registerButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 32 
  },
  footerText: { 
    fontSize: 14, 
    color: '#666' 
  },
  signInText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#E53E3E', 
    marginLeft: 4 
  },

  // --- Verification and Toast Styles (no changes needed) ---
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    zIndex: 1000,
    boxShadow: '0px 4px 12px rgba(0,0,0,0.12)',

  },
  toastText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  verificationContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  verificationHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#DBEAFE',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  verificationTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  verificationSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
  },
  verificationContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',

  },
  instructionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    backgroundColor: '#3B82F6',
    color: 'white',
    textAlign: 'center',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  verificationActions: {
    gap: 12,
  },
  resendButton: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#E53E3E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerScrollView: {
    maxHeight: 300,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  placeholderText: {
    color: '#666',
  },
});
