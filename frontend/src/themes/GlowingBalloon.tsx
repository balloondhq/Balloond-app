// Glowing Ruby Balloon Component - Premium Exclusive
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Pressable, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, Filter, FeGaussianBlur, G, Ellipse } from 'react-native-svg';
import { BlurView } from 'expo-blur';

const { width: screenWidth } = Dimensions.get('window');

interface GlowingBalloonProps {
  size?: number;
  onPop?: () => void;
  glowColor?: 'ruby' | 'sapphire' | 'emerald';
}

export const GlowingBalloon: React.FC<GlowingBalloonProps> = ({
  size = 120,
  onPop,
  glowColor = 'ruby'
}) => {
  const pulseValue = useRef(new Animated.Value(1)).current;
  const glowIntensity = useRef(new Animated.Value(0.5)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const particleAnimations = useRef([...Array(12)].map(() => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    opacity: new Animated.Value(0),
  }))).current;
  const [isPopped, setIsPopped] = useState(false);

  const getColorScheme = () => {
    switch (glowColor) {
      case 'ruby':
        return {
          primary: '#8B0000',
          secondary: '#DC143C',
          tertiary: '#FF0000',
          glow: '#FF6B6B',
          highlight: '#FFB6C1',
        };
      case 'sapphire':
        return {
          primary: '#003366',
          secondary: '#0066CC',
          tertiary: '#3399FF',
          glow: '#66B2FF',
          highlight: '#B3D9FF',
        };
      case 'emerald':
        return {
          primary: '#004d00',
          secondary: '#008000',
          tertiary: '#00CC00',
          glow: '#66FF66',
          highlight: '#B3FFB3',
        };
    }
  };

  const colors = getColorScheme();

  useEffect(() => {
    // Complex pulse animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.08,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowIntensity, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowIntensity, {
            toValue: 0.3,
            duration: 2000,
            useNativeDriver: false,
          }),
        ]),
      ])
    ).start();

    // Slow rotation
    Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();

    // Particle animation
    particleAnimations.forEach((particle, index) => {
      const delay = index * 150;
      const angle = (index * 30) * Math.PI / 180;
      
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(particle.x, {
              toValue: Math.cos(angle) * 60,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(particle.y, {
              toValue: Math.sin(angle) * 60,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(particle.opacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0,
                duration: 1500,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.parallel([
            Animated.timing(particle.x, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(particle.y, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    });
  }, []);

  const handlePop = () => {
    if (isPopped) return;
    
    setIsPopped(true);
    
    // Epic pop animation
    Animated.parallel([
      Animated.timing(pulseValue, {
        toValue: 2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(glowIntensity, {
        toValue: 2,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      Animated.timing(pulseValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onPop?.();
      });
    });
  };

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Pressable onPress={handlePop}>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { scale: pulseValue },
              { rotate },
            ],
          },
        ]}
      >
        {/* Multi-layer glow effect */}
        <Animated.View
          style={[
            styles.outerGlow,
            {
              opacity: glowIntensity.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 0.6],
              }),
              backgroundColor: colors.glow,
            },
          ]}
        />
        
        <Animated.View
          style={[
            styles.middleGlow,
            {
              opacity: glowIntensity.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.8],
              }),
              backgroundColor: colors.secondary,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.innerGlow,
            {
              opacity: glowIntensity.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
              }),
              backgroundColor: colors.primary,
            },
          ]}
        />

        <Svg width={size} height={size * 1.3} viewBox="0 0 100 130">
          <Defs>
            <RadialGradient id="rubyGradient" cx="50%" cy="35%" r="65%">
              <Stop offset="0%" stopColor={colors.highlight} />
              <Stop offset="20%" stopColor={colors.glow} />
              <Stop offset="50%" stopColor={colors.tertiary} />
              <Stop offset="80%" stopColor={colors.secondary} />
              <Stop offset="100%" stopColor={colors.primary} />
            </RadialGradient>

            <RadialGradient id="glowHighlight" cx="45%" cy="25%" r="25%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <Stop offset="50%" stopColor={colors.highlight} stopOpacity="0.5" />
              <Stop offset="100%" stopColor={colors.glow} stopOpacity="0" />
            </RadialGradient>

            <Filter id="glow">
              <FeGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </Filter>
          </Defs>

          {/* Multiple glow layers */}
          <G filter="url(#glow)">
            <Path
              d="M50 20 C32 20, 17 35, 17 52 C17 78, 32 88, 50 93 C68 88, 83 78, 83 52 C83 35, 68 20, 50 20"
              fill={colors.primary}
              opacity="0.3"
            />
          </G>

          <Path
            d="M50 15 C31 15, 14 32, 14 51 C14 79, 31 91, 50 96 C69 91, 86 79, 86 51 C86 32, 69 15, 50 15"
            fill="url(#rubyGradient)"
            stroke={colors.glow}
            strokeWidth="1"
            opacity="0.8"
          />

          {/* Main balloon with inner glow */}
          <Path
            d="M50 10 C30 10, 10 30, 10 50 C10 80, 30 95, 50 100 C70 95, 90 80, 90 50 C90 30, 70 10, 50 10"
            fill="url(#rubyGradient)"
            stroke={colors.tertiary}
            strokeWidth="2"
          />

          {/* Inner highlight */}
          <Ellipse
            cx="50"
            cy="35"
            rx="25"
            ry="20"
            fill="url(#glowHighlight)"
            opacity="0.7"
          />

          {/* Light streaks */}
          <G opacity="0.6">
            <Path
              d="M35 30 Q50 20, 65 35"
              stroke={colors.highlight}
              strokeWidth="1"
              fill="none"
            />
            <Path
              d="M30 45 Q50 35, 70 50"
              stroke={colors.highlight}
              strokeWidth="0.5"
              fill="none"
            />
          </G>

          {/* Premium gem icon in center */}
          <G transform="translate(50, 50)">
            <Path
              d="M0 -10 L-8 0 L0 10 L8 0 Z"
              fill={colors.highlight}
              stroke={colors.primary}
              strokeWidth="1"
              opacity="0.8"
            />
            <Path
              d="M0 -10 L-4 -2 L0 2 L4 -2 Z"
              fill="#FFFFFF"
              opacity="0.6"
            />
          </G>

          {/* Glowing string */}
          <Path
            d="M50 100 Q52 110, 48 120 Q52 125, 50 130"
            stroke={colors.glow}
            strokeWidth="2"
            fill="none"
            opacity="0.8"
          />
        </Svg>

        {/* Ruby dust particles */}
        {particleAnimations.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                opacity: particle.opacity,
                transform: [
                  { translateX: particle.x },
                  { translateY: particle.y },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.particleInner,
                {
                  backgroundColor: colors.glow,
                  shadowColor: colors.primary,
                },
              ]}
            />
          </Animated.View>
        ))}

        {/* Energy trails */}
        <Animated.View
          style={[
            styles.energyTrail,
            {
              opacity: glowIntensity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
            },
          ]}
        >
          <Svg width={size * 1.5} height={size * 1.5} style={styles.energySvg}>
            <Circle
              cx={size * 0.75}
              cy={size * 0.75}
              r={size * 0.6}
              stroke={colors.glow}
              strokeWidth="1"
              fill="none"
              opacity="0.5"
              strokeDasharray="5 10"
            />
            <Circle
              cx={size * 0.75}
              cy={size * 0.75}
              r={size * 0.5}
              stroke={colors.tertiary}
              strokeWidth="0.5"
              fill="none"
              opacity="0.3"
              strokeDasharray="3 7"
            />
          </Svg>
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
  outerGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.3,
  },
  middleGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.5,
  },
  innerGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.7,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
  },
  particleInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 8,
  },
  energyTrail: {
    position: 'absolute',
  },
  energySvg: {
    position: 'absolute',
    left: '-25%',
    top: '-25%',
  },
});