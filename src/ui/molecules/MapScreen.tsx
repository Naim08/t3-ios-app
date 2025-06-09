import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';

// Attempt to import react-native-maps with error handling
let MapView, Marker, Polyline, PROVIDER_GOOGLE, MapViewDirections;
try {
  const mapsLib = require('react-native-maps');
  MapView = mapsLib.default;
  Marker = mapsLib.Marker;
  Polyline = mapsLib.Polyline;
  PROVIDER_GOOGLE = mapsLib.PROVIDER_GOOGLE;
  
  const directionsLib = require('react-native-maps-directions');
  MapViewDirections = directionsLib.default;
} catch (error) {
  console.error('🗺️ Failed to import React Native Maps:', error);
  // Create fallback components
  MapView = ({ children, style, ...props }: any) => React.createElement(View, { style, ...props }, children);
  Marker = ({ children, ...props }: any) => React.createElement(View, props, children);
  Polyline = ({ ...props }: any) => React.createElement(View, props);
  PROVIDER_GOOGLE = 'google';
  MapViewDirections = ({ ...props }: any) => React.createElement(View, props);
}

import { Typography, Surface, PrimaryButton } from '../atoms';
import { useTheme } from '../../components/ThemeProvider';
import { getActivityIcon, getActivityColor, MapPin } from '../../utils/activityIcons';

interface Location {
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  time?: string;
  duration?: string;
  sequence?: number;
  type?: 'sightseeing' | 'adventure' | 'cultural' | 'entertainment' | 'dining' | 'shopping' | 'relaxation';
}

interface Route {
  origin: Location;
  destination: Location;
  distance: string;
  estimated_travel_time: string;
  transportation_modes: Array<{
    mode: string;
    duration: string;
    description: string;
  }>;
}

interface MapScreenProps {
  locations: Location[];
  routes?: Route[];
  onLocationSelect?: (location: Location) => void;
  showDirections?: boolean;
  mapHeight?: number;
}

const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

console.log('🗺️ MapScreen Debug:', {
  hasApiKey: !!GOOGLE_MAPS_APIKEY,
  apiKeyLength: GOOGLE_MAPS_APIKEY?.length,
  hasMapView: !!MapView && MapView !== View,
  platform: Platform.OS
});

// Use shared utility functions for consistent icon and color logic

export const MapScreen: React.FC<MapScreenProps> = ({
  locations,
  routes = [],
  onLocationSelect,
  showDirections = true,
  mapHeight = 300,
}) => {
  const { theme } = useTheme();
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  // Calculate map region to fit all locations
  const getMapRegion = () => {
    if (locations.length === 0) {
      return {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }

    const latitudes = locations.map(loc => loc.coordinates.latitude);
    const longitudes = locations.map(loc => loc.coordinates.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const deltaLat = (maxLat - minLat) * 1.2; // Add padding
    const deltaLng = (maxLng - minLng) * 1.2;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(deltaLat, 0.01),
      longitudeDelta: Math.max(deltaLng, 0.01),
    };
  };

  useEffect(() => {
    if (mapReady && mapRef.current && locations.length > 1) {
      // Fit map to show all markers
      const coordinates = locations.map(loc => ({
        latitude: loc.coordinates.latitude,
        longitude: loc.coordinates.longitude,
      }));
      
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }, 500);
    }
  }, [mapReady, locations]);

  // Add timeout for map loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (mapLoading) {
        console.warn('🗺️ Map loading timeout - hiding loading overlay');
        setMapLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [mapLoading]);



  const styles = StyleSheet.create({
    container: {
      height: mapHeight === -1 ? '100%' : mapHeight,
      borderRadius: mapHeight === -1 ? 0 : 12,
      overflow: 'hidden',
    },
    map: {
      flex: 1,
    },
    fallbackContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
  });

  // Fallback UI if maps aren't available
  if (!MapView || MapView === View) {
    return (
      <Surface style={styles.container}>
        <View style={styles.fallbackContainer}>
          <Typography variant="bodyMd" style={{ textAlign: 'center', marginBottom: 16 }}>
            🗺️ Map view not available
          </Typography>
          <Typography variant="caption" style={{ textAlign: 'center', opacity: 0.7, marginBottom: 8 }}>
            {!GOOGLE_MAPS_APIKEY ? 'Missing Google Maps API key' : 'react-native-maps not configured'}
          </Typography>
          <Typography variant="caption" style={{ textAlign: 'center', opacity: 0.7 }}>
            {locations.length} locations planned
          </Typography>
          
          {/* Show locations list as fallback */}
          <View style={{ marginTop: 16, maxHeight: 200 }}>
            {locations.slice(0, 3).map((location, index) => (
              <View key={index} style={{ paddingVertical: 4, paddingHorizontal: 8, backgroundColor: theme.colors.background, marginVertical: 2, borderRadius: 6 }}>
                <Typography variant="bodySm" style={{ fontWeight: '600' }}>
                  {location.sequence ? `${location.sequence}. ` : ''}{location.name}
                </Typography>
                <Typography variant="caption" style={{ opacity: 0.7 }}>
                  {location.coordinates.latitude.toFixed(4)}, {location.coordinates.longitude.toFixed(4)}
                </Typography>
              </View>
            ))}
            {locations.length > 3 && (
              <Typography variant="caption" style={{ textAlign: 'center', opacity: 0.7, marginTop: 8 }}>
                +{locations.length - 3} more locations
              </Typography>
            )}
          </View>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'ios' ? undefined : PROVIDER_GOOGLE}
        initialRegion={getMapRegion()}
        onMapReady={() => {
          console.log('🗺️ Map ready!');
          setMapReady(true);
          setMapLoading(false);
        }}
        onError={(error: any) => {
          console.error('🗺️ Map error:', error);
          setMapLoading(false);
        }}
        onLayout={() => {
          console.log('🗺️ Map layout complete');
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Custom Location Markers with Icons */}
        {locations.map((location, index) => {
          const locationColor = getActivityColor(location);
          const locationIcon = getActivityIcon(location, { size: 20, color: '#FFFFFF' });
          
          return (
            <Marker
              key={`${location.name}-${index}`}
              coordinate={location.coordinates}
              title={`${location.sequence || index + 1}. ${location.name}`}
              description={location.description}
              onPress={() => onLocationSelect?.(location)}
            >
              <View
                style={{
                  backgroundColor: locationColor,
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                {locationIcon}
              </View>
            </Marker>
          );
        })}

        {/* Connecting Lines between locations */}
        {locations.length > 1 && (
          <Polyline
            coordinates={locations.map(loc => loc.coordinates)}
            strokeColor={theme.colors.brand['500']}
            strokeWidth={3}
            strokePattern={[1]}
            lineJoin="round"
            lineCap="round"
          />
        )}

        {/* Route Lines */}
        {showDirections && routes.map((route, index) => (
          <MapViewDirections
            key={`route-${index}`}
            origin={route.origin.coordinates}
            destination={route.destination.coordinates}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={3}
            strokeColor={theme.colors.brand['500']}
            optimizeWaypoints={true}
            onError={(errorMessage: any) => {
              console.log('Maps Directions Error:', errorMessage);
            }}
          />
        ))}
      </MapView>
      
      {/* Loading Overlay */}
      {mapLoading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255,255,255,0.9)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <ActivityIndicator size="large" color={theme.colors.brand['500']} />
          <Typography variant="bodySm" style={{ marginTop: 8, color: theme.colors.textSecondary }}>
            Loading map...
          </Typography>
        </View>
      )}

    </Surface>
  );
};

export default MapScreen;