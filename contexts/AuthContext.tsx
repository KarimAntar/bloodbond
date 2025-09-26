// contexts/AuthContext.tsx - Firebase v10+ compatibility
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult
} from 'firebase/auth';
import { collection, doc, getDoc } from 'firebase/firestore';
import { auth, db, googleClientIdIOS, googleClientIdWeb } from '../firebase/firebaseConfig';
import { LoadingScreen } from '../components/LoadingScreen';
import { Platform } from 'react-native';
import { browserLocalPersistence, setPersistence } from 'firebase/auth';

interface UserProfile {
  fullName: string;
  bloodType: string;
  governorate: string;
  city: string;
  profileComplete: boolean;
  email: string;
  createdAt: any;
  phone?: string;
  role: string;
  profilePicture?: string;

  // Optional notification/location preferences persisted on the user profile.
  // These are optional to avoid breaking existing profiles that don't include them.
  notificationsEnabled?: boolean;
  locationEnabled?: boolean;
}

type AuthContextType = {
  user: any;
  userProfile: UserProfile | null;
  loading: boolean;
  initializing: boolean;
  login: (email: string, password: string) => Promise<any>;
  loginWithGoogle: () => Promise<any>;
  loginWithPhone: (phoneNumber: string) => Promise<ConfirmationResult>;
  confirmPhoneCode: (confirmationResult: ConfirmationResult, code: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [profileCache] = useState<Map<string, UserProfile>>(new Map());

  // Async load profile cache from localStorage after mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadProfileCache = async () => {
      try {
        const raw = localStorage.getItem('bb_user_profile');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.uid && parsed?.profile) {
            profileCache.set(parsed.uid, parsed.profile);
            // If current user matches, set it immediately
            if (user?.uid === parsed.uid) {
              setUserProfile(parsed.profile);
            }
          }
        }
      } catch (e) {
        console.error('Error loading profile cache from localStorage', e);
      }
    };

    loadProfileCache();
  }, []);

  // Set auth persistence to local for web to ensure login survives page reloads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPersistence(auth, browserLocalPersistence)
        .then(() => {
          console.log('Auth persistence set to local for web');
        })
        .catch((error) => {
          console.error('Error setting auth persistence:', error);
        });
    }
  }, []);

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    // Check cache first for faster loading
    if (profileCache.has(userId)) {
      console.log('User profile found in cache:', userId);
      return profileCache.get(userId)!;
    }

    // Ensure userId is provided
    if (!userId) {
      console.log('No userId provided, cannot fetch profile');
      return null;
    }

    try {
      console.log('Fetching user profile for:', userId);
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const profile = userDocSnap.data() as UserProfile;
        console.log('User profile found:', profile);
        // Cache the profile for future use
        profileCache.set(userId, profile);
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('bb_user_profile', JSON.stringify({ uid: userId, profile }));
          }
        } catch (e) {
          console.error('Error saving profile to localStorage', e);
        }
        return profile;
      }

      // Profile doesn't exist, create a basic one for Google sign-in users
      console.log('No user profile found, creating basic profile for Google user');
      const basicProfile: UserProfile = {
        fullName: user?.displayName || '', // Pre-fill with Google display name
        bloodType: '',
        governorate: '',
        city: '',
        profileComplete: false, // Mark as incomplete so user gets redirected to setup
        email: user?.email || '', // Pre-fill with Google email
        createdAt: new Date(),
        role: 'user',
        profilePicture: user?.photoURL || undefined, // Use Google profile picture if available
      };

      // Cache the basic profile
      profileCache.set(userId, basicProfile);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('bb_user_profile', JSON.stringify({ uid: userId, profile: basicProfile }));
        }
      } catch (e) {
        console.error('Error saving basic profile to localStorage', e);
      }
      return basicProfile;
    } catch (error: any) {
      console.error('Error fetching user profile:', error);

      // Handle permission denied specifically
      if (error.code === 'permission-denied') {
        console.error('Firestore permission denied. User may not be fully authenticated.');
        return null;
      }

      return null;
    }
  };

  const refreshUserProfile = async (): Promise<void> => {
    if (user) {
      // Clear cache for this user to force fresh fetch
      profileCache.delete(user.uid);
      const profile = await fetchUserProfile(user.uid);
      setUserProfile(profile);
    }
  };

/* Handle authentication state changes
   - Don't block the UI on profile fetch: mark initializing false immediately (fast path)
   - Fetch profile in background so the splash doesn't hang while network calls complete
   - Keep the logout/clearing behavior synchronous
*/
useEffect(() => {
  console.log('Setting up auth state listener');

  const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
    console.log('=== AUTH STATE CHANGED ===');
    console.log('Current user:', currentUser ? 'EXISTS' : 'NULL');

    setUser(currentUser);

    // Mark initialization finished immediately so UI can render without waiting for Firestore
    if (initializing) {
      console.log('Auth initialization complete (fast path)');
      setInitializing(false);
    }

    if (currentUser) {
      console.log('User logged in — fetching profile in background');

      // If we have a cached profile for this uid, apply it immediately for fastest UI
      if (profileCache.has(currentUser.uid)) {
        const cached = profileCache.get(currentUser.uid)!;
        console.log('Applying cached profile for user:', currentUser.uid);
        setUserProfile(cached);
        setLoading(false);
      } else {
        // Only show loading indicator while profile isn't cached
        setLoading(true);
      }

      // Perform profile fetch in background; do not block initialization/splash
      (async () => {
        try {
          const profile = await fetchUserProfile(currentUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Background profile fetch error:', error);
        } finally {
          setLoading(false);
        }
        console.log('Profile loaded (background)');
      })();
    } else {
      console.log('User is logged out, clearing profile');
      setUserProfile(null);
      setLoading(false);
      // Clear cache on logout
      profileCache.clear();
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('bb_user_profile');
        }
      } catch (e) {
        console.error('Error removing profile from localStorage', e);
      }
    }
  });

  return () => {
    console.log('Cleaning up auth listener');
    unsubscribe();
  };
}, []); // FIXED: Empty dependency array to prevent re-creation loop

