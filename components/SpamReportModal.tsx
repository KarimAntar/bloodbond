import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportSpam } from '../utils/captcha';

interface SpamReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetUserId: string;
  targetType: 'request' | 'response' | 'user';
  targetId: string;
  reporterId: string;
}

const REPORT_REASONS = [
  'Spam or repetitive content',
  'Fake or misleading information',
  'Inappropriate content',
  'Suspicious behavior',
  'Not a genuine blood request/response',
  'Harassment or abuse',
  'Other',
];

export default function SpamReportModal({
  visible,
  onClose,
  targetUserId,
  targetType,
  targetId,
  reporterId,
}: SpamReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Missing Information', 'Please select a reason for reporting.');
      return;
    }

    if (selectedReason === 'Other' && !customReason.trim()) {
      Alert.alert('Missing Information', 'Please specify the reason for reporting.');
      return;
    }

    setLoading(true);

    try {
      const reason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
      const fullReason = additionalDetails.trim() 
        ? `${reason}\n\nAdditional details: ${additionalDetails.trim()}`
        : reason;

      const result = await reportSpam(
        reporterId,
        targetUserId,
        targetType,
        targetId,
        fullReason
      );

      if (result.success) {
        Alert.alert(
          'Report Submitted',
          result.message,
          [
            {
              text: 'OK',
              onPress: () => {
                resetForm();
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error submitting spam report:', error);
      Alert.alert(
        'Error',
        'Failed to submit report. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedReason('');
    setCustomReason('');
    setAdditionalDetails('');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report {targetType}</Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={loading}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text style={styles.warningText}>
                False reports may result in restrictions to your account. Only report genuine violations.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Reason for reporting</Text>
            <View style={styles.reasonsList}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonItem,
                    selectedReason === reason && styles.reasonItemSelected
                  ]}
                  onPress={() => setSelectedReason(reason)}
                  disabled={loading}
                >
                  <View style={[
                    styles.radioButton,
                    selectedReason === reason && styles.radioButtonSelected
                  ]}>
                    {selectedReason === reason && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <Text style={[
                    styles.reasonText,
                    selectedReason === reason && styles.reasonTextSelected
                  ]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedReason === 'Other' && (
              <View style={styles.customReasonSection}>
                <Text style={styles.inputLabel}>Please specify</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Describe the issue..."
                  placeholderTextColor="#999"
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>
            )}

            <View style={styles.detailsSection}>
              <Text style={styles.inputLabel}>Additional details (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Provide any additional context that might help our review..."
                placeholderTextColor="#999"
                value={additionalDetails}
                onChangeText={setAdditionalDetails}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#3182CE" />
              <Text style={styles.infoText}>
                Our team will review this report within 24-48 hours. We may take action including removing content or restricting accounts based on our community guidelines.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="flag" size={16} color="white" />
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    marginLeft: 8,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  reasonsList: {
    marginBottom: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  reasonItemSelected: {
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#3182CE',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: '#3182CE',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3182CE',
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
  },
  reasonTextSelected: {
    color: '#3182CE',
    fontWeight: '500',
  },
  customReasonSection: {
    marginBottom: 20,
  },
  detailsSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#f8f9fa',
    minHeight: 80,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EBF8FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#2D3748',
    marginLeft: 8,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#E53E3E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
