import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { Typography } from '../ui/atoms';
import { useCredits } from '../hooks/useCredits';

interface CreditsDisplayProps {
  onPress?: () => void;
  compact?: boolean;
}

export const CreditsDisplay: React.FC<CreditsDisplayProps> = ({ 
  onPress, 
  compact = false 
}) => {
  const { theme } = useTheme();
  const { 
    remaining, 
    monthlyRemaining, 
    totalRemaining, 
    isPremiumSubscriber, 
    loading, 
    error 
  } = useCredits();

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${Math.floor(tokens / 1000)}K`;
    }
    return tokens.toString();
  };

  const getDisplayColor = () => {
    if (error) return theme.colors.danger['600'];
    if (totalRemaining < 1000) return theme.colors.accent['600'];
    return theme.colors.brand['600'];
  };

  const content = (
    <View style={[
      styles.container,
      compact && styles.compactContainer,
      {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      }
    ]}>
      {!compact && (
        <Typography
          variant="caption"
          color={theme.colors.textSecondary}
          style={styles.label}
        >
          Credits
        </Typography>
      )}
      
      <View style={styles.valueContainer}>
        <Typography
          variant={compact ? "bodySm" : "bodyMd"}
          weight="semibold"
          color={getDisplayColor()}
        >
          {loading ? '...' : error ? 'Error' : formatTokens(remaining)}
        </Typography>
        
        {!compact && (
          <Typography
            variant="caption"
            color={theme.colors.textSecondary}
          >
            tokens
          </Typography>
        )}
      </View>
      
      {remaining < 1000 && !loading && !error && (
        <Typography
          variant="caption"
          color={theme.colors.accent['600']}
          style={styles.lowBalanceWarning}
        >
          Low balance
        </Typography>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
  },
  compactContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
  },
  label: {
    marginBottom: 2,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  lowBalanceWarning: {
    marginTop: 2,
  },
});
