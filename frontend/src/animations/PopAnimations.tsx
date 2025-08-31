// Pop Animations with Confetti, Sparkles, and Glow Trails
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PopAnimationProps {
  type: 'confetti' | 'sparkles' | 'glow_trail' | 'hearts' | 'fireworks';
  onComplete?: () => void;
  position?: { x: number; y: number };
  color?: string;
}

export const PopConfetti: React.FC<PopAnimationProps> = ({
  type = 'confetti',
  onComplete,
  position = { x: screenWidth / 2, y: screenHeight / 2 },
  color = '#FFD700'
}) => {
  const particles = useRef(
    [...Array(20)].map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotation: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    const animations = particles.map((particle, index) => {
      const angle = (index * 18) * Math.PI / 180;
      const velocity = 200 + Math.random() * 200;
      const rotationSpeed = Math.random() * 720 - 360;

      return Animated.parallel([
        Animated.timing(particle.x, {
          toValue: Math.cos(angle) * velocity,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: Math.sin(angle) * velocity - 100,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(particle.rotation, {
          toValue: rotationSpeed,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(particle.scale, {
            toValue: 1.5,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onComplete?.();
    });
  }, []);

  const getParticleColors = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    return colors;
  };

  const particleColors = getParticleColors();

  return (
    <View style={[styles.container, { left: position.x - 100, top: position.y - 100 }]}>
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              opacity: particle.opacity,
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                {
                  rotate: particle.rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
                { scale: particle.scale },
              ],
            },
          ]}
        >
          {type === 'confetti' && (
            <View
              style={[
                styles.confettiPiece,
                { backgroundColor: particleColors[index % particleColors.length] },
              ]}
            />
          )}
          {type === 'sparkles' && (
            <View style={styles.sparkle}>
              <View
                style={[
                  styles.sparkleStar,
                  { backgroundColor: color },
                ]}
              />
            </View>
          )}
          {type === 'hearts' && (
            <Svg width="20" height="20" viewBox="0 0 20 20">
              <Path
                d="M10 17 C8 15, 2 10, 2 6 C2 3, 4 1, 6 1 C8 1, 9 2, 10 3 C11 2, 12 1, 14 1 C16 1, 18 3, 18 6 C18 10, 12 15, 10 17"
                fill={particleColors[index % particleColors.length]}
              />
            </Svg>
          )}
        </Animated.View>
      ))}
    </View>
  );
};

export const GlowTrail: React.FC<{ position: { x: number; y: number } }> = ({ position }) => {
  const trails = useRef(
    [...Array(8)].map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const animations = trails.map((trail, index) => {
      const delay = index * 100;
      const angle = (index * 45) * Math.PI / 180;

      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(trail.scale, {
            toValue: 3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(trail.opacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(trail.x, {
            toValue: Math.cos(angle) * 100,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(trail.y, {
            toValue: Math.sin(angle) * 100,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start();
  }, []);

  return (
    <View style={[styles.container, { left: position.x - 50, top: position.y - 50 }]}>
      {trails.map((trail, index) => (
        <Animated.View
          key={index}
          style={[
            styles.glowTrailCircle,
            {
              opacity: trail.opacity,
              transform: [
                { translateX: trail.x },
                { translateY: trail.y },
                { scale: trail.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

export const FireworksAnimation: React.FC<PopAnimationProps> = ({ position, onComplete }) => {
  const bursts = useRef(
    [...Array(3)].map(() => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(1),
      particles: [...Array(12)].map(() => ({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(1),
      })),
    }))
  ).current;

  useEffect(() => {
    const animations = bursts.map((burst, burstIndex) => {
      const delay = burstIndex * 200;

      const particleAnimations = burst.particles.map((particle, particleIndex) => {
        const angle = (particleIndex * 30) * Math.PI / 180;
        const distance = 80 + Math.random() * 40;

        return Animated.parallel([
          Animated.timing(particle.x, {
            toValue: Math.cos(angle) * distance,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.y, {
            toValue: Math.sin(angle) * distance,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(particle.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ]);
      });

      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(burst.scale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          ...particleAnimations,
          Animated.timing(burst.opacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onComplete?.();
    });
  }, []);

  const burstColors = ['#FFD700', '#FF69B4', '#00CED1'];

  return (
    <View style={[styles.container, { left: position.x - 100, top: position.y - 100 }]}>
      {bursts.map((burst, burstIndex) => (
        <Animated.View
          key={burstIndex}
          style={[
            styles.burstContainer,
            {
              opacity: burst.opacity,
              transform: [{ scale: burst.scale }],
            },
          ]}
        >
          {burst.particles.map((particle, particleIndex) => (
            <Animated.View
              key={particleIndex}
              style={[
                styles.fireworkParticle,
                {
                  backgroundColor: burstColors[burstIndex],
                  opacity: particle.opacity,
                  transform: [
                    { translateX: particle.x },
                    { translateY: particle.y },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
  },
  confettiPiece: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  sparkle: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleStar: {
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
  },
  glowTrailCircle: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.6)',
  },
  burstContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireworkParticle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
});