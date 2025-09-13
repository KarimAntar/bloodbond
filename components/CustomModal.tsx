import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: string;
  iconColor?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  type?: 'info' | 'warning' | 'error' | 'success';
  theme?: 'light' | 'dark';
}

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  onClose,
  title,
  message,
  icon,
  iconColor,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'info',
  theme = 'light',
}) => {
  const colors = Colors[theme];

  const getIconName = () => {
    if (icon) return icon;
    switch (type) {
      case 'warning': return 'warning';
      case 'error': return 'close-circle';
      case 'success': return 'checkmark-circle';
      default: return 'information-circle';
    }
  };

  const getIconColor = () => {
    if (iconColor) return iconColor;
    switch (type) {
      case 'warning': return '#F56500';
      case 'error': return '#E53E3E';
      case 'success': return '#38A169';
      default: return colors.primary;
    }
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.cardBackground }]}>
          {/* Header with Icon */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '20' }]}>
              <Ionicons name={getIconName() as any} size={24} color={getIconColor()} />
            </View>
            <Text style={[styles.title, { color: colors.primaryText }]}>{title}</Text>
          </View>

          {/* Message */}
          <Text style={[styles.message, { color: colors.secondaryText }]}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {onCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                onPress={handleCancel}
              >
                <Text style={[styles.cancelButtonText, { color: colors.secondaryText }]}>
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}

            {onConfirm && (
              <TouchableOpacity
                style={[styles.button, styles.confirmButton, { backgroundColor: getIconColor() }]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>
                  {confirmText}
                </Text>
              </TouchableOpacity>
            )}

            {!onConfirm && !onCancel && (
              <TouchableOpacity
                style={[styles.button, styles.singleButton, { backgroundColor: colors.primary }]}
                onPress={onClose}
              >
                <Text style={styles.singleButtonText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  confirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  singleButton: {
    // backgroundColor set dynamically
  },
  singleButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default CustomModal;
