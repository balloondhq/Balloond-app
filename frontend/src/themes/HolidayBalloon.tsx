// Holiday Balloon Component with seasonal themes
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface HolidayBalloonProps {
  theme: 'christmas' | 'valentine' | 'halloween' | 'newyear';
  size?: number;
  onPop?: () => void;
  isPremium?: boolean;
}

export const HolidayBalloon: React.FC<HolidayBalloonProps> = ({
  theme,
  size = 120,
  onPop,
  isPremium = false
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const glowValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();

    if (isPremium) {
      // Glow animation for premium
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
    }
  }, []);

  const getThemeConfig = () => {
    switch (theme) {
      case 'christmas':
        return {
          colors: ['#FF0000', '#00FF00', '#FFFFFF'],
          particles: '❄️',
          gradientStops: [
            { offset: '0%', color: '#FF0000' },
            { offset: '50%', color: '#00FF00' },
            { offset: '100%', color: '#FFFFFF' }
          ]
        };
      case 'valentine':
        return {
          colors: ['#FF69B4', '#FF1493', '#FF0000'],
          particles: '❤️',
          gradientStops: [
            { offset: '0%', color: '#FF69B4' },
            { offset: '50%', color: '#FF1493' },
            { offset: '100%', color: '#FF0000' }
          ]
        };
      case 'halloween':
        return {
          colors: ['#FF8C00', '#000000', '#8B008B'],
          particles: '🦇',
          gradientStops: [
            { offset: '0%', color: '#FF8C00' },
            { offset: '50%', color: '#000000' },
            { offset: '100%', color: '#8B008B' }
          ]
        };
      case 'newyear':
        return {
          colors: ['#FFD700', '#C0C0C0', '#FFFFFF'],
          particles: '🎉',
          gradientStops: [
            { offset: '0%', color: '#FFD700' },
            { offset: '50%', color: '#C0C0C0' },
            { offset: '100%', color: '#FFFFFF' }
          ]
        };
    }
  };

  const config = getThemeConfig();
  
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY },
            { rotate },
          ],
        },
      ]}
    >
      {isPremium && (
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: glowOpacity,
              shadowColor: config.colors[0],
              shadowRadius: 20,
              shadowOpacity: 1,
            },
          ]}
        />
      )}
      
      <Svg width={size} height={size * 1.3} viewBox="0 0 100 130">
        <Defs>
          <RadialGradient id={`gradient_${theme}`} cx="50%" cy="40%" r="50%">
            {config.gradientStops.map((stop, index) => (
              <Stop key={index} offset={stop.offset} stopColor={stop.color} stopOpacity="1" />
            ))}
          </RadialGradient>
          
          {isPremium && (
            <LinearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.5" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          )}
        </Defs>

        {/* Balloon body */}
        <Path
          d="M50 10 C30 10, 10 30, 10 50 C10 80, 30 95, 50 100 C70 95, 90 80, 90 50 C90 30, 70 10, 50 10"
          fill={`url(#gradient_${theme})`}
          stroke={isPremium ? '#FFD700' : config.colors[0]}
          strokeWidth={isPremium ? '2' : '1'}
        />

        {/* Shimmer effect for premium */}
        {isPremium && (
          <Path
            d="M50 10 C30 10, 10 30, 10 50 C10 80, 30 95, 50 100 C70 95, 90 80, 90 50 C90 30, 70 10, 50 10"
            fill="url(#shimmer)"
            opacity="0.3"
          />
        )}

        {/* Balloon string */}
        <Path
          d="M50 100 L50 130"
          stroke={config.colors[2]}
          strokeWidth="1"
          fill="none"
        />

        {/* Holiday decorations */}
        {theme === 'christmas' && (
          <G>
            <Circle cx="35" cy="40" r="3" fill="#FFFFFF" opacity="0.8" />
            <Circle cx="65" cy="45" r="3" fill="#FFFFFF" opacity="0.8" />
            <Circle cx="50" cy="60" r="3" fill="#FFFFFF" opacity="0.8" />
          </G>
        )}

        {theme === 'valentine' && (
          <Path
            d="M50 40 C45 30, 30 30, 30 45 C30 55, 45 70, 50 75 C55 70, 70 55, 70 45 C70 30, 55 30, 50 40"
            fill="#FFFFFF"
            opacity="0.5"
          />
        )}

        {theme === 'halloween' && (
          <G>
            <Path d="M30 45 L35 40 L40 45" fill="none" stroke="#FF8C00" strokeWidth="2" />
            <Path d="M60 45 L65 40 L70 45" fill="none" stroke="#FF8C00" strokeWidth="2" />
            <Path d="M35 65 Q50 75, 65 65" fill="none" stroke="#FF8C00" strokeWidth="2" />
          </G>
        )}

        {theme === 'newyear' && (
          <G>
            {[...Array(5)].map((_, i) => (
              <Circle
                key={i}
                cx={30 + i * 10}
                cy={40 + i * 5}
                r="2"
                fill="#FFD700"
                opacity={0.8 - i * 0.1}
              />
            ))}
          </G>
        )}
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 60,
    shadowOffset: { width: 0, height: 0 },
  },
});