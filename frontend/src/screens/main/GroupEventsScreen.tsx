// Group Events & Speed Dating Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getUpcomingEvents, joinEvent, getEventDetails } from '../../services/eventsService';
import { format } from 'date-fns';

interface Event {
  id: string;
  name: string;
  type: 'speed_dating' | 'mixer' | 'themed_party';
  description: string;
  startTime: Date;
  duration: number;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number;
  isVirtual: boolean;
  locationName?: string;
  host: {
    name: string;
    photo?: string;
  };
  theme?: {
    name: string;
    colors: string[];
  };
}

export const GroupEventsScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'speed_dating' | 'mixer' | 'themed_party'>('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const eventData = await getUpcomingEvents(filter === 'all' ? undefined : filter);
      setEvents(eventData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    try {
      await joinEvent(eventId);
      Alert.alert('Success!', 'You have successfully joined this event');
      loadEvents(); // Refresh
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join event');
    }
  };

  const renderEventCard = ({ item }: { item: Event }) => {
    const spotsLeft = item.maxParticipants - item.currentParticipants;
    const isFull = spotsLeft <= 0;
    
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => {
          setSelectedEvent(item);
          setShowDetailsModal(true);
        }}
        disabled={isFull}
      >
        <LinearGradient
          colors={item.theme?.colors || ['#8B0000', '#DC143C']}
          style={styles.eventGradient}
        >
          <View style={styles.eventHeader}>
            <View style={styles.eventTypeTag}>
              <Text style={styles.eventTypeText}>
                {item.type.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            {item.isVirtual && (
              <View style={styles.virtualTag}>
                <Ionicons name="videocam" size={16} color="white" />
                <Text style={styles.virtualText}>Virtual</Text>
              </View>
            )}
          </View>

          <Text style={styles.eventName}>{item.name}</Text>
          <Text style={styles.eventDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.eventInfo}>
            <View style={styles.eventInfoItem}>
              <Ionicons name="calendar" size={16} color="white" />
              <Text style={styles.eventInfoText}>
                {format(new Date(item.startTime), 'MMM dd, h:mm a')}
              </Text>
            </View>
            
            <View style={styles.eventInfoItem}>
              <Ionicons name="time" size={16} color="white" />
              <Text style={styles.eventInfoText}>{item.duration} mins</Text>
            </View>

            {!item.isVirtual && item.locationName && (
              <View style={styles.eventInfoItem}>
                <Ionicons name="location" size={16} color="white" />
                <Text style={styles.eventInfoText}>{item.locationName}</Text>
              </View>
            )}
          </View>

          <View style={styles.eventFooter}>
            <View style={styles.participantsInfo}>
              <View style={styles.participantAvatars}>
                {[...Array(Math.min(3, item.currentParticipants))].map((_, i) => (
                  <View key={i} style={[styles.participantAvatar, { marginLeft: i * -10 }]}>
                    <Ionicons name="person" size={12} color="#8B0000" />
                  </View>
                ))}
              </View>
              <Text style={styles.participantText}>
                {item.currentParticipants}/{item.maxParticipants} joined
              </Text>
            </View>

            {item.entryFee > 0 && (
              <View style={styles.feeTag}>
                <Text style={styles.feeText}>${item.entryFee}</Text>
              </View>
            )}
          </View>

          {isFull && (
            <View style={styles.fullOverlay}>
              <Text style={styles.fullText}>FULL</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const EventDetailsModal = () => {
    if (!selectedEvent) return null;

    return (
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <Ionicons name="close" size={30} color="#8B0000" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{selectedEvent.name}</Text>
              
              <View style={styles.hostInfo}>
                <Image
                  source={{ uri: selectedEvent.host.photo || 'https://via.placeholder.com/50' }}
                  style={styles.hostAvatar}
                />
                <View>
                  <Text style={styles.hostLabel}>Hosted by</Text>
                  <Text style={styles.hostName}>{selectedEvent.host.name}</Text>
                </View>
              </View>

              <Text style={styles.modalDescription}>{selectedEvent.description}</Text>

              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Event Details</Text>
                
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={20} color="#8B0000" />
                  <Text style={styles.detailText}>
                    {format(new Date(selectedEvent.startTime), 'EEEE, MMMM dd, yyyy')}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="time" size={20} color="#8B0000" />
                  <Text style={styles.detailText}>
                    {format(new Date(selectedEvent.startTime), 'h:mm a')} ({selectedEvent.duration} minutes)
                  </Text>
                </View>

                {selectedEvent.isVirtual ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="videocam" size={20} color="#8B0000" />
                    <Text style={styles.detailText}>Virtual Event - Link provided after joining</Text>
                  </View>
                ) : (
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={20} color="#8B0000" />
                    <Text style={styles.detailText}>{selectedEvent.locationName}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Ionicons name="people" size={20} color="#8B0000" />
                  <Text style={styles.detailText}>
                    {selectedEvent.currentParticipants} / {selectedEvent.maxParticipants} participants
                  </Text>
                </View>

                {selectedEvent.entryFee > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="cash" size={20} color="#8B0000" />
                    <Text style={styles.detailText}>Entry Fee: ${selectedEvent.entryFee}</Text>
                  </View>
                )}
              </View>

              {selectedEvent.type === 'speed_dating' && (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>How Speed Dating Works</Text>
                  <Text style={styles.infoText}>• 3-minute rounds with each participant</Text>
                  <Text style={styles.infoText}>• Express interest after each round</Text>
                  <Text style={styles.infoText}>• Mutual interests become matches</Text>
                  <Text style={styles.infoText}>• Up to 10 potential matches per event</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => {
                  setShowDetailsModal(false);
                  handleJoinEvent(selectedEvent.id);
                }}
              >
                <LinearGradient
                  colors={['#8B0000', '#DC143C']}
                  style={styles.joinButtonGradient}
                >
                  <Text style={styles.joinButtonText}>
                    {selectedEvent.entryFee > 0 ? `Join for $${selectedEvent.entryFee}` : 'Join Event'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const FilterButton = ({ type, label }: { type: any; label: string }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === type && styles.filterButtonActive]}
      onPress={() => setFilter(type)}
    >
      <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFF5F5', '#FFE0E0']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#8B0000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Events</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateEvent')}>
            <Ionicons name="add-circle" size={28} color="#8B0000" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          <FilterButton type="all" label="All Events" />
          <FilterButton type="speed_dating" label="Speed Dating" />
          <FilterButton type="mixer" label="Mixers" />
          <FilterButton type="themed_party" label="Themed Parties" />
        </ScrollView>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B0000" />
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={80} color="#8B0000" />
            <Text style={styles.emptyText}>No upcoming events</Text>
            <Text style={styles.emptySubtext}>Check back later or create your own!</Text>
          </View>
        ) : (
          <FlatList
            data={events}
            renderItem={renderEventCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.eventList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </LinearGradient>

      <EventDetailsModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    maxHeight: 40,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FFB6C1',
  },
  filterButtonActive: {
    backgroundColor: '#8B0000',
  },
  filterText: {
    color: '#8B0000',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: 'white',
  },
  eventList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  eventCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  eventGradient: {
    padding: 20,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  eventTypeTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  eventTypeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  virtualTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  virtualText: {
    color: 'white',
    fontSize: 10,
    marginLeft: 5,
  },
  eventName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  eventDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginBottom: 15,
  },
  eventInfo: {
    marginBottom: 15,
  },
  eventInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  eventInfoText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatars: {
    flexDirection: 'row',
    marginRight: 10,
  },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  participantText: {
    color: 'white',
    fontSize: 12,
  },
  feeTag: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  feeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  fullOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#8B0000',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    maxHeight: '90%',
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B0000',
    marginBottom: 15,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  hostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  hostLabel: {
    color: '#666',
    fontSize: 12,
  },
  hostName: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  modalDescription: {
    color: '#333',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsSection: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B0000',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    color: '#333',
    fontSize: 14,
    marginLeft: 15,
    flex: 1,
  },
  infoText: {
    color: '#333',
    fontSize: 14,
    marginVertical: 5,
    marginLeft: 20,
  },
  joinButton: {
    marginTop: 20,
    marginBottom: 10,
  },
  joinButtonGradient: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  joinButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});