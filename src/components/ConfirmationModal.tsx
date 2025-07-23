import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from './ThemeProvider';
import { Typography, Card } from '../ui/atoms';

interface ConfirmationModalProps {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  icon?: string;
  type?: 'danger' | 'warning' | 'info';
}

export interface ConfirmationModalRef {
  present: () => void;
  dismiss: () => void;
}

export const ConfirmationModal = forwardRef<ConfirmationModalRef, ConfirmationModalProps>(
  ({ 
    title = "Confirm Action", 
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    icon,
    type = 'info'
  }, ref) => {
    const { theme } = useTheme();
    const bottomSheetRef = React.useRef<BottomSheet>(null);

    // Snap points for the modal
    const snapPoints = useMemo(() => ['35%'], []);

    // Get colors and icon based on type
    const getTypeConfig = () => {
      switch (type) {
        case 'danger':
          return {
            cardBg: theme.colors.danger['50'],
            titleColor: theme.colors.danger['700'],
            messageColor: theme.colors.danger['600'],
            confirmColor: theme.colors.danger['500'],
            icon: icon || '🗑️'
          };
        case 'warning':
          return {
            cardBg: theme.colors.warning['50'],
            titleColor: theme.colors.warning['700'],
            messageColor: theme.colors.warning['600'],
            confirmColor: theme.colors.warning['500'],
            icon: icon || '⚠️'
          };
        default: // info
          return {
            cardBg: theme.colors.info['50'],
            titleColor: theme.colors.info['700'],
            messageColor: theme.colors.info['600'],
            confirmColor: theme.colors.info['500'],
            icon: icon || 'ℹ️'
          };
      }
    };

    const config = getTypeConfig();

    // Backdrop component
    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
          enableTouchThrough={false}
          onPress={() => handleCancel()}
        />
      ),
      []
    );

    // Imperative methods
    React.useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.expand(),
      dismiss: () => bottomSheetRef.current?.close(),
    }));

    const handleConfirm = () => {
      bottomSheetRef.current?.close();
      onConfirm?.();
    };

    const handleCancel = () => {
      bottomSheetRef.current?.close();
      onCancel?.();
    };

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        handleIndicatorStyle={{
          backgroundColor: theme.colors.textTertiary,
          width: 40,
        }}
        backgroundStyle={{
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        <BottomSheetView style={styles.content}>
          <Card
            variant="floating"
            padding="lg"
            borderRadius="2xl"
            style={{
              ...styles.messageCard,
              backgroundColor: config.cardBg
            }}
          >
            <Typography
              variant="h1"
              style={styles.icon}
            >
              {config.icon}
            </Typography>
            <Typography
              variant="h5"
              weight="bold"
              color={config.titleColor}
              style={styles.title}
            >
              {title}
            </Typography>
            <Typography
              variant="bodyMd"
              color={config.messageColor}
              style={styles.message}
            >
              {message}
            </Typography>
          </Card>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.8}
              style={styles.button}
            >
              <Card
                variant="elevated"
                padding="md"
                borderRadius="xl"
                style={styles.cancelButton}
              >
                <Typography
                  variant="bodyMd"
                  weight="semibold"
                  color={theme.colors.textSecondary}
                  style={styles.buttonText}
                >
                  {cancelText}
                </Typography>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.8}
              style={styles.button}
            >
              <Card
                variant="floating"
                padding="md"
                borderRadius="xl"
                glow
                style={{
                  ...styles.confirmButton,
                  backgroundColor: config.confirmColor
                }}
              >
                <Typography
                  variant="bodyMd"
                  weight="semibold"
                  color="#FFFFFF"
                  style={styles.buttonText}
                >
                  {confirmText}
                </Typography>
              </Card>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  messageCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
    textAlign: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmButton: {},
  buttonText: {
    textAlign: 'center',
  },
}); 