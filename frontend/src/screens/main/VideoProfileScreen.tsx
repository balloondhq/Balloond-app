// Video Profile Screen
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { uploadVideoProfile } from '../../services/videoService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const VideoProfileScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const cameraRef = useRef<Camera>(null);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const audioStatus = await Camera.requestMicrophonePermissionsAsync();
      setHasPermission(status === 'granted' && audioStatus.status === 'granted');
    })();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync({
          maxDuration: 60,
          quality: Camera.Constants.VideoQuality['720p'],
        });
        setVideoUri(video.uri);
      } catch (error) {
        console.error('Error recording video:', error);
        Alert.alert('Error', 'Failed to record video');
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  const retakeVideo = () => {
    setVideoUri(null);
    setRecordingDuration(0);
  };

  const uploadVideo = async () => {
    if (!videoUri) return;

    setIsUploading(true);
    try {
      await uploadVideoProfile(videoUri);
      Alert.alert(
        'Success!',
        'Your video profile has been uploaded and is being processed.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to upload video. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission is required</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (videoUri) {
    return (
      <View style={styles.container}>
        <Video
          source={{ uri: videoUri }}
          style={styles.video}
          shouldPlay
          isLooping
          isMuted={false}
        />
        
        <View style={styles.videoControls}>
          <TouchableOpacity style={styles.controlButton} onPress={retakeVideo}>
            <Ionicons name="refresh" size={30} color="white" />
            <Text style={styles.controlText}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.uploadButton]}
            onPress={uploadVideo}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={30} color="white" />
                <Text style={styles.controlText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={CameraType.front}
        ratio="16:9"
      >
        <View style={styles.cameraOverlay}>
          {/* Recording indicator */}
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>
                {`00:${recordingDuration.toString().padStart(2, '0')}`} / 01:00
              </Text>
            </View>
          )}

          {/* Prompts */}
          <View style={styles.promptContainer}>
            <Text style={styles.promptTitle}>Video Intro Tips:</Text>
            <Text style={styles.promptText}>• Say your name and age</Text>
            <Text style={styles.promptText}>• Share what you're passionate about</Text>
            <Text style={styles.promptText}>• What you're looking for</Text>
            <Text style={styles.promptText}>• A fun fact about yourself</Text>
          </View>

          {/* Record button */}
          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={styles.recordButton}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <View style={[
                styles.recordButtonInner,
                isRecording && styles.recordButtonRecording
              ]} />
            </TouchableOpacity>
            
            {!isRecording && (
              <Text style={styles.instructionText}>
                Tap to start recording (3-60 seconds)
              </Text>
            )}
          </View>
        </View>
      </Camera>

      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF0000',
    marginRight: 10,
  },
  recordingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  promptContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 15,
  },
  promptTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  promptText: {
    color: 'white',
    fontSize: 14,
    marginVertical: 3,
  },
  bottomControls: {
    alignItems: 'center',
    marginBottom: 50,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    padding: 5,
  },
  recordButtonInner: {
    flex: 1,
    borderRadius: 35,
    backgroundColor: '#8B0000',
  },
  recordButtonRecording: {
    backgroundColor: '#FF0000',
    borderRadius: 10,
  },
  instructionText: {
    color: 'white',
    marginTop: 10,
    fontSize: 14,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    flex: 1,
  },
  videoControls: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 50,
  },
  controlButton: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
  },
  uploadButton: {
    backgroundColor: '#8B0000',
  },
  controlText: {
    color: 'white',
    marginTop: 5,
    fontSize: 12,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#8B0000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});