import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface UserStats {
  requestsCreated: number;
  responsesSent: number;
  donationsCompleted: number;
  livesImpacted: number;
}

interface UserStatsContextType {
  stats: UserStats;
  isLoading: boolean;
  refreshStats: () => Promise<void>;
}

const UserStatsContext = createContext<UserStatsContextType | undefined>(undefined);

export const useUserStats = () => {
  const context = useContext(UserStatsContext);
  if (context === undefined) {
    throw new Error('useUserStats must be used within a UserStatsProvider');
  }
  return context;
};

interface UserStatsProviderProps {
  children: ReactNode;
}

export const UserStatsProvider: React.FC<UserStatsProviderProps> = ({ children }) => {
  const [stats, setStats] = useState<UserStats>({
    requestsCreated: 0,
    responsesSent: 0,
    donationsCompleted: 0,
    livesImpacted: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchUserStats = async () => {
    if (!user) {
      setStats({
        requestsCreated: 0,
        responsesSent: 0,
        donationsCompleted: 0,
        livesImpacted: 0,
      });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch requests created by user
      const requestsQuery = query(
        collection(db, 'requests'),
        where('userId', '==', user.uid)
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsCreated = requestsSnapshot.size;

      // Fetch responses sent by user
      const responsesQuery = query(
        collection(db, 'responses'),
        where('userId', '==', user.uid)
      );
      const responsesSnapshot = await getDocs(responsesQuery);
      const responsesSent = responsesSnapshot.size;

      // For now, keep donations and lives impacted as mock data
      // In a real app, you'd have a donations collection
      const donationsCompleted = 5;
      const livesImpacted = requestsCreated * 3; // Rough estimate

      setStats({
        requestsCreated,
        responsesSent,
        donationsCompleted,
        livesImpacted,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStats = async () => {
    await fetchUserStats();
  };

  useEffect(() => {
    fetchUserStats();
  }, [user]);

  const value = {
    stats,
    isLoading,
    refreshStats,
  };

  return (
    <UserStatsContext.Provider value={value}>
      {children}
    </UserStatsContext.Provider>
  );
};
