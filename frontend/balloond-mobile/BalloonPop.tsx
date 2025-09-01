// BalloonPop.tsx - Hinge-inspired Clean Balloon Pop Component for Balloon'd Dating App
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Hinge-inspired color palette - clean, modern, sophisticated
export const HINGE_COLORS = {
  primary: '#1A1A1A',      // Hinge Black - sophisticated, serious
  white: '#FFFFFF',        // Pure white
  gray: '#666666',         // Dove gray for subtle elements
  accent: '#8B5FBF',       // Hinge purple - for special moments
  success: '#34C759',      // Clean green for positive actions
  warning: '#FF9500',      // Warm orange for attention
  subtle: '#F2F2F7',      // Very light background
};

export interface BalloonPopProps {
  // Balloon appearance
  size?: number;
  
  // Behavior
  autoFloat?: boolean;
  floatDuration?: number;
  onPop?: () => void;
  onFloatComplete?: () => void;
  
  // Sound & haptics
  enableSound?: boolean;
  enableHaptics?: boolean;
  
  // Dating app specific - clean, no emoji clutter
  type?: 'like' | 'match' | 'rose' | 'interaction';
  
  // Position (for floating balloons)
  initialX?: number;
  initialY?: number;
  targetX?: number;
  targetY?: number;
}

// Clean, Hinge-inspired balloon types - minimal and sophisticated
const BALLOON_TYPES = {
  like: {
    color: HINGE_COLORS.success,
    size: 72,
    opacity: 0.9,
  },
  rose: {
    color: HINGE_COLORS.accent,
    size: 84,
    opacity: 0.95,
  },
  match: {
    color: HINGE_COLORS.primary,
    size: 96,
    opacity: 1.0,
  },
  interaction: {
    color: HINGE_COLORS.gray,
    size: 64,
    opacity: 0.8,
  },
};

export const BalloonPop: React.FC<BalloonPopProps> = ({
  size,
  autoFloat = false,
  floatDuration = 3000,
  onPop,
  onFloatComplete,
  enableSound = true,
  enableHaptics = true,
  type = 'like',
  initialX = SCREEN_WIDTH / 2,
  initialY = SCREEN_HEIGHT - 100,
  targetX = SCREEN_WIDTH / 2,
  targetY = 50,
}) => {
  const [isPopped, setIsPopped] = useState(false);
  const [isFloating, setIsFloating] = useState(autoFloat);
  
  // Animation refs
  const scaleAnim = useRef(new Animated.Value(0.1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const positionX = useRef(new Animated.Value(initialX)).current;
  const positionY = useRef(new Animated.Value(initialY)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  
  // Get balloon config - clean, no emoji clutter
  const balloonConfig = BALLOON_TYPES[type];
  const finalColor = balloonConfig.color;
  const finalSize = size || balloonConfig.size;
  const balloonOpacity = balloonConfig.opacity;
  
  useEffect(() => {
    // Entrance animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
      // Gentle bounce
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 5,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
    
    // Floating animation if enabled
    if (autoFloat) {
      startFloatingAnimation();
    }
  }, []);
  
  const startFloatingAnimation = () => {
    setIsFloating(true);
    
    Animated.parallel([
      // Float upward
      Animated.timing(positionY, {
        toValue: targetY,
        duration: floatDuration,
        useNativeDriver: true,
      }),
      // Gentle horizontal sway
      Animated.timing(positionX, {
        toValue: targetX,
        duration: floatDuration,
        useNativeDriver: true,
      }),
      // Gentle rotation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ),
    ]).start(() => {
      onFloatComplete?.();
    });
  };
  
  const handlePop = async () => {
    if (isPopped) return;
    
    // Subtle haptic feedback - Hinge-like restraint
    if (enableHaptics && Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('Haptic error:', error);
      }
    }
    
    // Elegant pop animation - smooth and sophisticated
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.2, // Subtle scale, not overdone
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsPopped(true);
      onPop?.();
    });
  };
  
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-1deg', '1deg'], // Minimal rotation for sophistication
  });
  
  if (isPopped) return null;
  
  // Simple balloon shape using View instead of SVG for simplicity
  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: autoFloat ? positionX : 0 },
            { translateY: autoFloat ? positionY : bounceAnim },
            { scale: scaleAnim },
            { rotate: rotation },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePop}
        style={[
          styles.balloon,
          {
            width: finalSize,
            height: finalSize,
            backgroundColor: finalColor,
            opacity: balloonOpacity,
          }
        ]}
        activeOpacity={0.9} // Subtle press feedback
      >
        {/* Simple string */}
        <View style={[styles.string, { backgroundColor: finalColor }]} />
      </TouchableOpacity>
    </Animated.View>
  );
};

//  Clean Celebration Component - Hinge-inspired minimalism
export const CleanBalloonCelebration: React.FC<{
  count?: number;
  duration?: number;
  onComplete?: () => void;
  celebrationType?: 'match' | 'rose_sent' | 'date_confirmed';
}> = ({ count = 6, duration = 4000, onComplete, celebrationType = 'match' }) => {
  const [balloons, setBalloons] = useState<Array<{ 
    id: number; 
    type: keyof typeof BALLOON_TYPES; 
    x: number; 
    delay: number;
    size: number;
  }>>([]);
  
  useEffect(() => {
    // Generate sophisticated balloon pattern - not random chaos
    const spacing = SCREEN_WIDTH / (count + 1);
    const newBalloons = Array.from({ length: count }, (_, i) => {
      const baseType = getBalloonTypeForCelebration(celebrationType);
      return {
        id: i,
        type: i % 2 === 0 ? baseType : 'interaction', // Alternating pattern
        x: spacing * (i + 1) - 40, // Even distribution
        delay: i * 200, // Staggered, not random
        size: celebrationType === 'match' ? 80 + (i % 2) * 10 : 70, // Slight variation
      };
    });
    setBalloons(newBalloons);
    
    setTimeout(() => {
      onComplete?.();
    }, duration);
  }, [count, duration, onComplete, celebrationType]);
  
  const getBalloonTypeForCelebration = (type: string): keyof typeof BALLOON_TYPES => {
    switch (type) {
      case 'match': return 'match';
      case 'rose_sent': return 'rose';
      default: return 'like';
    }
  };
  
  return (
    <View style={styles.celebrationContainer}>
      {balloons.map((balloon) => (
        <Animated.View
          key={balloon.id}
          style={[
            styles.celebrationBalloon, 
            { 
              left: balloon.x,
              marginTop: balloon.delay * 0.1, // Subtle stagger
            }
          ]}
        >
          <BalloonPop
            type={balloon.type}
            size={balloon.size}
            autoFloat={true}
            floatDuration={duration - balloon.delay}
            initialY={SCREEN_HEIGHT + 30}
            targetY={-50}
            enableSound={balloon.id === 0} // Only first makes sound - clean
          />
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  balloon: {
    borderRadius: 100, // Circular balloon
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    // Hinge-like touch target - accessible but not obtrusive
    minWidth: 44,
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  string: {
    position: 'absolute',
    bottom: -20,
    left: '50%',
    width: 2,
    height: 20,
    marginLeft: -1,
  },
  celebrationContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
    backgroundColor: 'transparent',
  },
  celebrationBalloon: {
    position: 'absolute',
    bottom: -30,
  },
});
