// components/Toast.tsx
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  position?: 'top' | 'bottom';
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  visible,
  onHide,
  duration = 4000,
  position = 'top',
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#10B981',
          icon: 'checkmark-circle',
          textColor: 'white',
        };
      case 'error':
        return {
          backgroundColor: '#EF4444',
          icon: 'alert-circle',
          textColor: 'white',
        };
      case 'warning':
        return {
          backgroundColor: '#F59E0B',
          icon: 'warning',
          textColor: 'white',
        };
      case 'info':
        return {
          backgroundColor: '#3B82F6',
          icon: 'information-circle',
          textColor: 'white',
        };
      default:
        return {
          backgroundColor: '#6B7280',
          icon: 'information-circle',
          textColor: 'white',
        };
    }
  };

  const { backgroundColor, icon, textColor } = getToastConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          [position]: position === 'top' ? 60 : 100,
        },
      ]}
    >
      <Ionicons name={icon as any} size={20} color={textColor} />
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
        <Ionicons name="close" size={18} color={textColor} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Hook for easier toast management
export const useToast = () => {
  const [toastState, setToastState] = React.useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = React.useCallback((message: string, type: ToastType = 'info') => {
    setToastState({
      visible: true,
      message,
      type,
    });
  }, []);

  const hideToast = React.useCallback(() => {
    setToastState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const ToastComponent = React.useCallback(() => (
    <Toast
      {...toastState}
      onHide={hideToast}
    />
  ), [toastState, hideToast]);

  return {
    showToast,
    hideToast,
    ToastComponent,
    ...toastState,
  };
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 2,
  },
});

export default Toast;