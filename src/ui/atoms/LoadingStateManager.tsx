import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Typography } from './Typography';
import { AILoadingAnimation } from './AILoadingAnimation';
import { SkeletonLoader, SkeletonText, SkeletonCard, SkeletonMessageBubble, SkeletonConversationItem } from './SkeletonLoader';
import { useTheme } from '../../components/ThemeProvider';

export type LoadingType = 
  | 'spinner'           // Standard AI loading animation
  | 'skeleton-text'     // Text skeleton loader
  | 'skeleton-card'     // Card skeleton loader
  | 'skeleton-message'  // Message bubble skeleton
  | 'skeleton-conversation' // Conversation list skeleton
  | 'skeleton-custom'   // Custom skeleton with render prop
  | 'overlay';          // Full screen overlay with spinner

interface LoadingStateManagerProps {
  isLoading: boolean;
  type?: LoadingType;
  children?: React.ReactNode;
  
  // Loading customization
  loadingText?: string;
  size?: 'sm' | 'md' | 'lg';
  overlay?: boolean;
  
  // Skeleton specific props
  skeletonCount?: number;
  skeletonHeight?: number;
  
  // Custom skeleton renderer
  renderSkeleton?: () => React.ReactNode;
  
  // Style props
  style?: ViewStyle;
  loadingStyle?: ViewStyle;
}

export const LoadingStateManager: React.FC<LoadingStateManagerProps> = ({
  isLoading,
  type = 'spinner',
  children,
  loadingText,
  size = 'md',
  overlay = false,
  skeletonCount = 3,
  skeletonHeight = 120,
  renderSkeleton,
  style,
  loadingStyle,
}) => {
  const { theme } = useTheme();

  const getSizeValue = (size: string) => {
    switch (size) {
      case 'sm': return 60;
      case 'md': return 80;
      case 'lg': return 120;
      default: return 80;
    }
  };

  const renderLoadingContent = () => {
    switch (type) {
      case 'spinner':
        return (
          <View style={[styles.loadingContainer, loadingStyle]}>
            <AILoadingAnimation size={getSizeValue(size)} />
            {loadingText && (
              <Typography 
                variant="bodyMd" 
                color={theme.colors.textSecondary}
                style={styles.loadingText}
                align="center"
              >
                {loadingText}
              </Typography>
            )}
          </View>
        );

      case 'skeleton-text':
        return (
          <View style={[styles.skeletonContainer, loadingStyle]}>
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <SkeletonText 
                key={index} 
                lines={Math.floor(Math.random() * 3) + 1}
                lastLineWidth={`${60 + Math.random() * 30}%`}
              />
            ))}
          </View>
        );

      case 'skeleton-card':
        return (
          <View style={[styles.skeletonContainer, loadingStyle]}>
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <SkeletonCard key={index} height={skeletonHeight} />
            ))}
          </View>
        );

      case 'skeleton-message':
        return (
          <View style={[styles.skeletonContainer, loadingStyle]}>
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <SkeletonMessageBubble 
                key={index} 
                isUser={Math.random() > 0.5} 
              />
            ))}
          </View>
        );

      case 'skeleton-conversation':
        return (
          <View style={[styles.skeletonContainer, loadingStyle]}>
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <SkeletonConversationItem key={index} />
            ))}
          </View>
        );

      case 'skeleton-custom':
        return (
          <View style={[styles.skeletonContainer, loadingStyle]}>
            {renderSkeleton ? renderSkeleton() : <SkeletonText />}
          </View>
        );

      case 'overlay':
        return (
          <View style={[styles.overlayContainer, loadingStyle]}>
            <View style={[
              styles.overlayContent, 
              { backgroundColor: theme.colors.surface + 'F0' }
            ]}>
              <AILoadingAnimation size={getSizeValue(size)} />
              {loadingText && (
                <Typography 
                  variant="bodyMd" 
                  color={theme.colors.textSecondary}
                  style={styles.loadingText}
                  align="center"
                >
                  {loadingText}
                </Typography>
              )}
            </View>
          </View>
        );

      default:
        return (
          <View style={[styles.loadingContainer, loadingStyle]}>
            <AILoadingAnimation size={getSizeValue(size)} />
          </View>
        );
    }
  };

  if (!isLoading) {
    return <View style={style}>{children}</View>;
  }

  if (overlay || type === 'overlay') {
    return (
      <View style={style}>
        {children}
        {renderLoadingContent()}
      </View>
    );
  }

  return (
    <View style={style}>
      {renderLoadingContent()}
    </View>
  );
};

// Convenience components for common loading patterns
export const SpinnerLoader: React.FC<Pick<LoadingStateManagerProps, 'isLoading' | 'loadingText' | 'size'>> = (props) => (
  <LoadingStateManager type="spinner" {...props} />
);

export const SkeletonTextLoader: React.FC<Pick<LoadingStateManagerProps, 'isLoading' | 'skeletonCount'>> = (props) => (
  <LoadingStateManager type="skeleton-text" {...props} />
);

export const SkeletonCardLoader: React.FC<Pick<LoadingStateManagerProps, 'isLoading' | 'skeletonCount' | 'skeletonHeight'>> = (props) => (
  <LoadingStateManager type="skeleton-card" {...props} />
);

export const SkeletonMessageLoader: React.FC<Pick<LoadingStateManagerProps, 'isLoading' | 'skeletonCount'>> = (props) => (
  <LoadingStateManager type="skeleton-message" {...props} />
);

export const SkeletonConversationLoader: React.FC<Pick<LoadingStateManagerProps, 'isLoading' | 'skeletonCount'>> = (props) => (
  <LoadingStateManager type="skeleton-conversation" {...props} />
);

export const OverlayLoader: React.FC<Pick<LoadingStateManagerProps, 'isLoading' | 'loadingText' | 'size'>> = (props) => (
  <LoadingStateManager type="overlay" {...props} />
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  skeletonContainer: {
    flex: 1,
    paddingVertical: 16,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  overlayContent: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});