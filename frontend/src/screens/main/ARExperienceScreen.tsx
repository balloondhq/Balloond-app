// AR Balloon Pop Experience Screen
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as THREE from 'three';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { startARSession, recordARBalloonPop } from '../../services/arService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const ARExperienceScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [balloons, setBalloons] = useState<any[]>([]);
  const [showTutorial, setShowTutorial] = useState(true);
  const navigation = useNavigation();
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<any>();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      // Start AR session
      const session = await startARSession('balloon_pop');
      setSessionId(session.sessionId);
    })();

    return () => {
      // Cleanup
      if (sessionId) {
        endARSession(sessionId);
      }
    };
  }, []);

  const initializeAR = (gl: any) => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Start spawning balloons
    spawnBalloons();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update balloon positions
      updateBalloons();
      
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    animate();
  };

  const spawnBalloons = () => {
    const interval = setInterval(() => {
      if (balloons.length < 10) {
        createBalloon();
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const createBalloon = () => {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xffa07a, 0x98d8c8];
    const material = new THREE.MeshPhongMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      transparent: true,
      opacity: 0.8,
      shininess: 100,
    });
    
    const balloon = new THREE.Mesh(geometry, material);
    
    // Random position
    balloon.position.x = (Math.random() - 0.5) * 8;
    balloon.position.y = -3;
    balloon.position.z = (Math.random() - 0.5) * 4;
    
    // Add to scene
    if (sceneRef.current) {
      sceneRef.current.add(balloon);
      
      const balloonData = {
        mesh: balloon,
        velocity: 0.01 + Math.random() * 0.02,
        wobble: Math.random() * Math.PI,
        wobbleSpeed: 0.02 + Math.random() * 0.02,
      };
      
      setBalloons(prev => [...prev, balloonData]);
    }
  };

  const updateBalloons = () => {
    setBalloons(prev => {
      const updated = prev.map(balloon => {
        // Move balloon up
        balloon.mesh.position.y += balloon.velocity;
        
        // Wobble effect
        balloon.wobble += balloon.wobbleSpeed;
        balloon.mesh.position.x += Math.sin(balloon.wobble) * 0.002;
        
        // Rotation
        balloon.mesh.rotation.y += 0.01;
        
        return balloon;
      });
      
      // Remove balloons that are off screen
      const filtered = updated.filter(balloon => {
        if (balloon.mesh.position.y > 5) {
          if (sceneRef.current) {
            sceneRef.current.remove(balloon.mesh);
          }
          return false;
        }
        return true;
      });
      
      return filtered;
    });
  };

  const handleTap = async (event: any) => {
    if (!rendererRef.current || !cameraRef.current) return;
    
    const { locationX, locationY } = event.nativeEvent;
    
    // Convert tap coordinates to Three.js coordinates
    const mouse = new THREE.Vector2();
    mouse.x = (locationX / screenWidth) * 2 - 1;
    mouse.y = -(locationY / screenHeight) * 2 + 1;
    
    // Raycasting to detect balloon hits
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    
    const meshes = balloons.map(b => b.mesh);
    const intersects = raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const hitBalloon = balloons.find(b => b.mesh === intersects[0].object);
      if (hitBalloon) {
        await popBalloon(hitBalloon);
      }
    }
  };

  const popBalloon = async (balloon: any) => {
    // Remove balloon
    if (sceneRef.current) {
      sceneRef.current.remove(balloon.mesh);
    }
    
    setBalloons(prev => prev.filter(b => b !== balloon));
    
    // Update score
    const points = 10;
    setScore(prev => prev + points);
    
    // Record pop
    if (sessionId) {
      await recordARBalloonPop(sessionId, {
        position: {
          x: balloon.mesh.position.x,
          y: balloon.mesh.position.y,
          z: balloon.mesh.position.z,
        },
        type: 'regular',
        score: points,
      });
    }
    
    // Haptic feedback
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const endSession = () => {
    Alert.alert(
      'End AR Session',
      `Final Score: ${score} points`,
      [
        {
          text: 'Share Score',
          onPress: () => shareScore(),
        },
        {
          text: 'Done',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const shareScore = () => {
    // Implement score sharing
    console.log('Sharing score:', score);
  };

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission is required for AR</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GLView
        style={styles.arView}
        onContextCreate={initializeAR}
        onTouchStart={handleTap}
      />
      
      {/* UI Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>
        </View>
        
        {/* Tutorial Modal */}
        <Modal
          visible={showTutorial}
          transparent
          animationType="fade"
        >
          <View style={styles.tutorialContainer}>
            <LinearGradient
              colors={['rgba(139, 0, 0, 0.9)', 'rgba(220, 20, 60, 0.9)']}
              style={styles.tutorialCard}
            >
              <Text style={styles.tutorialTitle}>AR Balloon Pop!</Text>
              <Text style={styles.tutorialText}>
                Look around to find floating balloons
              </Text>
              <Text style={styles.tutorialText}>
                Tap on them to pop and earn points
              </Text>
              <Text style={styles.tutorialText}>
                Special balloons give bonus points!
              </Text>
              <TouchableOpacity
                style={styles.tutorialButton}
                onPress={() => setShowTutorial(false)}
              >
                <Text style={styles.tutorialButtonText}>Start Playing</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Modal>
        
        {/* Power-ups */}
        <View style={styles.powerUpsContainer}>
          <TouchableOpacity style={styles.powerUpButton}>
            <Ionicons name="flash" size={24} color="#FFD700" />
            <Text style={styles.powerUpText}>2x</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.powerUpButton}>
            <Ionicons name="time" size={24} color="#4ECDC4" />
            <Text style={styles.powerUpText}>+30s</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.powerUpButton}>
            <Ionicons name="rocket" size={24} color="#FF6B6B" />
            <Text style={styles.powerUpText}>Multi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  arView: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scoreLabel: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
  scoreValue: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  tutorialContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  tutorialCard: {
    padding: 30,
    borderRadius: 20,
    marginHorizontal: 30,
    alignItems: 'center',
  },
  tutorialTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  tutorialText: {
    color: 'white',
    fontSize: 16,
    marginVertical: 5,
    textAlign: 'center',
  },
  tutorialButton: {
    backgroundColor: 'white',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  tutorialButtonText: {
    color: '#8B0000',
    fontSize: 16,
    fontWeight: '600',
  },
  powerUpsContainer: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 20,
  },
  powerUpButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  powerUpText: {
    color: 'white',
    fontSize: 10,
    marginTop: 2,
  },
  errorText: {
    color: '#8B0000',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});