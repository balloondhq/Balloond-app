import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert,
  TextInput,
  ScrollView,
  SafeAreaView
} from 'react-native';

const API_URL = 'https://balloond-app-production.up.railway.app';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [user, setUser] = useState(null);

  // API Functions
  const testAPI = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const data = await response.json();
      Alert.alert('🎉 API Connected!', `Backend Status: ${data.status}\nService: ${data.service}\nEnvironment: ${data.environment}`);
    } catch (error) {
      Alert.alert('❌ API Error', 'Could not connect to backend. Check your internet connection.');
    }
  };

  const registerUser = async (email, name, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        Alert.alert('🎈 Welcome to Balloon\'d!', 'Account created successfully!');
        setUser({ email, name });
        setCurrentScreen('main');
      } else {
        Alert.alert('Registration Failed', 'Please try again');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Please check your connection');
    }
  };

  // Welcome Screen
  const WelcomeScreen = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.appName}>Balloon'd 🎈</Text>
        <Text style={styles.tagline}>
          Pop to reveal, double pop to connect 💕
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => setCurrentScreen('signup')}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => setCurrentScreen('login')}
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
    </SafeAreaView>
  );

  // Signup Screen
  const SignupScreen = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentScreen('welcome')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.formContainer}>
          <Text style={styles.screenTitle}>Create Account</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => registerUser(email, name, password)}
          >
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

  // Login Screen
  const LoginScreen = () => (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => setCurrentScreen('welcome')}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.formContainer}>
        <Text style={styles.screenTitle}>Sign In</Text>
        <Text style={styles.comingSoon}>Coming Soon! 🚧</Text>
        <Text style={styles.description}>
          For now, create a new account to test the app.
        </Text>
      </View>
    </SafeAreaView>
  );

  // Main App Screen (Post-Login)
  const MainScreen = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user?.name}! 🎈</Text>
        <TouchableOpacity 
          onPress={() => {
            setUser(null);
            setCurrentScreen('welcome');
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.mainContent}>
        <View style={styles.balloonGrid}>
          <Text style={styles.sectionTitle}>Nearby Balloons 🎈</Text>
          
          {[1, 2, 3, 4, 5, 6].map(i => (
            <TouchableOpacity 
              key={i} 
              style={styles.balloon}
              onPress={() => Alert.alert('Balloon Popped! 🎉', 'This feature is coming soon!')}
            >
              <Text style={styles.balloonText}>💕</Text>
              <Text style={styles.balloonLabel}>Tap to Pop!</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.features}>
          <Text style={styles.sectionTitle}>Features Coming Soon:</Text>
          <Text style={styles.featureItem}>🎈 Location-based matching</Text>
          <Text style={styles.featureItem}>💕 Double-pop to match</Text>
          <Text style={styles.featureItem}>💬 In-app messaging</Text>
          <Text style={styles.featureItem}>🎵 Voice messages</Text>
          <Text style={styles.featureItem}>📸 Photo sharing</Text>
          <Text style={styles.featureItem}>⭐ Premium subscriptions</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Render current screen
  switch (currentScreen) {
    case 'signup':
      return <SignupScreen />;
    case 'login':
      return <LoginScreen />;
    case 'main':
      return <MainScreen />;
    default:
      return <WelcomeScreen />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
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
    paddingHorizontal: 24,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
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
    paddingHorizontal: 24,
  },
  backButton: {
    padding: 16,
  },
  backButtonText: {
    fontSize: 18,
    color: '#8B0000',
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#8B0000',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#fff',
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  comingSoon: {
    fontSize: 24,
    textAlign: 'center',
    color: '#8B0000',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B0000',
  },
  logoutText: {
    fontSize: 16,
    color: '#666666',
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  balloonGrid: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#8B0000',
    marginBottom: 16,
  },
  balloon: {
    backgroundColor: '#FFE4E1',
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#8B0000',
  },
  balloonText: {
    fontSize: 30,
  },
  balloonLabel: {
    fontSize: 14,
    color: '#8B0000',
    fontWeight: '600',
  },
  features: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  featureItem: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
});
