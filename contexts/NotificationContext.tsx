import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user, initializing } = useAuth();

  useEffect(() => {
    // Don't set up listeners while authentication is still initializing
    if (initializing) {
      return;
    }

    if (!user) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Listen to real-time notifications from Firebase
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('read', '==', false)
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        setUnreadCount(querySnapshot.size);
        setIsLoading(false);
      }, (error) => {
        console.error('Notification listener error:', error);
        setIsLoading(false);
        // Handle permission errors gracefully
        if (error.code === 'permission-denied') {
          console.log('Notification permissions denied, setting count to 0');
          setUnreadCount(0);
        } else {
          // For other errors, also set count to 0 to prevent crashes
          setUnreadCount(0);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up notification listener:', error);
      setIsLoading(false);
    }
  }, [user, initializing]);

  const value = {
    unreadCount,
    isLoading,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
