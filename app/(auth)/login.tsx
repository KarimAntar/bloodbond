// app/(auth)/login.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { sendEmailVerification, sendPasswordResetEmail, getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';

// ... (Toast component remains the same)
const Toast = ({ message, type, visible, onHide }: {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
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
      case 'warning': return { backgroundColor: '#F59E0B', icon: 'warning' };
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

export default function LoginScreen() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({}); 
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationTimer, setVerificationTimer] = useState(0);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning'}>({
    visible: false, message: '', type: 'info',
  });
  const router = useRouter();
  const { login, loginWithGoogle, loading, user } = useAuth();

  // Debug helper: on mobile web open the site with ?debugAuth=1 to show the final redirect URL,
  // referrer and user agent in a native alert so you can capture what the browser was sent back to.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('debugAuth=1')) {
      const href = window.location.href;
      const ref = (typeof document !== 'undefined' && document.referrer) ? document.referrer : '';
      const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
      console.log('DEBUG_AUTH', { href, ref, ua });
      Alert.alert('Debug Auth Info', `href:\n${href}\n\nreferrer:\n${ref}\n\nuserAgent:\n${ua}`, [{ text: 'OK' }]);
    }
  }, []);

  // If this page was opened by the external iOS-Safari fallback, or has a startGoogle flag,
  // automatically start the Google flow. This allows an external tab (opened from the PWA)
  // to initiate the OAuth redirect in Safari where the round-trip is preserved.
  useEffect(() => {
    const shouldStart = (() => {
      try {
        if (typeof window === 'undefined') return false;
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('startGoogle') === '1') return true;
        const flow = localStorage.getItem('bb_oauth_flow');
        if (flow === 'external') return true;
      } catch (e) {
        console.warn('Error checking startGoogle/localStorage flag', e);
      }
      return false;
    })();

    if (shouldStart) {
      (async () => {
        try {
          console.log('Auto-starting Google sign-in because startGoogle flag or external flow was detected');
          // Clear flag (best-effort)
          try { localStorage.removeItem('bb_oauth_flow'); } catch (e) {}
          await loginWithGoogle();
          console.log('loginWithGoogle returned (redirect flow started or popup result)');
        } catch (e) {
          console.error('Auto-start Google sign-in failed', e);
        }
      })();
    }
  }, []);
  
  // Handle Google redirect result on login page mount and watch for auth state changes
  useEffect(() => {
    let unsub: (() => void) | undefined;

    const processRedirect = async () => {
      try {
        console.log('Checking for Google redirect result on login page...');
        const result = await getRedirectResult(auth);
        const current = auth.currentUser;
        // If getRedirectResult is empty but auth.currentUser exists (race or redirect consumed elsewhere),
        // treat this as a successful sign-in and enter the app.
        if (result || current) {
          const uid = result?.user?.uid || current?.uid;
          console.log('Redirect result or existing user on login page:', uid);
          showToast('Google sign-in complete! Loading app...', 'success');
          router.replace('/(app)/(tabs)');
          return;
        }
        console.log('No redirect result on login page - normal load');
      } catch (error: any) {
        console.error('Error processing redirect on login page:', error);
        // If the error happened but we already have an authenticated user, continue into the app.
        if (auth.currentUser) {
          showToast('Google sign-in complete! Loading app...', 'success');
          router.replace('/(app)/(tabs)');
          return;
        } else {
          showToast(`Auth error: ${error.message}`, 'error');
        }
      }

      // Fallback: listen for auth state changes and redirect when a user appears.
      try {
        unsub = onAuthStateChanged(auth, (u) => {
          if (u) {
            console.log('onAuthStateChanged detected user on login page:', u.uid);
            showToast('Authentication detected — redirecting...', 'success');
            router.replace('/(app)/(tabs)');
          }
        });
      } catch (e) {
        console.warn('Failed to attach onAuthStateChanged fallback on login page', e);
      }
    };

    processRedirect();

    return () => {
      try {
        if (unsub) unsub();
      } catch (e) {}
    };
  }, []);
  // ... (showToast, hideToast, useEffect for timer, validateForm, handleInputChange remain the same)
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (verificationTimer > 0) {
      interval = setInterval(() => {
        setVerificationTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [verificationTimer]);

  useEffect(() => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      setNeedsVerification(true);
      setFormData(prev => ({...prev, email: auth.currentUser?.email || ''}));
    } else {
        setNeedsVerification(false);
    }
  }, [auth.currentUser]);


  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      showToast('Please fix the errors above', 'error');
      return;
    }

    showToast('Signing you in...', 'info');

    try {
      const user = await login(formData.email.trim(), formData.password);
      
      if (!user.emailVerified) {
        setNeedsVerification(true);
        setVerificationTimer(60);
        showToast('Please verify your email address to continue', 'warning');
        return; // Stop here, the verification UI will show.
      }

      // On successful and verified login, navigate to the app
      router.replace('/(app)/(tabs)');
      
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'An error occurred during login';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Incorrect email or password';
          break;
        // ... other error cases
      }
      showToast(message, 'error');
    }
  };

  // ... (handleResendVerification, handleCheckVerification, and JSX remain the same)
   const handleResendVerification = async () => {
    if (verificationTimer > 0 || !auth.currentUser) return;
    showToast('Sending verification email...', 'info');
    
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationTimer(60);
      showToast('Verification email sent! Please check your inbox', 'success');
    } catch (error: any) {
      console.error('Resend verification error:', error);
      let message = 'Failed to send verification email';
      if (error.code === 'auth/too-many-requests') {
        message = 'Too many requests. Please wait before trying again';
      }
      showToast(message, 'error');
    }
  };

  const handleCheckVerification = async () => {
    if (!auth.currentUser) return;
    showToast('Checking verification status...', 'info');

    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setNeedsVerification(false);
        showToast('Email verified! Redirecting...', 'success');
        router.replace('/(app)/(tabs)');
      } else {
        showToast('Email not verified yet. Please check your inbox', 'warning');
      }
    } catch (error) {
      showToast('Error checking verification status', 'error');
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      showToast('Please enter your email address first', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    showToast('Sending password reset email...', 'info');

    try {
      await sendPasswordResetEmail(auth, formData.email.trim());
      showToast('Password reset email sent! Please check your inbox', 'success');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      let message = 'Failed to send password reset email';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email address';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many requests. Please wait before trying again';
      }
      showToast(message, 'error');
    }
  };

  if (needsVerification) {
  return (
    <SafeAreaView style={styles.container}>
      <Toast {...toast} onHide={hideToast} />
        
        <View style={styles.verificationContainer}>
          <View style={styles.verificationHeader}>
            <View style={styles.warningIcon}>
              <Ionicons name="mail-unread" size={40} color="#F59E0B" />
            </View>
            <Text style={styles.verificationTitle}>Verify Your Email</Text>
            <Text style={styles.verificationSubtitle}>
              Please verify your email address to continue:
            </Text>
            <Text style={styles.emailText}>{formData.email}</Text>
          </View>

          <View style={styles.verificationContent}>
            <View style={styles.instructionBox}>
              <Text style={styles.instructionTitle}>Email not verified yet?</Text>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>Check your email inbox and spam folder</Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Click the verification link in the email</Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Come back here and check verification status</Text>
              </View>
            </View>

            <View style={styles.verificationActions}>
              <TouchableOpacity
                style={[styles.checkButton]}
                onPress={handleCheckVerification}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.checkButtonText}>I've Verified My Email</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resendButton, (loading || verificationTimer > 0) && styles.buttonDisabled]}
                onPress={handleResendVerification}
                disabled={loading || verificationTimer > 0}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : (
                  <Text style={styles.resendButtonText}>
                    {verificationTimer > 0 
                      ? `Resend in ${verificationTimer}s` 
                      : 'Resend Verification Email'
                    }
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => setNeedsVerification(false)}
              >
                <Text style={styles.backToLoginText}>Back to Sign In</Text>
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <LinearGradient
              colors={['#E53E3E', '#C53030']}
              style={styles.logoContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="heart" size={32} color="white" />
            </LinearGradient>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue helping save lives</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!loading}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: '#4285F4', marginTop: 12 }, loading && styles.buttonDisabled]}
              onPress={async () => {
                try {
                  showToast('Starting Google sign-in...', 'info');
                  await loginWithGoogle();
                  showToast('Redirecting to Google - please approve and return...', 'info');
                  // For redirect, don't navigate here - let the useEffect on mount handle the result
                } catch (error: any) {
                  console.error('Google sign-in error:', error);
                  let message = 'Google sign-in failed';
                  if (error.code === 'auth/popup-blocked') {
                    message = 'Popup was blocked. Please allow popups for this site.';
                  } else if (error.code === 'auth/popup-closed-by-user') {
                    message = 'Sign-in was cancelled.';
                  } else if (error.code === 'auth/cancelled-popup-request') {
                    message = 'Another sign-in is in progress.';
                  } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
                    message = 'Google sign-in is not supported in this environment. Please use email/password login.';
                  } else if (error.code === 'auth/redirect-cancelled-by-user') {
                    message = 'Sign-in was cancelled during redirect.';
                  }
                  showToast(message, 'error');
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="white" />
                  <Text style={[styles.loginButtonText, { marginRight: 0 }]}>
                    Sign in with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push('/forgot-password' as any)}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              disabled={loading}
            >
              <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ... (All styles remain the same)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Toast Styles
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
  
  // Verification Styles
  verificationContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  verificationHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  warningIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#FEF3C7',
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
    color: '#F59E0B',
    textAlign: 'center',
  },
  verificationContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',

  },
  instructionBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
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
    backgroundColor: '#F59E0B',
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
    color: '#92400E',
    lineHeight: 20,
  },
  verificationActions: {
    gap: 12,
  },
  checkButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  checkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resendButton: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginButton: {
    alignItems: 'center',
    padding: 12,
  },
  backToLoginText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Form Styles
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subtitle: {
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
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
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
  eyeButton: {
    padding: 4,
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 12,
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: '#E53E3E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotPasswordText: {
    color: '#E53E3E',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  signUpText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E53E3E',
    marginLeft: 4,
  },


});
