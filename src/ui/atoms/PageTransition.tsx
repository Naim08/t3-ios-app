import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type PageTransitionType = 
  | 'slide-horizontal'
  | 'slide-vertical'
  | 'fade'
  | 'scale'
  | 'cube'
  | 'flip'
  | 'door'
  | 'push';

interface PageTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  transitionType?: PageTransitionType;
  duration?: number;
  style?: ViewStyle;
  direction?: 'left' | 'right' | 'up' | 'down';
  onTransitionComplete?: () => void;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  isVisible,
  transitionType = 'slide-horizontal',
  duration = 300,
  style,
  direction = 'right',
  onTransitionComplete,
}) => {
  const translateX = useRef(new Animated.Value(isVisible ? 0 : SCREEN_WIDTH)).current;
  const translateY = useRef(new Animated.Value(isVisible ? 0 : SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(isVisible ? 1 : 0.8)).current;
  const rotateY = useRef(new Animated.Value(isVisible ? 0 : 90)).current;
  const rotateX = useRef(new Animated.Value(isVisible ? 0 : 90)).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    switch (transitionType) {
      case 'slide-horizontal':
        const horizontalTarget = isVisible ? 0 : (direction === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH);
        animations.push(
          Animated.timing(translateX, {
            toValue: horizontalTarget,
            duration,
            useNativeDriver: true,
          })
        );
        break;

      case 'slide-vertical':
        const verticalTarget = isVisible ? 0 : (direction === 'up' ? -SCREEN_HEIGHT : SCREEN_HEIGHT);
        animations.push(
          Animated.timing(translateY, {
            toValue: verticalTarget,
            duration,
            useNativeDriver: true,
          })
        );
        break;

      case 'fade':
        animations.push(
          Animated.timing(opacity, {
            toValue: isVisible ? 1 : 0,
            duration,
            useNativeDriver: true,
          })
        );
        break;

      case 'scale':
        animations.push(
          Animated.timing(scale, {
            toValue: isVisible ? 1 : 0.8,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: isVisible ? 1 : 0,
            duration,
            useNativeDriver: true,
          })
        );
        break;

      case 'cube':
        const cubeRotation = isVisible ? 0 : (direction === 'left' ? -90 : 90);
        animations.push(
          Animated.timing(rotateY, {
            toValue: cubeRotation,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: isVisible ? 0 : (direction === 'left' ? -SCREEN_WIDTH / 2 : SCREEN_WIDTH / 2),
            duration,
            useNativeDriver: true,
          })
        );
        break;

      case 'flip':
        animations.push(
          Animated.timing(rotateY, {
            toValue: isVisible ? 0 : 180,
            duration,
            useNativeDriver: true,
          })
        );
        break;

      case 'door':
        animations.push(
          Animated.timing(rotateY, {
            toValue: isVisible ? 0 : -90,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: isVisible ? 1 : 0,
            duration: duration / 2,
            useNativeDriver: true,
          })
        );
        break;

      case 'push':
        animations.push(
          Animated.timing(translateX, {
            toValue: isVisible ? 0 : (direction === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH),
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: isVisible ? 1 : 0.9,
            duration,
            useNativeDriver: true,
          })
        );
        break;
    }

    if (animations.length > 0) {
      const animation = Animated.parallel(animations);
      animation.start(({ finished }) => {
        if (finished && onTransitionComplete) {
          onTransitionComplete();
        }
      });

      return () => animation.stop();
    }
  }, [isVisible, transitionType, duration, direction]);

  const getTransformStyle = () => {
    const transforms: any[] = [];

    switch (transitionType) {
      case 'slide-horizontal':
        transforms.push({ translateX });
        break;
      case 'slide-vertical':
        transforms.push({ translateY });
        break;
      case 'scale':
        transforms.push({ scale });
        break;
      case 'cube':
        transforms.push({ rotateY: rotateY.interpolate({
          inputRange: [-90, 0, 90],
          outputRange: ['-90deg', '0deg', '90deg'],
        }) });
        transforms.push({ translateX });
        break;
      case 'flip':
        transforms.push({ rotateY: rotateY.interpolate({
          inputRange: [0, 180],
          outputRange: ['0deg', '180deg'],
        }) });
        break;
      case 'door':
        transforms.push({ rotateY: rotateY.interpolate({
          inputRange: [-90, 0],
          outputRange: ['-90deg', '0deg'],
        }) });
        break;
      case 'push':
        transforms.push({ translateX });
        transforms.push({ scale });
        break;
    }

    return transforms;
  };

  const getOpacity = () => {
    switch (transitionType) {
      case 'fade':
      case 'scale':
      case 'door':
        return opacity;
      default:
        return 1;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity: getOpacity(),
          transform: getTransformStyle(),
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Modal transition component
interface ModalTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  backdrop?: boolean;
  onBackdropPress?: () => void;
  transitionType?: 'slide-up' | 'fade' | 'scale' | 'bounce';
  duration?: number;
}

export const ModalTransition: React.FC<ModalTransitionProps> = ({
  children,
  isVisible,
  backdrop = true,
  onBackdropPress,
  transitionType = 'slide-up',
  duration = 300,
}) => {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const modalTransform = useRef(new Animated.Value(isVisible ? 0 : 1)).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    // Backdrop animation
    if (backdrop) {
      animations.push(
        Animated.timing(backdropOpacity, {
          toValue: isVisible ? 0.5 : 0,
          duration,
          useNativeDriver: true,
        })
      );
    }

    // Modal animation
    if (transitionType === 'bounce') {
      animations.push(
        Animated.spring(modalTransform, {
          toValue: isVisible ? 0 : 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        })
      );
    } else {
      animations.push(
        Animated.timing(modalTransform, {
          toValue: isVisible ? 0 : 1,
          duration,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start();
  }, [isVisible, transitionType, duration, backdrop]);

  const getModalTransform = () => {
    switch (transitionType) {
      case 'slide-up':
        return [{
          translateY: modalTransform.interpolate({
            inputRange: [0, 1],
            outputRange: [0, SCREEN_HEIGHT],
          }),
        }];
      case 'scale':
        return [{
          scale: modalTransform.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.8],
          }),
        }];
      case 'fade':
        return [];
      case 'bounce':
        return [{
          scale: modalTransform.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.3],
          }),
        }];
      default:
        return [];
    }
  };

  const getModalOpacity = () => {
    if (transitionType === 'fade') {
      return modalTransform.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      });
    }
    return 1;
  };

  if (!isVisible && transitionType !== 'fade') return null;

  return (
    <View style={styles.modalContainer}>
      {backdrop && (
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        />
      )}
      {backdrop && onBackdropPress && (
        <TouchableOpacity
          style={styles.backdropTouchable}
          onPress={onBackdropPress}
          activeOpacity={1}
        />
      )}
      <Animated.View
        style={[
          styles.modalContent,
          {
            opacity: getModalOpacity(),
            transform: getModalTransform(),
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    // Modal content styles will be provided by children
  },
});