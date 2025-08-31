import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface Props {
  onVerified: (birthDate: Date) => void;
  onFailed: () => void;
}

export default function AgeVerification({ onVerified, onFailed }: Props) {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  const calculateAge = (date: Date): number => {
    const today = new Date();
    const birth = new Date(date);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      setBirthDate(selectedDate);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleVerify = async () => {
    if (!birthDate) {
      Alert.alert('Date Required', 'Please enter your date of birth to continue.');
      return;
    }

    if (!hasAgreed) {
      Alert.alert('Agreement Required', 'Please agree to the terms to continue.');
      return;
    }

    const age = calculateAge(birthDate);

    if (age < 18) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Log attempt for safety
      await AsyncStorage.setItem('ageVerificationFailed', new Date().toISOString());
      
      Alert.alert(
        'Age Requirement Not Met',
        'You must be 18 or older to use Balloon\'d. We take user safety seriously.',
        [
          {
            text: 'I Understand',
            onPress: onFailed,
          },
        ],
        { cancelable: false }
      );
    } else {
      // Save verification
      await AsyncStorage.setItem('ageVerified', 'true');
      await AsyncStorage.setItem('birthDate', birthDate.toISOString());
      await AsyncStorage.setItem('ageVerificationDate', new Date().toISOString());
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onVerified(birthDate);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F5F5DC', '#FFF8DC']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={60} color="#8B1538" />
          </View>
          <Text style={styles.title}>Age Verification</Text>
          <Text style={styles.subtitle}>
            Balloon'd is for adults only. Please verify your age to continue.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={24} color="#8B1538" />
            <Text style={styles.dateButtonText}>
              {birthDate ? formatDate(birthDate) : 'Select your birth date'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={birthDate || new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          <View style={styles.agreementContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => {
                setHasAgreed(!hasAgreed);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={[styles.checkboxInner, hasAgreed && styles.checkboxChecked]}>
                {hasAgreed && <Ionicons name="checkmark" size={18} color="#FFF" />}
              </View>
            </TouchableOpacity>
            <Text style={styles.agreementText}>
              I confirm that I am 18 years or older and agree to the Terms of Service 
              and Privacy Policy
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#8B1538" />
            <Text style={styles.infoText}>
              We require age verification to ensure a safe environment for all users. 
              Your date of birth will be kept confidential and used only for verification purposes.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, (!birthDate || !hasAgreed) && styles.verifyButtonDisabled]}
          onPress={handleVerify}
          disabled={!birthDate || !hasAgreed}
        >
          <LinearGradient
            colors={birthDate && hasAgreed ? ['#8B1538', '#D2691E'] : ['#CCC', '#AAA']}
            style={styles.verifyButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.verifyButtonText}>Verify Age</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.safetyNote}>
          <Text style={styles.safetyNoteTitle}>Safety First</Text>
          <Text style={styles.safetyNoteText}>
            Balloon'd is committed to creating a safe dating environment. We use 
            age verification to protect minors and ensure all users can connect 
            with confidence.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 20,
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
    lineHeight: 22,
  },
  form: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 20,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  agreementContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 10,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#8B1538',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#8B1538',
  },
  agreementText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF8DC',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E68C',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
    lineHeight: 18,
  },
  verifyButton: {
    marginBottom: 20,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 25,
  },
  verifyButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  safetyNote: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  safetyNoteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  safetyNoteText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
