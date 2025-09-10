// contexts/AuthContext.tsx - Simple Version
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import { 
  User as FirebaseUser, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface UserProfile {
  fullName: string;
  bloodType: string;
  city: string;
  profileComplete: boolean;
  email: string;
  createdAt: any;
  phone?: string;
  role: string;
}

type AuthContextType = {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  initializing: boolean;
  login: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('Fetching user profile for:', userId);
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const profile = userDocSnap.data() as UserProfile;
        console.log('User profile found:', profile);
        return profile;
      }
      console.log('No user profile found');
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const refreshUserProfile = async (): Promise<void> => {
    if (user) {
      const profile = await fetchUserProfile(user.uid);
      setUserProfile(profile);
    }
  };

  // Handle authentication state changes
  useEffect(() => {
    console.log('Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('=== AUTH STATE CHANGED ===');
      console.log('Current user:', currentUser ? 'EXISTS' : 'NULL');
      console.log('User details:', {
        email: currentUser?.email,
        verified: currentUser?.emailVerified,
        uid: currentUser?.uid
      });

      setUser(currentUser);

      if (currentUser) {
        console.log('User is logged in, fetching profile...');
        setLoading(true);
        const profile = await fetchUserProfile(currentUser.uid);
        setUserProfile(profile);
        setLoading(false);
        console.log('Profile loaded, loading set to false');
      } else {
        console.log('User is logged out, clearing profile and setting loading to false');
        setUserProfile(null);
        setLoading(false);
      }

      if (initializing) {
        console.log('Auth initialization complete');
        setInitializing(false);
      }
    });

    return () => {
      console.log('Cleaning up auth listener');
      unsubscribe();
    };
  }, [initializing]);

  const login = async (email: string, password: string): Promise<FirebaseUser> => {
    try {
      console.log('Attempting login for:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful');
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('=== LOGOUT STARTED ===');
      setLoading(true);
      console.log('Loading set to true, calling Firebase signOut...');
      await signOut(auth);
      console.log('Firebase signOut completed successfully');
      // Don't manually set user and userProfile to null here
      // Let the onAuthStateChanged listener handle the state updates
      console.log('Logout function completed, waiting for auth state change...');
    } catch (error: any) {
      console.error('=== LOGOUT ERROR ===', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      setLoading(false); // Only set loading to false on error
      throw error; // Re-throw the error so the UI can handle it
    }
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading, 
      initializing,
      login, 
      logout, 
      refreshUserProfile 
    }}>
      {initializing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E53E3E" />
          <Text style={styles.loadingText}>Checking authentication...</Text>
        </View>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
