/**
 * Main Tab Navigator
 * Bottom tab navigation for main app
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

import { BalloonGridScreen } from '../screens/main/BalloonGridScreen';
import { MatchesScreen } from '../screens/main/MatchesScreen';
import { ChatListScreen } from '../screens/main/ChatListScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();

// Custom tab bar icons using SVG
const TabBarIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const theme = useTheme();
  const color = focused ? theme.colors.primary : theme.colors.textLight;

  const icons: Record<string, JSX.Element> = {
    balloons: (
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2C8.13 2 5 5.13 5 9c0 3.17 2.11 5.84 5 6.71V22h2v-6.29c2.89-.87 5-3.54 5-6.71 0-3.87-3.13-7-7-7z"
          fill={color}
        />
      </Svg>
    ),
    matches: (
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill={color}
        />
      </Svg>
    ),
    chat: (
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Path
          d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
          fill={color}
        />
      </Svg>
    ),
    profile: (
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          fill={color}
        />
      </Svg>
    ),
  };

  return <View style={styles.iconContainer}>{icons[name]}</View>;
};

export const MainTabNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Balloons"
        component={BalloonGridScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="balloons" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="matches" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatListScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="chat" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon name="profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
