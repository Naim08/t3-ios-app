// src/chat/components/TripPlannerTool.tsx
import React, { useState } from 'react';

import { View, StyleSheet, TouchableOpacity } from 'react-native';

import { Typography, PrimaryButton } from '../../ui/atoms';
import { TimelineItem } from '../../ui/molecules';
import { useTheme } from '../../components/ThemeProvider';
import { TripPlannerResponse } from '../types';

interface TripPlannerToolProps {
  data: TripPlannerResponse;
  onClose?: () => void;
  compact?: boolean;
  onFullScreenMap?: (data: TripPlannerResponse) => void;
}

export const TripPlannerTool: React.FC<TripPlannerToolProps> = ({ 
  data, 
  onClose, 
  compact = false,
  onFullScreenMap 
}) => {
  const { theme } = useTheme();
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);

  // Define styles early to avoid "used before declaration" error
  const styles = StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
      overflow: 'hidden',
      marginVertical: 0,
    },
    header: {
      paddingHorizontal: 0,
      paddingVertical: 8,
    },
    title: {
      fontSize: compact ? 16 : 18,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    tabContainer: {
      flexDirection: 'row',
      marginTop: 8,
    },
    tab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      backgroundColor: theme.colors.background,
    },
    activeTab: {
      backgroundColor: theme.colors.brand['500'],
    },
    tabText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    activeTabText: {
      color: '#FFFFFF',
    },
    content: {
      minHeight: 200,
    },
    mapContainer: {
      height: compact ? 250 : 350,
    },
    scrollContent: {
      paddingHorizontal: 0,
      paddingVertical: 8,
    },
    summary: {
      padding: 16,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      color: theme.colors.textPrimary,
      fontWeight: '500',
    },
    errorText: {
      color: theme.colors.danger['500'],
      textAlign: 'center',
      padding: 16,
    },
    daySelector: {
      flexDirection: 'row',
      paddingHorizontal: 0,
      paddingVertical: 8,
    },
    dayButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      marginRight: 8,
      backgroundColor: theme.colors.surface,
    },
    activeDayButton: {
      backgroundColor: theme.colors.brand['500'],
    },
    dayButtonText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    activeDayButtonText: {
      color: '#FFFFFF',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    fullScreenButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    fullScreenButtonText: {
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
  });

  // Ensure we have valid data
  if (!data || !data.destinations || data.destinations.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface, padding: 16 }]}>
        <Typography variant="bodyMd" style={[styles.errorText as any, { color: theme.colors.danger['500'] }]}>
          No trip data available
        </Typography>
      </View>
    );
  }

  // Get current day's activities
  const currentDaySchedule = data.daily_itinerary?.[selectedDay];
  const activities = currentDaySchedule?.activities || [];

  // Map activity types to match TimelineItem expectations
  const mapActivityType = (type?: string): 'sightseeing' | 'adventure' | 'cultural' | 'entertainment' | 'dining' | 'shopping' | 'relaxation' => {
    const typeMap: Record<string, 'sightseeing' | 'adventure' | 'cultural' | 'entertainment' | 'dining' | 'shopping' | 'relaxation'> = {
      'sightseeing': 'sightseeing',
      'attraction': 'sightseeing',
      'adventure': 'adventure',
      'cultural': 'cultural',
      'museum': 'cultural',
      'entertainment': 'entertainment',
      'dining': 'dining',
      'restaurant': 'dining',
      'breakfast': 'dining',
      'lunch': 'dining',
      'dinner': 'dining',
      'shopping': 'shopping',
      'relaxation': 'relaxation',
      'spa': 'relaxation',
      'beach': 'relaxation',
    };
    
    const lowerType = type?.toLowerCase() || '';
    return typeMap[lowerType] || 'sightseeing';
  };

  // Convert activities to timeline format matching the TimelineItem interface
  const timelineActivities = activities.map((activity, index) => {
    return {
      name: activity.name,
      type: mapActivityType(activity.type),
      duration: activity.duration || '2 hours',
      description: activity.description || '',
      location: activity.location || data.destinations[index]?.name || '',
      estimated_cost: activity.estimated_cost,
    };
  });

  // Get corresponding locations with timing  
  const locationsWithTiming = data.destinations.map((dest, index) => ({
    ...dest,
    time: (dest as any).time || `${(9 + index).toString().padStart(2, '0')}:00`,
    duration: (dest as any).duration || '1-2 hours',
    sequence: (dest as any).sequence || index + 1,
    category: (dest as any).category || 'attraction',
  }));



  const handleFullScreenMap = () => {
    if (onFullScreenMap) {
      onFullScreenMap(data);
    }
  };

  const handleActivityPress = (activity: any) => {
    console.log(`🔍 TripPlanner: Clicked activity ${activity.name}`);
    // Just toggle selection, no expansion needed since text is always visible
    setSelectedActivity(prev => {
      const newSelection = prev?.name === activity.name ? null : activity;
      console.log(`🔍 TripPlanner: Selected activity changed from "${prev?.name}" to "${newSelection?.name}"`);
      return newSelection;
    });
  };

  const totalCost = data.trip_summary?.total_estimated_cost;
  const displayCost = totalCost 
    ? `${totalCost.currency} ${totalCost.amount}`
    : 'Cost not available';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Typography style={styles.title}>
          🗺️ {data.trip_summary?.duration_days === 1 ? 'Day Trip' : `${data.trip_summary?.duration_days || 1} Day Trip`}
        </Typography>
        <Typography style={styles.subtitle}>
          {data.destinations.length} locations • {displayCost}
        </Typography>


      </View>

      {/* Day Selector (for multi-day trips) */}
      {data.daily_itinerary && data.daily_itinerary.length > 1 && (
        <View style={styles.daySelector}>
          {data.daily_itinerary.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.dayButton, selectedDay === index && styles.activeDayButton]}
              onPress={() => setSelectedDay(index)}
            >
              <Typography style={[styles.dayButtonText as any, selectedDay === index && styles.activeDayButtonText]}>
                Day {day.day}
              </Typography>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      <View style={styles.content} onLayout={(event) => {
        const { height } = event.nativeEvent.layout;
        console.log(`🔍 TripPlanner content height: ${height}px`);
      }}>
        <View style={styles.scrollContent}>
          {timelineActivities.length > 0 ? (
            timelineActivities.map((activity, index) => {
              const time = locationsWithTiming[index]?.time || `${(9 + index).toString().padStart(2, '0')}:00`;
              return (
                <TimelineItem
                  key={`${activity.name}-${index}`}
                  activity={activity}
                  time={time}
                  sequence={index + 1}
                  isLast={index === timelineActivities.length - 1}
                  onPress={handleActivityPress}
                  showCost={true}
                  isSelected={selectedActivity?.name === activity.name}
                />
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Typography style={styles.emptyStateText}>
                No activities planned for this day
              </Typography>
            </View>
          )}
        </View>
      </View>

      {/* Trip Summary */}
      {data.trip_summary && (
        <View style={styles.summary}>
          {data.trip_summary.recommended_duration && (
            <View style={styles.summaryRow}>
              <Typography style={styles.summaryLabel}>Duration:</Typography>
              <Typography style={styles.summaryValue}>
                {data.trip_summary.recommended_duration}
              </Typography>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Typography style={styles.summaryLabel}>Estimated Cost:</Typography>
            <Typography style={styles.summaryValue}>
              {displayCost}
            </Typography>
          </View>
          {data.trip_summary.best_time_to_visit && (
            <View style={styles.summaryRow}>
              <Typography style={styles.summaryLabel}>Best Time:</Typography>
              <Typography style={styles.summaryValue}>
                {data.trip_summary.best_time_to_visit}
              </Typography>
            </View>
          )}
        </View>
      )}

      {/* View Map Button */}
      {onFullScreenMap && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: onClose ? 8 : 16 }}>
          <PrimaryButton
            onPress={handleFullScreenMap}
            title="🗺️ View Map"
            variant="primary"
          />
        </View>
      )}

      {/* Close Button (if onClose provided) */}
      {onClose && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <PrimaryButton
            onPress={onClose}
            title="Close"
            variant="secondary"
          />
        </View>
      )}
    </View>
  );
};

export default TripPlannerTool;