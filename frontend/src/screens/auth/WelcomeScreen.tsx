/**
 * Welcome Screen
 * Initial landing screen for unauthenticated users
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export const WelcomeScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  return (
    <LinearGradient
      colors={[theme.colors.background, '#FFF']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo placeholder */}
          <View style={styles.logoContainer}>
            <View style={[styles.balloon, { backgroundColor: theme.colors.primary }]} />
            <Text style={[styles.appName, { color: theme.colors.primary }]}>
              Balloon'd
            </Text>
            <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
              Pop to reveal, double pop to connect
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('Signup')}
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.dividerText, { color: theme.colors.textLight }]}>
                or continue with
              </Text>
              <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
            </View>

            {/* OAuth buttons */}
            <View style={styles.oauthContainer}>
              <TouchableOpacity
                style={[styles.oauthButton, { backgroundColor: '#fff' }]}
              >
                <Text style={styles.oauthText}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.oauthButton, { backgroundColor: '#000' }]}
              >
                <Text style={[styles.oauthText, { color: '#fff' }]}>🍎</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.terms, { color: theme.colors.textLight }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: height * 0.15,
  },
  balloon: {
    width: 80,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 40,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 24,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  oauthContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  oauthButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  oauthText: {
    fontSize: 24,
    fontWeight: '600',
  },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
});
