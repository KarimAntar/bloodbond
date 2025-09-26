import { useEffect } from 'react';
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
          // Redirect to main app
          router.replace('/(app)/(tabs)');
        } else {
          console.log('No redirect result in handler - redirecting to login');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Error processing redirect in handler:', error);
        router.replace('/(auth)/login');
      }
    };

    processRedirect();
  }, []);

  return null; // No UI needed for handler
}
