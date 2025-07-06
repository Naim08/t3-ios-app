import React, { ReactNode } from 'react';
import {
  Modal,
  View,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { useTheme } from '../../components/ThemeProvider';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import { ModalHeader } from './ModalHeader';
import { authModalStyles } from '../styles/authModalStyles';

// Conditional import for BlurView
let BlurView: any;
try {
  const blurLib = require('expo-blur');
  BlurView = blurLib.BlurView;
} catch (error) {
  BlurView = View;
}

interface BaseAuthModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  showDragIndicator?: boolean;
}

export const BaseAuthModal: React.FC<BaseAuthModalProps> = ({
  visible,
  onClose,
  title,
  children,
  showDragIndicator = true,
}) => {
  const { theme } = useTheme();
  const { slideAnim, fadeAnim, scaleAnim } = useModalAnimation({ visible });

  const handleBackdropPress = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={authModalStyles.overlay}>
          {/* Animated Backdrop */}
          <Animated.View
            style={[
              authModalStyles.backdrop,
              { opacity: fadeAnim }
            ]}
          >
            <TouchableWithoutFeedback onPress={handleBackdropPress}>
              {Platform.OS === 'ios' ? (
                <BlurView
                  intensity={80}
                  tint="dark"
                  style={authModalStyles.backdropTouch}
                />
              ) : (
                <View style={authModalStyles.backdropTouch} />
              )}
            </TouchableWithoutFeedback>
          </Animated.View>

          {/* Animated Modal Container */}
          <Animated.View
            style={[
              authModalStyles.container,
              {
                backgroundColor: theme.colors.surface,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ],
              },
            ]}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={authModalStyles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <ModalHeader
                title={title}
                onClose={onClose}
                showDragIndicator={showDragIndicator}
              />
              
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};