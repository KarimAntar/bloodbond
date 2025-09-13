import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { SkeletonCard } from '../../components/SkeletonLoader';
import PullToRefresh from '../../components/PullToRefresh';

interface NotificationItem {
  id: string;
  type: 'request_response' | 'urgent_request' | 'donation_reminder' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

const NotificationCard: React.FC<{
  notification: NotificationItem;
  onPress: () => void;
  onMarkAsRead: () => void;
  colors: any;
}> = ({ notification, onPress, onMarkAsRead, colors }) => {
  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'request_response':
        return { name: 'chatbubble-ellipses', color: '#3182CE' };
      case 'urgent_request':
        return { name: 'warning', color: '#F56500' };
      case 'donation_reminder':
        return { name: 'heart', color: '#E53E3E' };
      case 'system':
        return { name: 'information-circle', color: '#38A169' };
      default:
        return { name: 'notifications', color: '#666' };
    }
  };

  const getTimeAgo = () => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - notification.timestamp.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  const icon = getNotificationIcon();

  const cardStyles = StyleSheet.create({
    notificationCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
      boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

    },
    unreadCard: {
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryText,
      flex: 1,
      marginRight: 8,
    },
    notificationTime: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    notificationMessage: {
      fontSize: 14,
      color: colors.secondaryText,
      lineHeight: 20,
    },
  });

  return (
    <TouchableOpacity
      style={[cardStyles.notificationCard, !notification.read && cardStyles.unreadCard]}
      onPress={onPress}
    >
      <View style={[styles.notificationIcon, { backgroundColor: icon.color + '20' }]}>
        <Ionicons name={icon.name as any} size={20} color={icon.color} />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={cardStyles.notificationTitle}>{notification.title}</Text>
          <Text style={cardStyles.notificationTime}>{getTimeAgo()}</Text>
        </View>
        <Text style={cardStyles.notificationMessage}>{notification.message}</Text>
        {!notification.read && (
          <View style={styles.unreadDot} />
        )}
      </View>
      {!notification.read && (
        <TouchableOpacity style={styles.markAsReadButton} onPress={onMarkAsRead}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const colors = Colors[currentTheme];

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      if (user) {
        unsubscribe = await loadNotifications();
      } else {
        setLoading(false);
      }
    };

    setupListener();

    // Failsafe: Stop loading after 10 seconds if still loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Notifications loading timeout - showing empty state');
        setLoading(false);
        setRefreshing(false);
      }
    }, 10000);

    return () => {
      clearTimeout(timeout);
      if (unsubscribe) unsubscribe();
    };
  }, [user, loading]);

  const loadNotifications = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Listen to real-time notifications from Firebase
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(
        q, 
        (querySnapshot) => {
          const notificationsData: NotificationItem[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            notificationsData.push({
              id: doc.id,
              type: data.type,
              title: data.title,
              message: data.message,
              timestamp: data.timestamp?.toDate() || new Date(),
              read: data.read || false,
              actionUrl: data.actionUrl,
            });
          });
          setNotifications(notificationsData);
          setLoading(false);
          setRefreshing(false);
        },
        (error) => {
          console.error('Error loading notifications:', error);
          // Even if there's an error, stop loading and show empty state
          setNotifications([]);
          setLoading(false);
          setRefreshing(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up notifications listener:', error);
      setNotifications([]);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification: NotificationItem) => {
    // Mark as read when pressed
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl as any);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: Timestamp.now(),
      });

      // Update local state immediately for better UX
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read);

      // Update all unread notifications in Firebase
      const updatePromises = unreadNotifications.map(notification =>
        updateDoc(doc(db, 'notifications', notification.id), {
          read: true,
          readAt: Timestamp.now(),
        })
      );

      await Promise.all(updatePromises);

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.screenBackground,
    },
    notificationCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
      boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

    },
    unreadCard: {
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryText,
      flex: 1,
      marginRight: 8,
    },
    notificationTime: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    notificationMessage: {
      fontSize: 14,
      color: colors.secondaryText,
      lineHeight: 20,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 64,
      paddingHorizontal: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.primaryText,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16,
      color: colors.secondaryText,
      textAlign: 'center',
      lineHeight: 24,
    },
    markAsReadButton: {
      padding: 4,
      marginLeft: 8,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <LinearGradient
          colors={[colors.primary, colors.primary + 'DD']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>Loading...</Text>
          </View>
        </LinearGradient>

        <View style={styles.notificationsList}>
          {[...Array(4)].map((_, index) => (
            <SkeletonCard key={index} colors={colors} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primary + 'DD']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <View style={dynamicStyles.emptyContainer}>
              <Ionicons name="notifications-off" size={64} color={colors.secondaryText} />
              <Text style={dynamicStyles.emptyTitle}>No notifications yet</Text>
              <Text style={dynamicStyles.emptyText}>
                You'll receive notifications about blood requests and responses here.
              </Text>
            </View>
          ) : (
            <View style={styles.notificationsList}>
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onPress={() => handleNotificationPress(notification)}
                  onMarkAsRead={() => handleMarkAsRead(notification.id)}
                  colors={colors}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </PullToRefresh>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 12,
  },
  unreadBadge: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadBadgeText: {
    color: '#E53E3E',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllButton: {
    alignSelf: 'flex-start',
  },
  markAllText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  notificationsList: {
    padding: 16,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    boxShadow: '0px 1px 4px rgba(0,0,0,0.08)',

  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#E53E3E',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53E3E',
  },
  markAsReadButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
  },
});
