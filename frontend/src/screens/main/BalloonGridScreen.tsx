/**
 * Balloon Grid Screen
 * Main screen showing balloon grid for discovery
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
  Image,
  ImageBackground,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';
import { matchingService, PopType } from '../../services/matchingService';
import { locationService } from '../../services/locationService';

const { width } = Dimensions.get('window');
const BALLOON_SIZE = (width - 48 - 20) / 3; // 3 columns with spacing

interface Balloon {
  userId: string;
  isPopped: boolean;
  popType: PopType | null;
  preview?: {
    photos: string[];
    name: string;
  };
}

const BalloonItem: React.FC<{
  balloon: Balloon;
  onPop: (userId: string, currentType: PopType | null) => void;
}> = ({ balloon, onPop }) => {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  // Floating animation
  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withSpring(5, { damping: 20 }),
        withSpring(-5, { damping: 20 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.9, {}, () => {
      scale.value = withSpring(1);
    });
    
    const nextType = !balloon.popType 
      ? PopType.SINGLE 
      : balloon.popType === PopType.SINGLE 
        ? PopType.DOUBLE 
        : null;
    
    if (nextType) {
      onPop(balloon.userId, balloon.popType);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.balloon,
          animatedStyle,
          {
            backgroundColor: balloon.isPopped 
              ? theme.colors.balloonPopped 
              : theme.colors.balloonDefault,
          },
        ]}
      >
        {balloon.popType === PopType.SINGLE && balloon.preview && (
          <BlurView intensity={80} style={styles.previewContainer}>
            <Text style={styles.previewName}>{balloon.preview.name}</Text>
          </BlurView>
        )}
        
        {balloon.popType === PopType.DOUBLE && (
          <View style={styles.revealedContainer}>
            <Text style={styles.revealedText}>View Profile →</Text>
          </View>
        )}
        
        {!balloon.isPopped && (
          <View style={styles.sparkle}>
            <Text style={styles.sparkleText}>✨</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const BalloonGridScreen: React.FC = () => {
  const theme = useTheme();
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allocation, setAllocation] = useState({ used: 0, max: 10 });

  useEffect(() => {
    loadBalloons();
    updateLocation();
  }, []);

  const updateLocation = async () => {
    const location = await locationService.getCurrentLocation();
    if (location) {
      await locationService.updateLocation(location);
    }
  };

  const loadBalloons = async () => {
    try {
      const [balloonsData, allocationData] = await Promise.all([
        matchingService.getBalloons(),
        matchingService.getAllocation(),
      ]);
      
      setBalloons(balloonsData);
      setAllocation({
        used: allocationData.balloonsUsed,
        max: allocationData.maxBalloons,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load balloons');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handlePop = async (userId: string, currentType: PopType | null) => {
    if (allocation.used >= allocation.max) {
      Alert.alert(
        'Daily Limit Reached',
        'You\'ve used all your balloons for today. Upgrade to premium for unlimited pops!',
        [{ text: 'OK' }]
      );
      return;
    }

    const nextType = !currentType 
      ? PopType.SINGLE 
      : currentType === PopType.SINGLE 
        ? PopType.DOUBLE 
        : null;

    if (!nextType) return;

    try {
      await matchingService.popBalloon(userId, nextType);
      
      // Update local state
      setBalloons(prev => 
        prev.map(b => 
          b.userId === userId 
            ? { ...b, isPopped: true, popType: nextType }
            : b
        )
      );
      
      setAllocation(prev => ({ ...prev, used: prev.used + 1 }));

      if (nextType === PopType.DOUBLE) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Match!', 'Check your matches to see if they popped you back!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pop balloon');
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadBalloons();
  }, []);

  const renderBalloon = ({ item }: { item: Balloon }) => (
    <BalloonItem balloon={item} onPop={handlePop} />
  );

  return (
    <ImageBackground
      source={require('../../../assets/interface.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header with blur effect */}
        <BlurView intensity={20} tint="light" style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../assets/balloond-logo.svg')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Balloon'd</Text>
            </View>
            <View style={styles.allocationContainer}>
              <Text style={styles.allocationText}>
                🎈 {allocation.max - allocation.used} left today
              </Text>
            </View>
          </View>
        </BlurView>

      {/* Balloon Grid */}
      <FlatList
        data={balloons}
        renderItem={renderBalloon}
        keyExtractor={(item) => item.userId}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No balloons available nearby.{'\n'}Try adjusting your location radius!
            </Text>
          </View>
        }
      />
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 0,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  allocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allocationText: {
    fontSize: 14,
  },
  gridContent: {
    padding: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  balloon: {
    width: BALLOON_SIZE,
    height: BALLOON_SIZE * 1.2,
    borderRadius: BALLOON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    padding: 8,
    borderRadius: 8,
  },
  previewName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  revealedContainer: {
    padding: 8,
  },
  revealedText: {
    color: '#8B0000',
    fontSize: 10,
    fontWeight: '600',
  },
  sparkle: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  sparkleText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
