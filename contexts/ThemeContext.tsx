import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuth } from './AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeType;
  currentTheme: 'light' | 'dark';
  colors: typeof Colors.light;
  setTheme: (theme: ThemeType) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('system');
  const [isLoading, setIsLoading] = useState(true);
  const systemColorScheme = useSystemColorScheme();
  const { user } = useAuth();

  // Determine the actual theme to use
  const currentTheme: 'light' | 'dark' = theme === 'system'
    ? (systemColorScheme || 'light')
    : theme;

  // Get the appropriate colors
  const colors = Colors[currentTheme];

  // Load user's theme preference from database
  useEffect(() => {
    const loadUserTheme = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.theme) {
            setThemeState(userData.theme);
          }
        }
      } catch (error) {
        console.error('Error loading user theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserTheme();
  }, [user]);

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);

    // Save to user profile if user is logged in
    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          theme: newTheme
        });
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    }
  };

  const value = {
    theme,
    currentTheme,
    colors,
    setTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
