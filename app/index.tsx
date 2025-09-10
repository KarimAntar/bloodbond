import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from './contexts/AuthContext';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth, db } from './firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const [message, setMessage] = useState<string>(''); // To show custom messages
  const [userProfile, setUserProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      // If the app is still loading, show the loading spinner and return early
      return;
    }

    if (user) {
      // If the user is logged in, check if they are verified
      if (!user.emailVerified) {
        setMessage('Please verify your email to access the app fully.');
        // Redirect to login if email is not verified
        router.push('/auth/login');
      } else {
        // If verified, check if the user has set up their profile
        const fetchUserProfile = async () => {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            if (!userData.profileComplete) {
              setMessage('Please complete your profile setup!');
              router.push('/profile/setup'); // Redirect to profile setup if not complete
            } else {
              setUserProfile(userData);
              setMessage(`Welcome, ${userData.fullName.split(" ")[0] || 'User'}!`); // Use email instead of displayName
            }
          } else {
            // If no user document exists, ask to set up profile
            setMessage('Please complete your profile setup!');
            router.push('/profile/setup');
          }
        };
        fetchUserProfile();
      }
    } else {
      // If there's no user logged in, prompt the guest to log in or register
      setMessage('Hello, Guest! Please login or register to continue.');
    }
  }, [user, loading, router]); // Add router to the dependency array to avoid potential issues

  if (loading) {
    return <ActivityIndicator size="large" color="#d90429" />;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/auth/login');  // After logging out, redirect to login page
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <Ionicons name="heart-circle" size={30} color="#d90429" /> BloodBond
        </Text>
      </View>

      <Text style={styles.greeting}>{message}</Text>

      {user && userProfile ? (
        // Display user profile if profile is complete
        <View style={styles.profileContainer}>
          <Text style={styles.profileText}>Full Name: {userProfile.fullName}</Text>
          <Text style={styles.profileText}>Blood Type: {userProfile.bloodType}</Text>
          <Text style={styles.profileText}>City: {userProfile.city}</Text>
        </View>
      ) : null}

      {/* View Requests Button moved below the welcome message */}
      {user && userProfile && userProfile.profileComplete && (
        <TouchableOpacity
          style={styles.viewRequestsButton}
          onPress={() => router.push('/requests')}
        >
          <Text style={styles.viewRequestsText}>View Requests</Text>
        </TouchableOpacity>
      )}

      {!user ? (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#d90429',
    marginLeft: 10,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '300',
    marginBottom: 40,
    color: '#333',
    textAlign: 'center',
  },
  profileContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  profileText: {
    fontSize: 18,
    color: '#333',
  },
  buttonsContainer: {
    width: '80%',
    justifyContent: 'space-evenly',
  },
  button: {
    backgroundColor: '#d90429',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#d90429',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    width: '80%',
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  viewRequestsButton: {
    backgroundColor: '#d90429',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    width: '80%',
  },
  viewRequestsText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
});
