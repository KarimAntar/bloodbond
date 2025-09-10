import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { auth } from '../firebase/firebaseConfig'; // Ensure this is your Firebase config file
import { User as FirebaseUser, sendEmailVerification, onAuthStateChanged } from 'firebase/auth'; // Import Firebase types

type AuthContextType = {
  user: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Effect to handle user authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Set user state based on the auth state
      setLoading(false); // Once auth state is checked, stop the loading spinner
    });

    // Clean up the listener on component unmount
    return () => unsubscribe();
  }, []);

  // Implement login, logout, register, and sendVerificationEmail functions
  const login = async (email: string, password: string) => {
    // Logic for logging in
  };

  const logout = async () => {
    // Logic for logging out
  };

  const register = async (email: string, password: string) => {
    // Logic for registering
  };

  const sendVerificationEmail = async () => {
    if (user) {
      // Cast the user explicitly to FirebaseUser to access sendEmailVerification
      await sendEmailVerification(user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, sendVerificationEmail }}>
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
