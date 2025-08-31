/**
 * VoiceRecorder Component
 * Records and sends voice messages
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Modal,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

interface VoiceRecorderProps {
  onSendVoice: (audioData: string, duration: number) => void;
  visible: boolean;
  onClose: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoice,
  visible,
  onClose,
}) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isRecording) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start duration counter
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      // Stop animation
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);

      // Stop duration counter
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    // Check for 60 seconds limit
    if (duration >= 60 && isRecording) {
      stopRecording();
      Alert.alert('Maximum Duration', 'Voice messages are limited to 60 seconds');
    }
  }, [duration]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      // Request permissions
      const permissionResponse = await Audio.requestPermissionsAsync();
      if (!permissionResponse.granted) {
        Alert.alert('Permission Required', 'Please grant microphone access to record voice messages');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setDuration(0);
    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      if (uri) {
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Send the voice message
        onSendVoice(base64, duration);
      }

      setRecording(null);
      setDuration(0);
      onClose();
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Recording Error', 'Failed to save recording. Please try again.');
    }
  };

  const cancelRecording = async () => {
    if (recording && isRecording) {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      setRecording(null);
      setDuration(0);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={cancelRecording}
    >
      <View style={styles.container}>
        <View style={styles.recordingCard}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={cancelRecording}
          >
            <Ionicons name="close" size={24} color="#8B1A1A" />
          </TouchableOpacity>

          <Text style={styles.title}>
            {isRecording ? 'Recording...' : 'Tap to Record'}
          </Text>

          <Animated.View
            style={[
              styles.recordButtonContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordingButton,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={40}
                color="#FFF"
              />
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.duration}>{formatDuration(duration)}</Text>

          {isRecording && (
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelRecording}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sendButton}
                onPress={stopRecording}
              >
                <Text style={styles.sendText}>Send</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isRecording && duration === 0 && (
            <Text style={styles.hint}>Hold to record, release to send</Text>
          )}

          {duration >= 50 && duration < 60 && (
            <Text style={styles.warning}>
              {60 - duration} seconds remaining
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 30,
  },
  recordButtonContainer: {
    marginBottom: 20,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8B1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  recordingButton: {
    backgroundColor: '#FF4444',
  },
  duration: {
    fontSize: 24,
    fontWeight: '500',
    color: '#333',
    marginBottom: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  cancelButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#F5F5DC',
  },
  cancelText: {
    color: '#8B1A1A',
    fontWeight: '600',
    fontSize: 16,
  },
  sendButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#8B1A1A',
  },
  sendText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  hint: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  warning: {
    fontSize: 14,
    color: '#FF9500',
    marginTop: 10,
    fontWeight: '600',
  },
});
