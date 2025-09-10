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
const CITIES = [
  'Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said', 'Suez',
  'Luxor', 'Aswan', 'Asyut', 'Ismailia', 'Faiyum', 'Zagazig', 'Ashmoun',
  'Minya', 'Damanhur', 'Beni Suef', 'Hurghada', 'Qena', 'Sohag', 'Shibin El Kom'
];


export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    bloodType: '', // Added field
    city: '',      // Added field
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
    let interval: NodeJS.Timeout;
    if (verificationTimer > 0) {
      interval = setInterval(() => {
        setVerificationTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [verificationTimer]);


  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.bloodType) newErrors.bloodType = "Blood type is required";
    if (!formData.city) newErrors.city = "City is required";
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
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
              <View style={[styles.pickerContainer, errors.bloodType && styles.inputError]}>
                <Picker
                    selectedValue={formData.bloodType}
                    style={styles.picker}
                    onValueChange={(itemValue) => handleInputChange('bloodType', itemValue)}
                >
                    <Picker.Item label="Select your blood type..." value="" />
                    {BLOOD_TYPES.map(type => <Picker.Item key={type} label={type} value={type} />)}
                </Picker>
              </View>
              {errors.bloodType && <Text style={styles.errorText}>{errors.bloodType}</Text>}
            </View>

            {/* City */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>City</Text>
              <View style={[styles.pickerContainer, errors.city && styles.inputError]}>
                <Picker
                    selectedValue={formData.city}
                    style={styles.picker}
                    onValueChange={(itemValue) => handleInputChange('city', itemValue)}
                >
                    <Picker.Item label="Select your city..." value="" />
                    {CITIES.map(city => <Picker.Item key={city} label={city} value={city} />)}
                </Picker>
              </View>
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
                  placeholder="Create a password (min 6 characters)" 
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
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 3 
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
  },
  picker: {
    height: 58,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
});
