/**
 * ReportModal Component
 * Modal for reporting users or messages
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, description?: string) => void;
  contentType: 'USER' | 'MESSAGE';
}

const REPORT_REASONS = {
  USER: [
    { id: 'fake_profile', label: 'Fake Profile', icon: 'person-remove-outline' },
    { id: 'inappropriate_photos', label: 'Inappropriate Photos', icon: 'image-outline' },
    { id: 'harassment', label: 'Harassment or Bullying', icon: 'hand-left-outline' },
    { id: 'spam', label: 'Spam or Scam', icon: 'mail-unread-outline' },
    { id: 'underage', label: 'Under 18', icon: 'alert-circle-outline' },
    { id: 'violence', label: 'Violence or Threats', icon: 'warning-outline' },
    { id: 'hate_speech', label: 'Hate Speech', icon: 'ban-outline' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
  ],
  MESSAGE: [
    { id: 'inappropriate', label: 'Inappropriate Content', icon: 'alert-outline' },
    { id: 'harassment', label: 'Harassment', icon: 'hand-left-outline' },
    { id: 'spam', label: 'Spam', icon: 'mail-unread-outline' },
    { id: 'violence', label: 'Violence or Threats', icon: 'warning-outline' },
    { id: 'hate_speech', label: 'Hate Speech', icon: 'ban-outline' },
    { id: 'sexual', label: 'Sexual Content', icon: 'eye-off-outline' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
  ],
};

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  onSubmit,
  contentType,
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = REPORT_REASONS[contentType];
  const title = contentType === 'USER' ? 'Report User' : 'Report Message';
  const subtitle = contentType === 'USER' 
    ? 'Help us keep Balloon\'d safe by reporting this user'
    : 'Report this message for violating our guidelines';

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Please select a reason', 'You must select a reason for reporting.');
      return;
    }

    if (selectedReason === 'other' && !description.trim()) {
      Alert.alert('Please provide details', 'Please describe the issue in the text field.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(selectedReason, description);
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {/* Reason List */}
            <View style={styles.reasonList}>
              {reasons.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonItem,
                    selectedReason === reason.id && styles.reasonItemSelected,
                  ]}
                  onPress={() => setSelectedReason(reason.id)}
                >
                  <View style={styles.reasonLeft}>
                    <Ionicons
                      name={reason.icon as any}
                      size={24}
                      color={selectedReason === reason.id ? '#8B1A1A' : '#666'}
                    />
                    <Text
                      style={[
                        styles.reasonText,
                        selectedReason === reason.id && styles.reasonTextSelected,
                      ]}
                    >
                      {reason.label}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      selectedReason === reason.id && styles.radioButtonSelected,
                    ]}
                  >
                    {selectedReason === reason.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Additional Details */}
            {selectedReason && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsLabel}>
                  Additional Details {selectedReason === 'other' && '*'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Please provide more information..."
                  placeholderTextColor="#999"
                  value={description}
                  onChangeText={setDescription}
                  maxLength={500}
                />
                <Text style={styles.charCount}>{description.length}/500</Text>
              </View>
            )}

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#8B1A1A" />
              <Text style={styles.infoText}>
                Reports are anonymous and reviewed by our safety team within 24 hours.
                False reports may result in action against your account.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                !selectedReason && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason || isSubmitting}
            >
              <Text style={styles.submitText}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  reasonList: {
    paddingHorizontal: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reasonItemSelected: {
    backgroundColor: '#FFF5F5',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  reasonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  reasonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  reasonTextSelected: {
    color: '#8B1A1A',
    fontWeight: '500',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#8B1A1A',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8B1A1A',
  },
  detailsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  detailsLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 5,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 15,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#F5F5DC',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B1A1A',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#8B1A1A',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
