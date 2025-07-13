import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Typography } from './Typography';
import { useTheme } from '../../components/ThemeProvider';

interface ProgressiveLoaderProps {
  stages: {
    id: string;
    label: string;
    duration?: number;
  }[];
  isLoading: boolean;
  currentStage?: string;
  style?: ViewStyle;
  showLabels?: boolean;
  compact?: boolean;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  stages,
  isLoading,
  currentStage,
  style,
  showLabels = true,
  compact = false,
}) => {
  const { theme } = useTheme();
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());
  const animatedValues = useRef(
    stages.reduce((acc, stage) => {
      acc[stage.id] = new Animated.Value(0);
      return acc;
    }, {} as Record<string, Animated.Value>)
  ).current;

  useEffect(() => {
    if (!isLoading) {
      // Reset all animations
      Object.values(animatedValues).forEach(anim => anim.setValue(0));
      setCompletedStages(new Set());
      return;
    }

    if (currentStage) {
      const currentIndex = stages.findIndex(stage => stage.id === currentStage);
      
      // Mark all previous stages as completed
      const newCompleted = new Set<string>();
      for (let i = 0; i < currentIndex; i++) {
        newCompleted.add(stages[i].id);
      }
      setCompletedStages(newCompleted);

      // Animate current stage
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValues[currentStage], {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValues[currentStage], {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isLoading, currentStage, stages, animatedValues]);

  const renderStage = (stage: { id: string; label: string }, index: number) => {
    const isCompleted = completedStages.has(stage.id);
    const isCurrent = currentStage === stage.id;
    const isUpcoming = !isCompleted && !isCurrent;

    const animation = animatedValues[stage.id];
    const opacity = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

    const scale = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1.1],
    });

    const getStageColor = () => {
      if (isCompleted) return theme.colors.success['500'];
      if (isCurrent) return theme.colors.brand['500'];
      return theme.colors.gray['400'];
    };

    const getStageIcon = () => {
      if (isCompleted) return '✓';
      if (isCurrent) return '●';
      return '○';
    };

    return (
      <View key={stage.id} style={styles.stageContainer}>
        <View style={styles.stageIndicator}>
          <Animated.View
            style={[
              styles.stageCircle,
              {
                backgroundColor: getStageColor(),
                opacity: isCurrent ? opacity : 1,
                transform: isCurrent ? [{ scale }] : [],
              },
            ]}
          >
            <Typography
              variant="caption"
              color="#FFFFFF"
              weight="bold"
              style={styles.stageIcon}
            >
              {getStageIcon()}
            </Typography>
          </Animated.View>
          {index < stages.length - 1 && (
            <View
              style={[
                styles.stageConnector,
                {
                  backgroundColor: isCompleted
                    ? theme.colors.success['500']
                    : theme.colors.gray['300'],
                },
              ]}
            />
          )}
        </View>
        {showLabels && !compact && (
          <Typography
            variant="caption"
            color={
              isCompleted
                ? theme.colors.success['600']
                : isCurrent
                ? theme.colors.brand['600']
                : theme.colors.textSecondary
            }
            weight={isCurrent ? 'semibold' : 'regular'}
            style={styles.stageLabel}
          >
            {stage.label}
          </Typography>
        )}
      </View>
    );
  };

  if (!isLoading) return null;

  return (
    <View style={[styles.container, compact && styles.compactContainer, style]}>
      <View style={[styles.stagesContainer, compact && styles.compactStagesContainer]}>
        {stages.map((stage, index) => renderStage(stage, index))}
      </View>
      {showLabels && currentStage && (
        <Typography
          variant={compact ? "caption" : "bodySm"}
          color={theme.colors.textSecondary}
          style={styles.currentLabel}
          align="center"
        >
          {stages.find(s => s.id === currentStage)?.label}
        </Typography>
      )}
    </View>
  );
};

// Predefined progressive loaders for common scenarios
export const ChatLoadingProgressive: React.FC<{
  isLoading: boolean;
  currentStage?: 'connecting' | 'processing' | 'generating' | 'completing';
}> = ({ isLoading, currentStage }) => (
  <ProgressiveLoader
    isLoading={isLoading}
    currentStage={currentStage}
    stages={[
      { id: 'connecting', label: 'Connecting...' },
      { id: 'processing', label: 'Processing...' },
      { id: 'generating', label: 'Generating...' },
      { id: 'completing', label: 'Completing...' },
    ]}
  />
);

export const ConversationLoadingProgressive: React.FC<{
  isLoading: boolean;
  currentStage?: 'loading' | 'parsing' | 'rendering';
}> = ({ isLoading, currentStage }) => (
  <ProgressiveLoader
    isLoading={isLoading}
    currentStage={currentStage}
    stages={[
      { id: 'loading', label: 'Loading conversation...' },
      { id: 'parsing', label: 'Parsing messages...' },
      { id: 'rendering', label: 'Rendering...' },
    ]}
    compact={true}
  />
);

export const ToolExecutionProgressive: React.FC<{
  isLoading: boolean;
  currentStage?: 'preparing' | 'executing' | 'processing' | 'formatting';
  toolName?: string;
}> = ({ isLoading, currentStage, toolName }) => (
  <ProgressiveLoader
    isLoading={isLoading}
    currentStage={currentStage}
    stages={[
      { id: 'preparing', label: `Preparing ${toolName || 'tool'}...` },
      { id: 'executing', label: 'Executing...' },
      { id: 'processing', label: 'Processing results...' },
      { id: 'formatting', label: 'Formatting response...' },
    ]}
    compact={true}
  />
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  compactContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  stagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  compactStagesContainer: {
    marginBottom: 8,
  },
  stageContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stageCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  stageConnector: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
  },
  stageLabel: {
    marginTop: 8,
    textAlign: 'center',
    minHeight: 16,
  },
  stageIcon: {
    fontSize: 14,
  },
  currentLabel: {
    marginTop: 8,
    fontStyle: 'italic',
  },
});