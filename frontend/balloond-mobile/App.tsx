import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
  TextInput,
  Animated,
  ImageBackground,
  Image,
  PanResponder
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const API_URL = 'https://balloond-app-production.up.railway.app';

// Figma-inspired color palette
const COLORS = {
  primary: '#E94E77', // Pink/Red from Figma
  secondary: '#6B46C1', // Purple accent
  orange: '#F97316', // Orange for reject
  background: '#F9FAFB',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray600: '#6B7280',
  gray900: '#111827',
  black: '#000000',
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [user, setUser] = useState(null);
  const [balloonScale] = useState(new Animated.Value(1));

  // Balloon animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(balloonScale, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(balloonScale, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // API Functions
  const testAPI = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const data = await response.json();
      Alert.alert('🎉 Backend Connected!', `Status: ${data.status}\nService: ${data.service}`);
    } catch (error) {
      Alert.alert('❌ Connection Error', 'Please check your internet connection.');
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

  // Beautiful Welcome Screen
  const WelcomeScreen = () => (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FAF7F2', '#FFF8F0', '#FFE4E1']}
        style={styles.gradientBackground}
      >
        <View style={styles.welcomeContent}>
          {/* Floating Balloons Header */}
          <View style={styles.balloonHeader}>
            <Animated.Text 
              style={[styles.balloonEmoji, { transform: [{ scale: balloonScale }] }]}
            >
              🎈
            </Animated.Text>
            <Text style={styles.appTitle}>Balloon'd</Text>
            <Text style={styles.subtitle}>Pop to reveal, double pop to connect 💕</Text>
          </View>

          {/* Feature Preview */}
          <View style={styles.previewSection}>
            <BlurView intensity={20} style={styles.previewCard}>
              <Text style={styles.previewTitle}>How it works:</Text>
              <View style={styles.featureList}>
                <Text style={styles.featureItem}>🎈 See nearby balloons</Text>
                <Text style={styles.featureItem}>👆 Pop to see a preview</Text>
                <Text style={styles.featureItem}>💕 Double pop to match</Text>
                <Text style={styles.featureItem}>💬 Chat and connect</Text>
              </View>
            </BlurView>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => setCurrentScreen('signup')}
            >
              <LinearGradient
                colors={['#8B0000', '#B22222']}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>Start Popping 🎈</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => setCurrentScreen('login')}
            >
              <Text style={styles.secondaryButtonText}>I Already Have Account</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.testButton}
              onPress={testAPI}
            >
              <Text style={styles.testButtonText}>Test Connection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
      <StatusBar style="dark" />
    </SafeAreaView>
  );

  // Beautiful Signup Screen
  const SignupScreen = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#FAF7F2', '#FFF8F0']}
          style={styles.gradientBackground}
        >
          <ScrollView style={styles.scrollContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setCurrentScreen('welcome')}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Join Balloon'd 🎈</Text>
              <Text style={styles.formSubtitle}>Find your perfect match through balloon popping!</Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Your Name"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => registerUser(email, name, password)}
                >
                  <LinearGradient
                    colors={['#8B0000', '#B22222']}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.primaryButtonText}>Create Account 🎈</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  };

  // Profile Card Component matching Figma design
  const ProfileCard = ({ profile, onSwipe }) => {
    const pan = useRef(new Animated.ValueXY()).current;
    const rotate = pan.x.interpolate({
      inputRange: [-width / 2, 0, width / 2],
      outputRange: ['-10deg', '0deg', '10deg'],
    });

    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 120) {
          // Swipe right - like
          Animated.spring(pan.x, { toValue: width, useNativeDriver: false }).start();
          setTimeout(() => onSwipe('like'), 200);
        } else if (gestureState.dx < -120) {
          // Swipe left - pass
          Animated.spring(pan.x, { toValue: -width, useNativeDriver: false }).start();
          setTimeout(() => onSwipe('pass'), 200);
        } else {
          // Snap back
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    });

    return (
      <Animated.View
        style={[
          styles.profileCard,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <ImageBackground
          source={{ uri: profile.photos[0] }}
          style={styles.cardImage}
          imageStyle={styles.cardImageStyle}
        >
          {/* Distance indicator */}
          <View style={styles.distanceIndicator}>
            <Text style={styles.distanceText}>📍 {profile.distance}</Text>
          </View>
          
          {/* Profile info overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cardOverlay}
          >
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{profile.name}, {profile.age}</Text>
              <Text style={styles.cardBio}>{profile.bio}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Animated.View>
    );
  };

  // Swipe Buttons Component
  const SwipeButtons = ({ onAction }) => (
    <View style={styles.swipeButtons}>
      <TouchableOpacity
        style={[styles.actionButton, styles.rejectButton]}
        onPress={() => onAction('pass')}
      >
        <Text style={styles.actionButtonIcon}>✕</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.actionButton, styles.likeButton]}
        onPress={() => onAction('like')}
      >
        <Text style={styles.actionButtonIcon}>♡</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.actionButton, styles.superLikeButton]}
        onPress={() => onAction('superlike')}
      >
        <Text style={styles.actionButtonIcon}>⭐</Text>
      </TouchableOpacity>
    </View>
  );

  // Bottom Navigation
  const BottomNavigation = ({ activeTab, onTabChange }) => (
    <View style={styles.bottomNav}>
      {[
        { key: 'cards', icon: '🎴', label: 'Cards' },
        { key: 'likes', icon: '💚', label: 'Likes' },
        { key: 'messages', icon: '💬', label: 'Messages' },
        { key: 'profile', icon: '👤', label: 'Profile' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.navTab,
            activeTab === tab.key && styles.navTabActive,
          ]}
          onPress={() => onTabChange(tab.key)}
        >
          <Text style={[
            styles.navTabIcon,
            activeTab === tab.key && styles.navTabIconActive,
          ]}>
            {tab.icon}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Beautiful Main App Screen - Card-based
  const MainScreen = () => {
    const [activeTab, setActiveTab] = useState('cards');
    const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
    
    // Mock profile data matching your Figma design
    const profiles = [
      {
        id: 1,
        name: 'Jessica Parker',
        age: 23,
        bio: 'Professional model',
        distance: '1 km',
        photos: ['https://images.unsplash.com/photo-1494790108755-2616c88f1e27?w=400&h=600&fit=crop']
      },
      {
        id: 2,
        name: 'Sarah Wilson',
        age: 25,
        bio: 'Coffee enthusiast & designer',
        distance: '2 km',
        photos: ['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop']
      },
      {
        id: 3,
        name: 'Emily Chen',
        age: 27,
        bio: 'Adventure seeker',
        distance: '3 km',
        photos: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop']
      }
    ];

    const handleSwipe = async (action) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (action === 'like') {
        Alert.alert('💚 Like Sent!', 'They\'ll see you liked them!');
      } else if (action === 'superlike') {
        Alert.alert('⭐ Super Like!', 'You super liked them!');
      }
      
      // Move to next profile
      setCurrentProfileIndex((prev) => (prev + 1) % profiles.length);
    };

    return (
      <SafeAreaView style={[styles.container, styles.figmaContainer]}>
        {/* Header matching Figma */}
        <View style={styles.figmaHeader}>
          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.headerButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.headerTitle}>
            <Text style={styles.headerTitleText}>Discover</Text>
            <Text style={styles.headerSubtitle}>Chicago, IL</Text>
          </View>
          
          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.headerFilterIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* Main Card Area */}
        <View style={styles.cardContainer}>
          {profiles.slice(currentProfileIndex, currentProfileIndex + 2).map((profile, index) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onSwipe={handleSwipe}
              style={{ zIndex: profiles.length - index }}
            />
          ))}
        </View>

        {/* Swipe Action Buttons */}
        <SwipeButtons onAction={handleSwipe} />

        {/* Bottom Navigation */}
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  };

  // Login Screen
  const LoginScreen = () => (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FAF7F2', '#FFF8F0']}
        style={styles.gradientBackground}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentScreen('welcome')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Welcome Back! 🎈</Text>
          <Text style={styles.comingSoon}>Sign In Coming Soon! 🚧</Text>
          <Text style={styles.description}>
            For now, create a new account to experience Balloon'd!
          </Text>
        </View>
      </LinearGradient>
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
  },
  gradientBackground: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  // Welcome Screen Styles
  welcomeContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  balloonHeader: {
    alignItems: 'center',
    marginTop: 40,
  },
  balloonEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#8B0000',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 20,
  },
  previewSection: {
    marginVertical: 40,
  },
  previewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 10,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B0000',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureList: {
    alignItems: 'flex-start',
  },
  featureItem: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
    fontWeight: '500',
  },
  actionSection: {
    width: '100%',
  },
  primaryButton: {
    height: 60,
    borderRadius: 30,
    marginBottom: 16,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B0000',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#8B0000',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  testButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  // Form Styles
  backButton: {
    padding: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 18,
    color: '#8B0000',
    fontWeight: '600',
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#8B0000',
    textAlign: 'center',
    marginBottom: 12,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  comingSoon: {
    fontSize: 28,
    textAlign: 'center',
    color: '#8B0000',
    fontWeight: '700',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 32,
    lineHeight: 24,
  },
  // Main Screen Styles
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 0, 0, 0.1)',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B0000',
  },
  logoutText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#8B0000',
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(139, 0, 0, 0.2)',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B0000',
    marginBottom: 20,
  },
  balloonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  balloon: {
    width: (width - 60) / 2,
    height: 120,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  balloonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B0000',
    borderRadius: 20,
  },
  balloonLabel: {
    fontSize: 12,
    color: '#8B0000',
    fontWeight: '600',
    marginTop: 4,
  },
  // New Hinge-inspired styles
  balloonContainer: {
    width: (width - 60) / 3,
    height: 120,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  celebrationButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  
  // New Figma-inspired styles
  figmaContainer: {
    backgroundColor: COLORS.background,
  },
  figmaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 20,
    color: COLORS.gray600,
  },
  headerFilterIcon: {
    fontSize: 20,
    color: COLORS.primary,
  },
  headerTitle: {
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray600,
    marginTop: 2,
  },
  
  // Profile Card Styles
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  profileCard: {
    position: 'absolute',
    width: width - 40,
    height: height * 0.7,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardImage: {
    flex: 1,
    borderRadius: 20,
  },
  cardImageStyle: {
    borderRadius: 20,
  },
  distanceIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  distanceText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: 'flex-end',
  },
  cardInfo: {
    padding: 20,
  },
  cardName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  cardBio: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
  },
  
  // Swipe Buttons
  swipeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 30,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  rejectButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.orange,
  },
  likeButton: {
    backgroundColor: COLORS.primary,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  superLikeButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  actionButtonIcon: {
    fontSize: 24,
    fontWeight: '700',
  },
  
  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navTabActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  navTabIcon: {
    fontSize: 20,
    color: COLORS.gray400,
  },
  navTabIconActive: {
    color: COLORS.primary,
  },
});
