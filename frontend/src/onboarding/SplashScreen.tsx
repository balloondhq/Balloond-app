import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { SvgXml } from 'react-native-svg';
import * as SplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

// Import the logo
const logoSvg = `
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="balloonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B1538;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#D2691E;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Balloon shape -->
  <ellipse cx="100" cy="80" rx="50" ry="65" fill="url(#balloonGradient)" filter="url(#glow)"/>
  
  <!-- Highlight -->
  <ellipse cx="85" cy="60" rx="15" ry="20" fill="rgba(255,255,255,0.3)"/>
  
  <!-- String -->
  <line x1="100" y1="145" x2="100" y2="190" stroke="#666" stroke-width="2"/>
  
  <!-- Text -->
  <text x="100" y="85" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">B</text>
</svg>
`;

interface Props {
  onAnimationComplete: () => void;
}

export default function SplashScreenComponent({ onAnimationComplete }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Keep the native splash screen visible while we prepare
    SplashScreen.preventAutoHideAsync();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -10,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 10,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      ),
    ]).start();

    // Hide native splash and trigger callback after animation
    setTimeout(async () => {
      await SplashScreen.hideAsync();
      
      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onAnimationComplete();
      });
    }, 3000);
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#F5F5DC', '#FFF8DC', '#FFF']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <MotiView
          key={i}
          from={{
            opacity: 0,
            translateY: height,
            translateX: Math.random() * width,
          }}
          animate={{
            opacity: [0, 1, 0],
            translateY: -100,
          }}
          transition={{
            type: 'timing',
            duration: 3000 + i * 500,
            delay: i * 300,
            loop: true,
          }}
          style={[
            styles.particle,
            {
              left: Math.random() * width,
              backgroundColor: i % 2 === 0 ? '#8B1538' : '#D2691E',
            },
          ]}
        />
      ))}

      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [
              { scale: scaleAnim },
              { rotate: spin },
              { translateY: floatAnim },
            ],
          },
        ]}
      >
        <SvgXml xml={logoSvg} width={200} height={200} />
      </Animated.View>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: 1000 }}
        style={styles.textContainer}
      >
        <Animated.Text style={styles.title}>Balloon'd</Animated.Text>
        <Animated.Text style={styles.tagline}>Pop into Something Real</Animated.Text>
      </MotiView>

      {/* Shimmer effect */}
      <MotiView
        from={{ translateX: -width }}
        animate={{ translateX: width * 2 }}
        transition={{
          type: 'timing',
          duration: 2000,
          loop: true,
          delay: 1000,
        }}
        style={styles.shimmer}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#8B1538',
    marginBottom: 10,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 18,
    color: '#D2691E',
    fontStyle: 'italic',
  },
  particle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  shimmer: {
    position: 'absolute',
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ skewX: '-20deg' }],
  },
});
