import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmationResult } from 'firebase/auth';

export const PhoneAuth: React.FC = () => {
  const { loginWithPhone, confirmPhoneCode, loading } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [step, setStep] = useState<'phone' | 'code'>('phone');

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    // Ensure phone number has country code
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+20${phoneNumber}`;

    try {
      const result = await loginWithPhone(formattedPhone);
      setConfirmationResult(result);
      setStep('code');
      Alert.alert('Success', 'Verification code sent to your phone');
    } catch (error: any) {
      console.error('Phone auth error:', error);
      Alert.alert('Error', error.message || 'Failed to send verification code');
    }
  };

  const handleConfirmCode = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    if (!confirmationResult) {
      Alert.alert('Error', 'No verification process found');
      return;
    }

    try {
      await confirmPhoneCode(confirmationResult, verificationCode);
      Alert.alert('Success', 'Phone number verified successfully!');
      // Reset form
      setPhoneNumber('');
      setVerificationCode('');
      setConfirmationResult(null);
      setStep('phone');
    } catch (error: any) {
      console.error('Code confirmation error:', error);
      Alert.alert('Error', error.message || 'Invalid verification code');
    }
  };

  const handleReset = () => {
    setPhoneNumber('');
    setVerificationCode('');
    setConfirmationResult(null);
    setStep('phone');
  };

  return (
    <View style={styles.container}>
      {/* reCAPTCHA container for web */}
      <div id="recaptcha-container"></div>

      {step === 'phone' ? (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Phone Authentication</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to receive a verification code
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Phone number (e.g., +201234567890)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Send Verification Code'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to {phoneNumber}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleReset}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleConfirmCode}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  stepContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
    flex: 1,
    marginRight: 10,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PhoneAuth;
