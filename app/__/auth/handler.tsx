import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getRedirectResult } from 'firebase/auth';
import { auth } from '../../../firebase/firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';

export default function AuthHandler() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const processRedirect = async () => {
      try {
        console.log('Processing auth redirect in handler...');
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Redirect result processed in handler:', result.user.uid);
          Alert.alert('Success', 'Google sign-in complete! Loading app...', [
            { text: 'OK', onPress: () => router.replace('/(app)/(tabs)') }
          ]);
        } else {
          console.log('No redirect result in handler - redirecting to login');
          Alert.alert('Auth Failed', 'No Google response found. Please try sign-in again.', [
            { text: 'OK', onPress: () => router.replace('/(auth)/login') }
          ]);
        }
      } catch (error: any) {
        console.error('Error processing redirect in handler:', error);
        Alert.alert('Error', `Auth error: ${error.message}`, [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') }
        ]);
      }
    };

    processRedirect();
  }, []);

  return null; // No UI needed for handler
}
