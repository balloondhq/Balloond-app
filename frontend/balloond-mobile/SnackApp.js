import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';

export default function App() {
  const handleCreateAccount = () => {
    Alert.alert('Balloon\'d', 'Create Account - Coming Soon!');
  };

  const handleSignIn = () => {
    Alert.alert('Balloon\'d', 'Sign In - Coming Soon!');
  };

  const testAPI = async () => {
    try {
      const response = await fetch('https://balloond-app-production.up.railway.app/api/health');
      const data = await response.json();
      Alert.alert('API Test', `Backend Status: ${data.status}\nService: ${data.service}`);
    } catch (error) {
      Alert.alert('API Error', 'Could not connect to backend');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.appName}>Balloon'd 🎈</Text>
        <Text style={styles.tagline}>
          Pop to reveal, double pop to connect 💕
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleCreateAccount}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={handleSignIn}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.testButton}
          onPress={testAPI}
        >
          <Text style={styles.testButtonText}>Test Backend Connection</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.terms}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 50,
  },
  logoContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: '#8B0000',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#8B0000',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B0000',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#8B0000',
    fontSize: 18,
    fontWeight: '600',
  },
  testButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    marginBottom: 24,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    color: '#999999',
  },
});
