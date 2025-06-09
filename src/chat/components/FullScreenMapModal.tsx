import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  StatusBar,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

import { Typography, IconButton } from '../../ui/atoms';
import { MapScreen } from '../../ui/molecules';
import { useTheme } from '../../components/ThemeProvider';
import { TripPlannerResponse, Location } from '../types';

interface FullScreenMapModalProps {
  visible: boolean;
  data: TripPlannerResponse | null;
  onClose: () => void;
}

export const FullScreenMapModal: React.FC<FullScreenMapModalProps> = ({
  visible,
  data,
  onClose,
}) => {
  const { theme } = useTheme();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  if (!data) return null;

  // Convert destinations to locations with timing
  const locationsWithTiming = data.destinations.map((dest, index) => ({
    ...dest,
    time: dest.time || `${(9 + index).toString().padStart(2, '0')}:00`,
    duration: dest.duration || '1-2 hours',
    sequence: dest.sequence || index + 1,
    category: dest.category || 'attraction',
  }));

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
  };

  const styles = StyleSheet.create({
    modal: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    mapContainer: {
      flex: 1,
    },
    locationInfo: {
      position: 'absolute',
      bottom: 20,
      left: 16,
      right: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    locationName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    locationDetails: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />
      <SafeAreaView style={styles.modal}>
        {/* Header */}
        <View style={styles.header}>
          <Typography style={styles.title}>
            🗺️ Trip Map
          </Typography>
          <IconButton
            icon="close"
            onPress={onClose}
            variant="ghost"
          />
        </View>

        {/* Full Screen Map */}
        <View style={styles.mapContainer}>
          <MapScreen
            locations={locationsWithTiming}
            routes={data.routes}
            onLocationSelect={handleLocationSelect}
            showDirections={true}
            mapHeight={-1} // Use full height
          />
        </View>

        {/* Selected Location Info */}
        {selectedLocation && (
          <View style={styles.locationInfo}>
            <Typography style={styles.locationName}>
              {selectedLocation.sequence ? `${selectedLocation.sequence}. ` : ''}{selectedLocation.name}
            </Typography>
            {selectedLocation.description && (
              <Typography style={styles.locationDetails}>
                {selectedLocation.description}
              </Typography>
            )}
            {selectedLocation.time && (
              <Typography style={styles.locationDetails}>
                ⏰ {selectedLocation.time} {selectedLocation.duration ? `• ${selectedLocation.duration}` : ''}
              </Typography>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default FullScreenMapModal;