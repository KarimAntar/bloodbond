import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../firebase/firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';

export default function AuthHandler() {
  const router = useRouter();
  const { user } = useAuth();

    useEffect(() => {
    const processRedirect = async () => {
      try {
        console.log('Processing auth redirect in handler (improved) ...');

        // First attempt to read the redirect result directly
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log('getRedirectResult returned a user:', result.user.uid);
          Alert.alert('Success', 'Google sign-in complete! Loading app...', [
            { text: 'OK', onPress: () => router.replace('/(app)/(tabs)') }
          ]);
          return;
        }

        // If getRedirectResult returned nothing, wait briefly for the auth state to settle.
        // Some browsers or environments update onAuthStateChanged before getRedirectResult is available,
        // or the redirect result can be consumed earlier — so wait up to 3s for an authenticated user.
        const waitedUser: any = await new Promise((resolve) => {
          let settled = false;
          const timeout = setTimeout(() => {
            if (!settled) {
              settled = true;
              try { unsubscribe(); } catch (e) {}
              resolve(null);
            }
          }, 3000);

          const unsubscribe = onAuthStateChanged(auth, (u) => {
            if (u && !settled) {
              settled = true;
              clearTimeout(timeout);
              try { unsubscribe(); } catch (e) {}
              resolve(u);
            }
          });
        });

        const current = waitedUser || auth.currentUser;
        if (current) {
          console.log('Authenticated user detected after waiting:', current.uid);
          Alert.alert('Success', 'Google sign-in complete! Loading app...', [
            { text: 'OK', onPress: () => router.replace('/(app)/(tabs)') }
          ]);
        } else {
          console.log('No redirect result and no authenticated user in handler after wait - redirecting to login');
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
