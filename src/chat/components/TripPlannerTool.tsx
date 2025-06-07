import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useTheme } from '../../components/ThemeProvider';
import { TripPlannerResponse, Location, FlightOption, Accommodation, DaySchedule } from '../types';

interface TripPlannerToolProps {
  tripPlan: TripPlannerResponse;
}

const { width } = Dimensions.get('window');

const TripPlannerTool: React.FC<TripPlannerToolProps> = ({ tripPlan }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'itinerary' | 'flights' | 'accommodations'
  >('overview');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderTabButton = (
    tab: 'overview' | 'itinerary' | 'flights' | 'accommodations',
    label: string,
  ) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tabButton,
          { borderBottomColor: theme.colors.border },
          isActive && { borderBottomColor: theme.colors.brand['500'] },
        ]}
        onPress={() => setActiveTab(tab)}
      >
        <Text
          style={[
            styles.tabButtonText,
            { color: theme.colors.textSecondary },
            isActive && { color: theme.colors.brand['500'] },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const DestinationCard: React.FC<{ destination: Location }> = ({ destination }) => {
    return (
      <View
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
          {destination.name}
        </Text>
        <Text
          style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}
        >
          {destination.country}
        </Text>
        {destination.description && (
          <Text
            style={[styles.cardDescription, { color: theme.colors.textSecondary }]}
          >
            {destination.description}
          </Text>
        )}
      </View>
    );
  };

  const FlightCard: React.FC<{ flight: FlightOption }> = ({ flight }) => {
    return (
      <View
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.flightHeader}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            {flight.airline}
          </Text>
          <Text style={[styles.priceText, { color: theme.colors.brand['500'] }]}>
            {formatCurrency(flight.price.amount)}
          </Text>
        </View>
        <View style={styles.flightRoute}>
          <View style={styles.flightSegment}>
            <Text style={[styles.airportCode, { color: theme.colors.textPrimary }]}>
              {flight.departure.airport}
            </Text>
            <Text
              style={[styles.timeText, { color: theme.colors.textSecondary }]}
            >
              {formatTime(flight.departure.time)}
            </Text>
          </View>
          <View style={styles.flightArrow}>
            <Text
              style={[
                styles.flightArrowText,
                { color: theme.colors.textSecondary },
              ]}
            >
              →
            </Text>
            <Text
              style={[styles.durationText, { color: theme.colors.textSecondary }]}
            >
              {flight.duration}
            </Text>
          </View>
          <View style={styles.flightSegment}>
            <Text style={[styles.airportCode, { color: theme.colors.textPrimary }]}>
              {flight.arrival.airport}
            </Text>
            <Text
              style={[styles.timeText, { color: theme.colors.textSecondary }]}
            >
              {formatTime(flight.arrival.time)}
            </Text>
          </View>
        </View>
        <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
          {formatDate(flight.departure.date)}
        </Text>
      </View>
    );
  };

  const AccommodationCard: React.FC<{ accommodation: Accommodation }> = ({ 
    accommodation 
  }) => {
    return (
      <View
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.accommodationHeader}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            {accommodation.name}
          </Text>
          <Text style={[styles.priceText, { color: theme.colors.brand['500'] }]}>
            {formatCurrency(accommodation.price_per_night.amount)}/night
          </Text>
        </View>
        <Text
          style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}
        >
          {accommodation.type} • {accommodation.rating}⭐
        </Text>
        <Text
          style={[styles.cardDescription, { color: theme.colors.textSecondary }]}
        >
          {accommodation.description}
        </Text>
        <Text
          style={[styles.cardDescription, { color: theme.colors.textSecondary }]}
        >
          Location: {accommodation.location}
        </Text>
      </View>
    );
  };

  const DayCard: React.FC<{ day: DaySchedule }> = ({ day }) => {
    return (
      <View
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
          Day {day.day}: {formatDate(day.date)}
        </Text>
        <Text
          style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}
        >
          {day.location}
        </Text>
        {day.weather && (
          <Text
            style={[styles.weatherText, { color: theme.colors.textSecondary }]}
          >
            Weather: {day.weather.condition}, High: {day.weather.temperature.high}°{day.weather.temperature.unit}
          </Text>
        )}
        {day.activities.map((activity, index) => (
          <View key={index} style={styles.activityContainer}>
            <View style={styles.activityContent}>
              <Text style={[styles.activityTitle, { color: theme.colors.textPrimary }]}>
                {activity.name}
              </Text>
              <Text
                style={[
                  styles.activityDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {activity.description}
              </Text>
              <Text
                style={[
                  styles.activityDuration,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Duration: {activity.duration}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text style={[styles.summaryTitle, { color: theme.colors.textPrimary }]}>
                Trip to {tripPlan.destinations.map(d => d.name).join(', ')}
              </Text>
              <Text
                style={[
                  styles.summaryDuration,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {tripPlan.trip_summary.duration_days} days
              </Text>
              <Text
                style={[styles.summaryBudget, { color: theme.colors.brand['500'] }]}
              >
                Total Budget: {formatCurrency(tripPlan.trip_summary.total_estimated_cost.amount)}
              </Text>
            </View>

            {tripPlan.destinations.length > 0 && (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  region={{
                    latitude: tripPlan.destinations[0].coordinates.latitude,
                    longitude: tripPlan.destinations[0].coordinates.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                  showsUserLocation={false}
                  showsMyLocationButton={false}
                >
                  {tripPlan.destinations.map((destination, index) => (
                    <Marker
                      key={index}
                      coordinate={destination.coordinates}
                      title={destination.name}
                      description={destination.country}
                    />
                  ))}
                  {tripPlan.destinations.length > 1 && (
                    <Polyline
                      coordinates={tripPlan.destinations.map(d => d.coordinates)}
                      strokeColor={theme.colors.brand['500']}
                      strokeWidth={2}
                    />
                  )}
                </MapView>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Destinations
            </Text>
            {tripPlan.destinations.map((destination, index) => (
              <DestinationCard key={index} destination={destination} />
            ))}
          </View>
        );

      case 'itinerary':
        return (
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Daily Itinerary
            </Text>
            {tripPlan.daily_itinerary?.map((day, index) => (
              <DayCard key={index} day={day} />
            )) || (
              <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
                No itinerary available
              </Text>
            )}
          </View>
        );

      case 'flights':
        return (
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Flight Information
            </Text>
            {tripPlan.flights?.outbound.map((flight, index) => (
              <FlightCard key={`outbound-${index}`} flight={flight} />
            )) || null}
            {tripPlan.flights?.return?.map((flight, index) => (
              <FlightCard key={`return-${index}`} flight={flight} />
            )) || null}
            {tripPlan.flights?.internal?.map((flight, index) => (
              <FlightCard key={`internal-${index}`} flight={flight} />
            )) || null}
            {!tripPlan.flights && (
              <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
                No flight information available
              </Text>
            )}
          </View>
        );

      case 'accommodations':
        return (
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Accommodations
            </Text>
            {tripPlan.accommodations?.map((accommodation, index) => (
              <AccommodationCard key={index} accommodation={accommodation} />
            )) || (
              <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
                No accommodation information available
              </Text>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.tabContainer,
          { borderBottomColor: theme.colors.border },
        ]}
      >
        {renderTabButton('overview', 'Overview')}
        {renderTabButton('itinerary', 'Itinerary')}
        {renderTabButton('flights', 'Flights')}
        {renderTabButton('accommodations', 'Hotels')}
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 600,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingTop: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryDuration: {
    fontSize: 14,
    marginBottom: 8,
  },
  summaryBudget: {
    fontSize: 18,
    fontWeight: '600',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  map: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  weatherText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  flightRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  flightSegment: {
    alignItems: 'center',
    flex: 1,
  },
  flightArrow: {
    alignItems: 'center',
    flex: 1,
  },
  airportCode: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
  },
  flightArrowText: {
    fontSize: 20,
    marginBottom: 2,
  },
  durationText: {
    fontSize: 10,
  },
  dateText: {
    fontSize: 12,
    marginTop: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  accommodationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingTop: 8,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  activityDuration: {
    fontSize: 10,
    fontStyle: 'italic',
  },
});

export default TripPlannerTool;
