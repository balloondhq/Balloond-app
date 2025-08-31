/**
 * Onboarding Screen
 * Profile setup after signup
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import { locationService } from '../../services/locationService';

export const OnboardingScreen: React.FC = () => {
  const theme = useTheme();
  const { updateUser } = useAuth();
  
  const [step, setStep] = useState(1);
  const [bio, setBio] = useState('');
  const [age, setAge] = useState(25);
  const [radius, setRadius] = useState(50);
  const [photos, setPhotos] = useState<string[]>([]);

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setPhotos([...photos, ...result.assets.map(asset => asset.uri)].slice(0, 6));
    }
  };

  const requestLocationPermission = async () => {
    const location = await locationService.getCurrentLocation();
    if (location) {
      await locationService.updateLocation({ ...location, radius });
      handleNext();
    } else {
      Alert.alert('Location Required', 'Please enable location to find matches nearby');
    }
  };

  const completeOnboarding = async () => {
    try {
      await apiService.put('/users/profile', { bio, age });
      // Upload photos logic here
      updateUser({ bio, age });
      // Navigation will be handled by auth context
    } catch (error) {
      Alert.alert('Error', 'Failed to complete profile setup');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Add Photos
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Add up to 6 photos to show your best self
            </Text>
            
            <View style={styles.photoGrid}>
              {[...Array(6)].map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.photoSlot, { backgroundColor: theme.colors.card }]}
                  onPress={pickImage}
                >
                  {photos[index] ? (
                    <Text>📷</Text>
                  ) : (
                    <Text style={styles.photoPlus}>+</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              About You
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Tell us a bit about yourself
            </Text>
            
            <TextInput
              style={[styles.bioInput, { 
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }]}
              placeholder="Share something interesting about you..."
              placeholderTextColor={theme.colors.textLight}
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={150}
            />
            
            <View style={styles.ageContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Age: {age}</Text>
              <Slider
                style={styles.slider}
                minimumValue={18}
                maximumValue={99}
                value={age}
                onValueChange={setAge}
                step={1}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.border}
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Location Settings
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
              Set your search radius for matches
            </Text>
            
            <View style={styles.radiusContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Search Radius: {radius} km
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={5}
                maximumValue={100}
                value={radius}
                onValueChange={setRadius}
                step={5}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.border}
              />
            </View>
            
            <TouchableOpacity
              style={[styles.locationButton, { backgroundColor: theme.colors.primary }]}
              onPress={requestLocationPermission}
            >
              <Text style={styles.locationButtonText}>Enable Location</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.progress}>
          {[1, 2, 3].map((num) => (
            <View
              key={num}
              style={[
                styles.progressDot,
                { backgroundColor: step >= num ? theme.colors.primary : theme.colors.border },
              ]}
            />
          ))}
        </View>

        {renderStep()}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {step === 3 ? 'Complete' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  photoSlot: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  photoPlus: {
    fontSize: 32,
    color: '#999',
  },
  bioInput: {
    height: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  ageContainer: {
    marginTop: 32,
  },
  radiusContainer: {
    marginTop: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  locationButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  nextButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
