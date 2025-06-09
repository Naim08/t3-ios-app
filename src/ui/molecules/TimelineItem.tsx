import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { Typography } from '../atoms';
import { useTheme } from '../../components/ThemeProvider';
import { getActivityIcon, getActivityColor, Clock, DollarSign, MapPin } from '../../utils/activityIcons';

interface Activity {
  name: string;
  type: 'sightseeing' | 'adventure' | 'cultural' | 'entertainment' | 'dining' | 'shopping' | 'relaxation';
  duration: string;
  description: string;
  location: string;
  estimated_cost?: {
    amount: number;
    currency: string;
  };
}

interface TimelineItemProps {
  activity: Activity;
  time?: string;
  sequence?: number;
  isLast?: boolean;
  onPress?: (activity: Activity) => void;
  showCost?: boolean;
  isSelected?: boolean;
}

// Styles for positioning that can't be done with Tailwind
const styles = StyleSheet.create({
  timelineLine: {
    position: 'absolute',
    top: 42,
    left: '50%',
    height: 40,
    marginLeft: -1,
  },
});

export const TimelineItem: React.FC<TimelineItemProps> = ({
  activity,
  time,
  isLast = false,
  onPress,
  showCost = true,
  isSelected = false,
}) => {
  const { theme } = useTheme();

  // Use shared utility functions for icon and color logic

  const activityColor = getActivityColor(activity);
  const activityIcon = getActivityIcon(activity, { size: 16, color: '#FFFFFF' });

  const CardContent = () => (
    <View className={`
      ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-transparent border-l-4 border-transparent'}
      rounded-xl p-4 shadow-sm
    `}>
      {/* Header with name and activity type */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Typography 
            className="text-lg font-semibold text-gray-900 leading-tight"
            numberOfLines={2}
          >
            {activity.name}
          </Typography>
        </View>
        
        {/* Activity type badge with icon */}
        <View 
          className="px-3 py-1.5 rounded-full flex-row items-center ml-3"
          style={{ backgroundColor: activityColor + '20' }}
        >
          <View 
            className="w-6 h-6 rounded-full items-center justify-center mr-2"
            style={{ backgroundColor: activityColor }}
          >
            {activityIcon}
          </View>
          <Typography 
            className="text-xs font-medium capitalize"
            style={{ color: activityColor }}
          >
            {activity.type}
          </Typography>
        </View>
      </View>

      {/* Duration and Location */}
      <View className="flex-row items-center mb-3 flex-wrap">
        <View className="flex-row items-center mr-4">
          <Clock size={14} color={theme.colors.textSecondary} />
          <Typography className="text-sm text-gray-600 ml-1.5 font-medium">
            {activity.duration}
          </Typography>
        </View>
        
        {activity.location && (
          <View className="flex-row items-center flex-1">
            <MapPin size={14} color={theme.colors.textSecondary} />
            <Typography className="text-sm text-gray-600 ml-1.5 flex-1" numberOfLines={1}>
              {activity.location}
            </Typography>
          </View>
        )}
      </View>

      {/* Description */}
      {activity.description && (
        <Typography className="text-sm text-gray-700 leading-relaxed mb-3">
          {activity.description}
        </Typography>
      )}

      {/* Cost */}
      {showCost && activity.estimated_cost && (
        <View className="flex-row items-center">
          <DollarSign size={14} color={activityColor} />
          <Typography 
            className="text-sm font-semibold ml-1"
            style={{ color: activityColor }}
          >
            {activity.estimated_cost.currency} {activity.estimated_cost.amount}
          </Typography>
        </View>
      )}
    </View>
  );

  return (
    <View className={`flex-row ${isLast ? 'mb-0' : 'mb-6'}`}>
      {/* Timeline Column */}
      <View className="w-16 items-center mr-4 relative">
        {/* Time */}
        {time && (
          <Typography className="text-xs font-bold text-gray-500 mb-2 text-center min-w-full">
            {time}
          </Typography>
        )}
        
        {/* Timeline dot with icon */}
        <View 
          className="w-8 h-8 rounded-full items-center justify-center border-4 border-white shadow-lg z-10"
          style={{ backgroundColor: activityColor }}
        >
          {getActivityIcon(activity, { size: 14, color: '#FFFFFF' })}
        </View>
        
                 {/* Timeline line */}
         {!isLast && (
           <View 
             className="absolute w-0.5 bg-gray-200"
             style={styles.timelineLine}
           />
         )}
      </View>

      {/* Content Column */}
      <View className="flex-1 pt-2">
        {onPress ? (
          <TouchableOpacity 
            onPress={() => onPress(activity)}
            activeOpacity={0.7}
            className="transform active:scale-[0.98]"
          >
            <CardContent />
          </TouchableOpacity>
        ) : (
          <CardContent />
        )}
      </View>
    </View>
  );
};

export default TimelineItem;