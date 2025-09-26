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
        const current = auth.currentUser;
        // If we either got a redirect result OR there is already an authenticated user (onAuthStateChanged handled it),
        // treat the sign-in as successful and navigate into the app. This avoids false negatives when getRedirectResult
        // was consumed elsewhere or the auth state updated before this handler runs.
        if (result || current) {
          const uid = result?.user?.uid || current?.uid;
          console.log('Redirect result or existing user processed in handler:', uid);
          Alert.alert('Success', 'Google sign-in complete! Loading app...', [
            { text: 'OK', onPress: () => router.replace('/(app)/(tabs)') }
          ]);
        } else {
          console.log('No redirect result and no authenticated user in handler - redirecting to login');
          Alert.alert('Auth Failed', 'No Google response found. Please try sign-in again.', [
            { text: 'OK', onPress: () => router.replace('/(auth)/login') }
          ]);
        }
      } catch (error: any) {
        console.error('Error processing redirect in handler:', error);
        // If an error occurred but the user is already authenticated, continue into the app.
        if (auth.currentUser) {
          Alert.alert('Success', 'Google sign-in complete! Loading app...', [
            { text: 'OK', onPress: () => router.replace('/(app)/(tabs)') }
          ]);
        } else {
          Alert.alert('Error', `Auth error: ${error.message}`, [
            { text: 'OK', onPress: () => router.replace('/(auth)/login') }
          ]);
        }
      }
    };

    processRedirect();
  }, []);

  return null; // No UI needed for handler
}
