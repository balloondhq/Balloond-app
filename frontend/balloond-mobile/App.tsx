import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function App() {
  const handleCreateAccount = () => {
    // TODO: Navigate to signup
    console.log('Create Account pressed');
  };

  const handleSignIn = () => {
    // TODO: Navigate to login
    console.log('Sign In pressed');
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
      </View>

      <Text style={styles.terms}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
      
      <StatusBar style="auto" />
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
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: '#8B0000',
    fontSize: 18,
    fontWeight: '600',
  },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    color: '#999999',
  },
});
