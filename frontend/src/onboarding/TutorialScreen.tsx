import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  animation: 'balloon' | 'swipe' | 'tap' | 'reveal';
  color: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: '1',
    title: 'Welcome to Balloon\'d',
    description: 'Pop into something real! Each balloon holds a potential match waiting to be discovered.',
    animation: 'balloon',
    color: '#8B1538',
  },
  {
    id: '2',
    title: 'Pop to Reveal',
    description: 'Tap any balloon to reveal who\'s inside. Each pop is a chance to connect with someone special.',
    animation: 'tap',
    color: '#D2691E',
  },
  {
    id: '3',
    title: 'Swipe to Connect',
    description: 'Like what you see? Swipe right to match. Not feeling it? Swipe left to pass.',
    animation: 'swipe',
    color: '#8B1538',
  },
  {
    id: '4',
    title: 'Premium Features',
    description: 'Get unlimited pops, see who likes you, and access exclusive balloon themes with Premium.',
    animation: 'reveal',
    color: '#FFD700',
  },
];

export default function TutorialScreen() {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const balloonScale = useRef(new Animated.Value(1)).current;
  const balloonRotate = useRef(new Animated.Value(0)).current;
  const popAnimation = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;

  // Interactive balloon animation
  const animateBalloon = () => {
    Animated.sequence([
      Animated.spring(balloonScale, {
        toValue: 1.2,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(balloonScale, {
        toValue: 0,
        friction: 2,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset after pop
      setTimeout(() => {
        balloonScale.setValue(1);
        Animated.spring(balloonScale, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }).start();
      }, 500);
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        swipeX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 120) {
          Animated.spring(swipeX, {
            toValue: gestureState.dx > 0 ? width : -width,
            useNativeDriver: true,
          }).start(() => {
            swipeX.setValue(0);
          });
        } else {
          Animated.spring(swipeX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollViewRef.current?.scrollTo({
        x: width * nextStep,
        animated: true,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      completeTutorial();
    }
  };

  const handleSkip = () => {
    completeTutorial();
  };

  const completeTutorial = async () => {
    await AsyncStorage.setItem('tutorialCompleted', 'true');
    await AsyncStorage.setItem('onboardingCompleted', 'true');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('MainApp' as never);
  };

  const renderAnimation = (step: TutorialStep) => {
    switch (step.animation) {
      case 'balloon':
        return (
          <TouchableOpacity onPress={animateBalloon} activeOpacity={0.9}>
            <Animated.View
              style={[
                styles.balloonContainer,
                {
                  transform: [
                    { scale: balloonScale },
                    {
                      rotate: balloonRotate.interpolate({
                        inputRange: [-1, 1],
                        outputRange: ['-10deg', '10deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#8B1538', '#D2691E']}
                style={styles.balloon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MotiView
                  from={{ opacity: 0.3 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    type: 'timing',
                    duration: 1000,
                    loop: true,
                  }}
                  style={styles.balloonHighlight}
                />
              </LinearGradient>
              <View style={styles.balloonString} />
            </Animated.View>
          </TouchableOpacity>
        );

      case 'tap':
        return (
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              damping: 15,
            }}
          >
            <TouchableOpacity onPress={animateBalloon} style={styles.tapDemo}>
              <LinearGradient
                colors={['#8B1538', '#D2691E']}
                style={styles.tapBalloon}
              >
                <Ionicons name="hand-left" size={40} color="#FFF" />
              </LinearGradient>
              <MotiView
                from={{ scale: 1, opacity: 1 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{
                  type: 'timing',
                  duration: 1500,
                  loop: true,
                }}
                style={styles.tapRipple}
              />
            </TouchableOpacity>
          </MotiView>
        );

      case 'swipe':
        return (
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.swipeCard,
              {
                transform: [
                  { translateX: swipeX },
                  {
                    rotate: swipeX.interpolate({
                      inputRange: [-200, 0, 200],
                      outputRange: ['-30deg', '0deg', '30deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#F5F5DC', '#FFF']}
              style={styles.card}
            >
              <View style={styles.cardContent}>
                <View style={styles.profilePic} />
                <Text style={styles.cardName}>Sample Match</Text>
                <Text style={styles.cardBio}>Swipe me left or right!</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        );

      case 'reveal':
        return (
          <MotiView
            from={{ scale: 0, rotate: '0deg' }}
            animate={{ scale: 1, rotate: '360deg' }}
            transition={{
              type: 'spring',
              damping: 10,
              delay: 300,
            }}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.premiumBadge}
            >
              <Ionicons name="star" size={60} color="#FFF" />
              <Text style={styles.premiumText}>PREMIUM</Text>
            </LinearGradient>
          </MotiView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F5F5DC', '#FFF8DC']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Progress indicators */}
      <View style={styles.progressContainer}>
        {tutorialSteps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tutorialSteps.map((step, index) => (
          <View key={step.id} style={styles.stepContainer}>
            <AnimatePresence>
              {index === currentStep && (
                <MotiView
                  from={{ opacity: 0, translateY: 50 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: -50 }}
                  transition={{ type: 'spring', damping: 20 }}
                  style={styles.content}
                >
                  <View style={styles.animationArea}>
                    {renderAnimation(step)}
                  </View>
                  
                  <View style={styles.textContent}>
                    <Text style={[styles.title, { color: step.color }]}>
                      {step.title}
                    </Text>
                    <Text style={styles.description}>{step.description}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.nextButton, { backgroundColor: step.color }]}
                    onPress={handleNext}
                  >
                    <Text style={styles.nextButtonText}>
                      {index === tutorialSteps.length - 1 ? "Let's Start!" : 'Next'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </TouchableOpacity>
                </MotiView>
              )}
            </AnimatePresence>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    color: '#8B1538',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    zIndex: 10,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DDD',
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: '#8B1538',
    width: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepContainer: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  animationArea: {
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    marginTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 40,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  balloonContainer: {
    alignItems: 'center',
  },
  balloon: {
    width: 120,
    height: 150,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  balloonHighlight: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 30,
    height: 40,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  balloonString: {
    width: 2,
    height: 50,
    backgroundColor: '#999',
    marginTop: -2,
  },
  tapDemo: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapBalloon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapRipple: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#8B1538',
  },
  swipeCard: {
    width: 200,
    height: 280,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DDD',
    marginBottom: 15,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cardBio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  premiumBadge: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  premiumText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
});