// Fallback: ensure we don't stay on the initializing splash indefinitely
useEffect(() => {
  if (initializing) {
    const timer = setTimeout(() => {
      // If still initializing after 5s, force it to false to avoid long hangs
      console.warn('Initialization timeout reached, forcing initializing = false');
      setInitializing(false);
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }
}, [initializing]);

  // Handle redirect result from Google OAuth
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Redirect result received:', result.user);
          // User will be handled by onAuthStateChanged listener
        }
      } catch (error) {
        console.error('Error handling redirect result:', error);
      }
    };

    handleRedirectResult();
  }, []);

  // Add a small delay to ensure auth state is fully initialized before other components try to use Firestore
  useEffect(() => {
    if (!initializing && user) {
      console.log('Auth fully initialized, user authenticated');
    }
  }, [initializing, user]);

  const login = async (email: string, password: string): Promise<any> => {
    try {
      console.log('Attempting login for:', email);
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful');
      setLoading(false);
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
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

  const loginWithPhone = async (phoneNumber: string): Promise<ConfirmationResult> => {
    try {
      console.log('Attempting phone login for:', phoneNumber);
      setLoading(true);

      // Create reCAPTCHA verifier for web
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: any) => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        }
      });

      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      console.log('Phone verification code sent');
      setLoading(false);
      return confirmationResult;
    } catch (error) {
      console.error('Phone login error:', error);
      setLoading(false);
      throw error;
    }
  };

  const confirmPhoneCode = async (confirmationResult: ConfirmationResult, code: string): Promise<any> => {
    try {
      console.log('Confirming phone verification code');
      setLoading(true);
      const result = await confirmationResult.confirm(code);
      console.log('Phone verification successful');
      setLoading(false);
      return result.user;
    } catch (error) {
      console.error('Phone code confirmation error:', error);
      setLoading(false);
      throw error;
    }
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      initializing,
      login,
      loginWithGoogle: async () => {
        setLoading(true);
        try {
          // Check if we're on web or mobile
          if (typeof window !== 'undefined' && window.document && window.location.protocol.startsWith('http')) {
          // Web environment - detect mobile for redirect preference
            const userAgent = navigator.userAgent.toLowerCase();
            const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
            const isIOS = /iphone|ipad|ipod/.test(userAgent);
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({
              client_id: googleClientIdWeb
            });

            if (isMobile) {
              // On iOS Safari/Chrome mobile browsers Firebase redirect/popup can fail due to
              // intelligent tracking prevention and third-party cookie restrictions.
              // Try popup first on iOS and fall back to redirect if popup fails.
              if (isIOS) {
                console.log('iOS mobile detected - attempting popup first to avoid Safari redirect issues');
                try {
                  const result = await signInWithPopup(auth, provider);
                  setLoading(false);
                  return result.user;
                } catch (popupError: any) {
                  console.warn('Popup failed on iOS, falling back to redirect', popupError);
                  // If popup is blocked or unsupported, fallback to redirect
                  await signInWithRedirect(auth, provider);
                  console.log('Redirect initiated - page should navigate to Google');
                  setLoading(false);
                  return null;
                }
              } else {
                // Non-iOS mobile: use redirect for reliability
                console.log('Using Google sign-in redirect for mobile web/PWA');
                await signInWithRedirect(auth, provider);
                console.log('Redirect initiated - page should navigate to Google');
                setLoading(false);
                return null; // User will be set by onAuthStateChanged after redirect
              }
            } else {
              // Desktop web: use popup
              console.log('Using Google sign-in popup for desktop web');
              const result = await signInWithPopup(auth, provider);
              setLoading(false);
              return result.user;
            }
          } else {
            // Mobile (iOS/Android native): use Firebase signInWithRedirect
            console.log('Using Firebase signInWithRedirect for Google sign-in on mobile');
            const provider = new GoogleAuthProvider();
            if (Platform.OS === 'ios') {
              provider.setCustomParameters({
                client_id: googleClientIdIOS
              });
            } else {
              provider.setCustomParameters({
                client_id: googleClientIdWeb
              });
            }
            await signInWithRedirect(auth, provider);
            // Note: signInWithRedirect doesn't return a user immediately
            // The user will be available through onAuthStateChanged after redirect
            setLoading(false);
            return null; // User will be set by onAuthStateChanged listener
          }
        } catch (error: any) {
          console.error('Google sign-in error details:', error.code, error.message);
          setLoading(false);
          throw error;
        }
      },
      loginWithPhone,
      confirmPhoneCode,
      logout,
      refreshUserProfile
    }}>
      {initializing ? (
        <LoadingScreen message="Initializing BloodBond..." />
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
