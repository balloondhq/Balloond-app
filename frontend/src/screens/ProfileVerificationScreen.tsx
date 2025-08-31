/**
 * ProfileVerificationScreen
 * Verify user profile with selfie comparison
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { moderationService } from '../../services/moderationService';

export const ProfileVerificationScreen = () => {
  const navigation = useNavigation();
  const [step, setStep] = useState<'intro' | 'camera' | 'review' | 'processing' | 'complete'>('intro');
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [type, setType] = useState(CameraType.front);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    
    if (status === 'granted') {
      setStep('camera');
    } else {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera access to verify your profile.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => {} }, // Open settings
        ]
      );
    }
  };

  const takeSelfie = async () => {
    if (camera) {
      try {
        const photo = await camera.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        setSelfieUri(photo.uri);
        setStep('review');
      } catch (error) {
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      setSelfieUri(result.assets[0].uri);
      setStep('review');
    }
  };

  const submitVerification = async () => {
    if (!selfieUri) return;

    setStep('processing');
    setIsProcessing(true);

    try {
      // Convert image to base64 if needed
      const response = await fetch(selfieUri);
      const blob = await response.blob();
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result?.split(',')[1]);
        reader.readAsDataURL(blob);
      });

      // Submit verification
      const result = await moderationService.verifyProfile({
        selfieData: base64 as string,
      });

      setVerificationResult(result);
      setStep('complete');
    } catch (error) {
      Alert.alert(
        'Verification Failed',
        'Unable to verify your profile. Please try again.',
        [{ text: 'OK', onPress: () => setStep('intro') }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const renderIntro = () => (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer}>
      <View style={styles.introContainer}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#8B1A1A', '#D2691E']}
            style={styles.iconGradient}
          >
            <Ionicons name="shield-checkmark" size={50} color="#FFF" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Verify Your Profile</Text>
        <Text style={styles.subtitle}>
          Get a verification badge and build trust with other members
        </Text>

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Benefits of Verification</Text>
          
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitText}>Verification Badge</Text>
              <Text style={styles.benefitDescription}>
                Show others that you're a real person
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="trending-up" size={24} color="#4CAF50" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitText}>Increased Visibility</Text>
              <Text style={styles.benefitDescription}>
                Appear higher in search results
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="heart" size={24} color="#4CAF50" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitText}>More Matches</Text>
              <Text style={styles.benefitDescription}>
                Verified profiles get 2x more matches
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How it Works</Text>
          <Text style={styles.instructionsText}>
            1. Take a clear selfie of your face{'\n'}
            2. We'll compare it with your profile photos{'\n'}
            3. Get instantly verified if there's a match{'\n'}
            4. Your selfie is kept private and secure
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles.primaryButtonText}>Start Verification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderCamera = () => (
    <View style={styles.cameraContainer}>
      <Camera
        style={styles.camera}
        type={type}
        ref={(ref) => setCamera(ref)}
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraHeader}>
            <TouchableOpacity
              onPress={() => setStep('intro')}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={30} color="#FFF" />
            </TouchableOpacity>
            
            <Text style={styles.cameraTitle}>Take a Selfie</Text>
            
            <TouchableOpacity
              onPress={() => {
                setType(type === CameraType.back ? CameraType.front : CameraType.back);
              }}
              style={styles.flipButton}
            >
              <Ionicons name="camera-reverse" size={30} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.faceGuide}>
            <View style={styles.faceOutline} />
            <Text style={styles.faceGuideText}>
              Position your face within the circle
            </Text>
          </View>

          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={pickFromGallery}
            >
              <Ionicons name="images" size={30} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={takeSelfie}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>
        </View>
      </Camera>
    </View>
  );

  const renderReview = () => (
    <View style={styles.reviewContainer}>
      <View style={styles.reviewHeader}>
        <TouchableOpacity
          onPress={() => setStep('camera')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.reviewTitle}>Review Your Selfie</Text>
        
        <View style={styles.placeholder} />
      </View>

      <View style={styles.reviewContent}>
        {selfieUri && (
          <Image source={{ uri: selfieUri }} style={styles.reviewImage} />
        )}

        <Text style={styles.reviewText}>
          Make sure your face is clearly visible and matches your profile photos
        </Text>

        <View style={styles.checklistContainer}>
          <View style={styles.checklistItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.checklistText}>Face is clearly visible</Text>
          </View>
          <View style={styles.checklistItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.checklistText}>Good lighting</Text>
          </View>
          <View style={styles.checklistItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.checklistText}>No filters or edits</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={submitVerification}
        >
          <Text style={styles.submitButtonText}>Submit for Verification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.retakeButton}
          onPress={() => setStep('camera')}
        >
          <Text style={styles.retakeButtonText}>Retake Photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="large" color="#8B1A1A" />
      <Text style={styles.processingTitle}>Verifying Your Profile</Text>
      <Text style={styles.processingText}>
        This usually takes just a few seconds...
      </Text>
      
      <View style={styles.processingSteps}>
        <View style={styles.processingStep}>
          <Ionicons name="camera" size={20} color="#8B1A1A" />
          <Text style={styles.processingStepText}>Analyzing selfie</Text>
        </View>
        <View style={styles.processingStep}>
          <Ionicons name="images" size={20} color="#8B1A1A" />
          <Text style={styles.processingStepText}>Comparing with profile photos</Text>
        </View>
        <View style={styles.processingStep}>
          <Ionicons name="shield-checkmark" size={20} color="#8B1A1A" />
          <Text style={styles.processingStepText}>Verifying identity</Text>
        </View>
      </View>
    </View>
  );

  const renderComplete = () => (
    <View style={styles.completeContainer}>
      {verificationResult?.verified ? (
        <>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          </View>
          <Text style={styles.completeTitle}>You're Verified!</Text>
          <Text style={styles.completeText}>
            Your profile now has a verification badge. You'll appear higher in search results and get more matches!
          </Text>
          
          <View style={styles.similarityContainer}>
            <Text style={styles.similarityLabel}>Match Confidence</Text>
            <Text style={styles.similarityValue}>
              {verificationResult.similarity}%
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.pendingIcon}>
            <Ionicons name="time" size={80} color="#FF9500" />
          </View>
          <Text style={styles.completeTitle}>Verification Pending</Text>
          <Text style={styles.completeText}>
            Your verification is being reviewed by our team. You'll receive a notification once it's complete (usually within 24 hours).
          </Text>
        </>
      )}

      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {step === 'intro' && renderIntro()}
      {step === 'camera' && renderCamera()}
      {step === 'review' && renderReview()}
      {step === 'processing' && renderProcessing()}
      {step === 'complete' && renderComplete()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollContainer: {
    flex: 1,
  },
  introContainer: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    gap: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  benefitDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  instructionsContainer: {
    width: '100%',
    padding: 20,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#8B1A1A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 15,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  closeButton: {
    padding: 5,
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  flipButton: {
    padding: 5,
  },
  faceGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOutline: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderStyle: 'dashed',
  },
  faceGuideText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 20,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  galleryButton: {
    padding: 10,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#FFF',
    padding: 5,
  },
  captureButtonInner: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: '#FFF',
  },
  placeholder: {
    width: 50,
  },
  reviewContainer: {
    flex: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  reviewContent: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  reviewImage: {
    width: 250,
    height: 250,
    borderRadius: 125,
    marginBottom: 20,
  },
  reviewText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  checklistContainer: {
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 30,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  checklistText: {
    fontSize: 14,
    color: '#333',
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#8B1A1A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  retakeButton: {
    paddingVertical: 12,
  },
  retakeButtonText: {
    color: '#666',
    fontSize: 15,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  processingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  processingText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  processingSteps: {
    width: '100%',
    maxWidth: 300,
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
    opacity: 0.7,
  },
  processingStepText: {
    fontSize: 14,
    color: '#666',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    marginBottom: 20,
  },
  pendingIcon: {
    marginBottom: 20,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  completeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  similarityContainer: {
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  similarityLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  similarityValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
  },
  doneButton: {
    paddingHorizontal: 60,
    paddingVertical: 16,
    backgroundColor: '#8B1A1A',
    borderRadius: 12,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
