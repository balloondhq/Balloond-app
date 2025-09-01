/**
 * Profile Screen
 * User profile and settings
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  ImageBackground,
  ScrollView,
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header with Profile Photo */}
        <View style={styles.headerSection}>
          <ImageBackground
            source={require('../../../assets/photo.png')}
            style={styles.headerBackground}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
              style={styles.headerOverlay}
            >
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>My Profile</Text>
                <View style={styles.profileImageContainer}>
                  <Image 
                    source={require('../../../assets/photo.png')}
                    style={styles.profileImage}
                  />
                  <TouchableOpacity style={styles.editPhotoButton}>
                    <Text style={styles.editPhotoText}>📷</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.userName}>{user?.name || 'Your Name'}</Text>
                <Text style={styles.userAge}>25, New York</Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Profile Info Cards */}
        <View style={styles.contentSection}>
          <BlurView intensity={20} tint="light" style={styles.infoCard}>
            <Text style={styles.cardTitle}>About Me</Text>
            <Text style={styles.cardContent}>
              Looking for meaningful connections and fun adventures! 🎈
            </Text>
          </BlurView>

          <BlurView intensity={20} tint="light" style={styles.infoCard}>
            <Text style={styles.cardTitle}>Interests</Text>
            <View style={styles.interestsTags}>
              <View style={styles.interestTag}>
                <Text style={styles.tagText}>Travel</Text>
              </View>
              <View style={styles.interestTag}>
                <Text style={styles.tagText}>Photography</Text>
              </View>
              <View style={styles.interestTag}>
                <Text style={styles.tagText}>Music</Text>
              </View>
            </View>
          </BlurView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.primaryButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsButton}>
              <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.logoutButton, { borderColor: '#ff4757' }]}
              onPress={logout}
            >
              <Text style={[styles.logoutText, { color: '#ff4757' }]}>
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  headerSection: {
    height: height * 0.5,
  },
  headerBackground: {
    flex: 1,
    width: '100%',
  },
  headerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    alignSelf: 'flex-start',
    position: 'absolute',
    top: -height * 0.15,
    left: -width * 0.3,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#fff',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#fff',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  editPhotoText: {
    fontSize: 16,
  },
  userName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  userAge: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '500',
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    marginTop: -30,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: 10,
  },
  cardContent: {
    fontSize: 16,
    color: '#636e72',
    lineHeight: 24,
  },
  interestsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestTag: {
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    marginTop: 10,
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
  settingsButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingsButtonText: {
    color: '#2d3436',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logoutText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
