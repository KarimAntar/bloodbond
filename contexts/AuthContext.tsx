// contexts/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { auth, db } from '../firebase/firebaseConfig';
import { 
  User as FirebaseUser, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, useSegments } from 'expo-router';

interface UserProfile {
  fullName: string;
  bloodType: string;
  city: string;
  profileComplete: boolean;
  email: string;
  createdAt: any;
  phone?: string;
}

type AuthContextType = {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<UserProfile | null>;
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
  
  const router = useRouter();
  const segments = useSegments();

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        return userDocSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      const profile = await fetchUserProfile(user.uid);
      setUserProfile(profile);
      return profile;
    }
    return null;
  };

  // Handle authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('Auth state changed:', currentUser?.email, 'verified:', currentUser?.emailVerified);
      
      setUser(currentUser);
      
      if (currentUser) {
        setLoading(true);
        const profile = await fetchUserProfile(currentUser.uid);
        setUserProfile(profile);
        setLoading(false);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
      
      if (initializing) {
        setInitializing(false);
      }
    });

    return () => unsubscribe();
  }, [initializing]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (initializing) return; // Don't navigate while initializing

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    console.log('Navigation check:', {
      user: !!user,
      verified: user?.emailVerified,
      profileComplete: userProfile?.profileComplete,
      segments: segments[0],
      inAuthGroup,
      inAppGroup
    });

    if (!user) {
      // User is not logged in
      if (!inAuthGroup) {
        console.log('Redirecting to login - no user');
        router.replace('/(auth)/login');
      }
    } else if (!user.emailVerified) {
      // User is logged in but not verified - stay on login to show verification
      if (!inAuthGroup) {
        console.log('Redirecting to login - unverified');
        router.replace('/(auth)/login');
      }
    } else if (user.emailVerified && !userProfile?.profileComplete) {
      // User is verified but profile incomplete
      if (!inAppGroup || segments[1] !== 'profile' || segments[2] !== 'setup') {
        console.log('Redirecting to profile setup');
        router.replace('/(app)/profile/setup');
      }
    } else if (user.emailVerified && userProfile?.profileComplete) {
      // User is fully set up
      if (!inAppGroup) {
        console.log('Redirecting to home - user ready');
        router.replace('/');
      }
    }
  }, [user, userProfile, segments, initializing]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigation will be handled by the useEffect above
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
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
      {children}
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