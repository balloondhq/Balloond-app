// Gold Premium Balloon Component
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

interface GoldBalloonProps {
  size?: number;
  onPop?: () => void;
  intensity?: 'standard' | 'super';
}

export const GoldBalloon: React.FC<GoldBalloonProps> = ({
  size = 120,
  onPop,
  intensity = 'standard'
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const glowValue = useRef(new Animated.Value(0)).current;
  const shimmerValue = useRef(new Animated.Value(0)).current;
  const particleValues = useRef([...Array(8)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Shimmer animation
    Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Sparkle particles
    particleValues.forEach((value, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(value, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  const handlePop = () => {
    // Pop animation
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: 1.5,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(glowValue, {
        toValue: 2,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onPop?.();
    });
  };

  const shimmerTranslate = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-size, size],
  });

  return (
    <Pressable onPress={handlePop}>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glowContainer,
            {
              opacity: glowValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.8)', 'rgba(255, 223, 0, 0.4)', 'transparent']}
            style={[styles.glow, { width: size * 1.5, height: size * 1.5 }]}
          />
        </Animated.View>

        <Svg width={size} height={size * 1.3} viewBox="0 0 100 130">
          <Defs>
            <RadialGradient id="goldGradient" cx="50%" cy="30%" r="60%">
              <Stop offset="0%" stopColor="#FFEF94" />
              <Stop offset="30%" stopColor="#FFD700" />
              <Stop offset="60%" stopColor="#FFA500" />
              <Stop offset="100%" stopColor="#FF8C00" />
            </RadialGradient>
            
            <RadialGradient id="goldHighlight" cx="40%" cy="30%" r="30%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#FFEF94" stopOpacity="0" />
            </RadialGradient>

            <Filter id="blur">
              <FeGaussianBlur in="SourceGraphic" stdDeviation="2" />
            </Filter>
          </Defs>

          {/* Glow shadow */}
          <Path
            d="M50 15 C30 15, 12 33, 12 52 C12 81, 30 93, 50 98 C70 93, 88 81, 88 52 C88 33, 70 15, 50 15"
            fill="url(#goldGradient)"
            filter="url(#blur)"
            opacity="0.5"
          />

          {/* Main balloon */}
          <Path
            d="M50 10 C30 10, 10 30, 10 50 C10 80, 30 95, 50 100 C70 95, 90 80, 90 50 C90 30, 70 10, 50 10"
            fill="url(#goldGradient)"
            stroke="#FFD700"
            strokeWidth="2"
          />

          {/* Highlight */}
          <Path
            d="M50 10 C30 10, 10 30, 10 50 C10 80, 30 95, 50 100 C70 95, 90 80, 90 50 C90 30, 70 10, 50 10"
            fill="url(#goldHighlight)"
            opacity="0.6"
          />

          {/* Premium crown icon */}
          {intensity === 'super' && (
            <Path
              d="M35 40 L40 30 L45 35 L50 25 L55 35 L60 30 L65 40 L65 50 L35 50 Z"
              fill="#FFFFFF"
              stroke="#FFD700"
              strokeWidth="1"
              opacity="0.8"
            />
          )}

          {/* String */}
          <Path
            d="M50 100 Q52 110, 50 120 Q48 125, 50 130"
            stroke="#FFD700"
            strokeWidth="1.5"
            fill="none"
          />
        </Svg>

        {/* Sparkle particles */}
        {particleValues.map((value, index) => {
          const angle = (index * 45) * Math.PI / 180;
          const radius = 40;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <Animated.View
              key={index}
              style={[
                styles.sparkle,
                {
                  opacity: value,
                  transform: [
                    { translateX: x },
                    { translateY: y },
                    {
                      scale: value.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.sparkleInner} />
            </Animated.View>
          );
        })}

        {/* Shimmer effect */}
        <Animated.View
          style={[
            styles.shimmer,
            {
              transform: [{ translateX: shimmerTranslate }],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255, 255, 255, 0.6)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    borderRadius: 1000,
  },
  sparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
  },
  sparkleInner: {
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 5,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  shimmerGradient: {
    width: 40,
    height: '100%',
  },
});