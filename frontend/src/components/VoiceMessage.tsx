/**
 * VoiceMessage Component
 * Displays and plays voice messages in chat
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface VoiceMessageProps {
  url: string;
  duration: number;
  isOwn: boolean;
  timestamp: string;
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({
  url,
  duration,
  isOwn,
  timestamp,
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration * 1000);

  useEffect(() => {
    return () => {
      // Clean up sound on unmount
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const loadAndPlaySound = async () => {
    try {
      setIsLoading(true);
      
      // Configure audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading sound:', error);
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setTotalDuration(status.durationMillis || duration * 1000);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const togglePlayback = async () => {
    if (!sound) {
      await loadAndPlaySound();
    } else {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const onSliderValueChange = async (value: number) => {
    if (sound) {
      await sound.setPositionAsync(value);
      setPosition(value);
    }
  };

  return (
    <View
      style={[
        styles.container,
        isOwn ? styles.ownMessage : styles.otherMessage,
      ]}
    >
      <TouchableOpacity
        onPress={togglePlayback}
        disabled={isLoading}
        style={styles.playButton}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isOwn ? '#FFF' : '#8B1A1A'} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color={isOwn ? '#FFF' : '#8B1A1A'}
          />
        )}
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        <Slider
          style={styles.slider}
          value={position}
          minimumValue={0}
          maximumValue={totalDuration}
          onSlidingComplete={onSliderValueChange}
          minimumTrackTintColor={isOwn ? '#FFF' : '#8B1A1A'}
          maximumTrackTintColor={isOwn ? 'rgba(255,255,255,0.3)' : 'rgba(139,26,26,0.3)'}
          thumbTintColor={isOwn ? '#FFF' : '#8B1A1A'}
        />
        
        <View style={styles.timeContainer}>
          <Text style={[styles.time, isOwn ? styles.ownTime : styles.otherTime]}>
            {formatTime(position)} / {formatTime(totalDuration)}
          </Text>
        </View>
      </View>

      <Text style={[styles.timestamp, isOwn ? styles.ownTime : styles.otherTime]}>
        {timestamp}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    marginVertical: 4,
    maxWidth: '80%',
    minWidth: 250,
  },
  ownMessage: {
    backgroundColor: '#8B1A1A',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#F5F5DC',
    alignSelf: 'flex-start',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  waveformContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  time: {
    fontSize: 11,
  },
  ownTime: {
    color: '#FFF',
  },
  otherTime: {
    color: '#8B1A1A',
  },
  timestamp: {
    fontSize: 10,
    position: 'absolute',
    bottom: -18,
    right: 10,
  },
});
