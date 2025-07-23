import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '../components/ThemeProvider';
import { Typography, Card } from '../ui/atoms';

interface SuccessModalProps {
  title?: string;
  message?: string;
  buttonText?: string;
  onButtonPress?: () => void;
  icon?: string;
}

export interface SuccessModalRef {
  present: () => void;
  dismiss: () => void;
}

export const SuccessModal = forwardRef<SuccessModalRef, SuccessModalProps>(
  ({ 
    title = "Success!", 
    message = "Operation completed successfully.",
    buttonText = "OK",
    onButtonPress,
    icon = "✅"
  }, ref) => {
    const { theme } = useTheme();
    const bottomSheetRef = React.useRef<BottomSheet>(null);

    // Snap points for the modal
    const snapPoints = useMemo(() => ['30%'], []);

    // Backdrop component
    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
          enableTouchThrough={false}
          onPress={() => bottomSheetRef.current?.close()}
        />
      ),
      []
    );

    // Imperative methods
    React.useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.expand(),
      dismiss: () => bottomSheetRef.current?.close(),
    }));

    const handleButtonPress = () => {
      bottomSheetRef.current?.close();
      onButtonPress?.();
    };

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        handleIndicatorStyle={{
          ...styles.handleIndicator,
          backgroundColor: theme.colors.textTertiary
        }}
        backgroundStyle={{
          ...styles.background,
          backgroundColor: theme.colors.surface
        }}
      >
        <BottomSheetView style={styles.content}>
          <Card
            variant="floating"
            padding="lg"
            borderRadius="2xl"
            style={{
              ...styles.card,
              backgroundColor: theme.colors.success['50']
            }}
          >
            <Typography
              variant="h1"
              style={styles.icon}
            >
              {icon}
            </Typography>
            <Typography
              variant="h5"
              weight="bold"
              color={theme.colors.success['700']}
              style={styles.title}
            >
              {title}
            </Typography>
            <Typography
              variant="bodyMd"
              color={theme.colors.success['600']}
              style={styles.message}
            >
              {message}
            </Typography>
          </Card>

          <TouchableOpacity
            onPress={handleButtonPress}
            activeOpacity={0.8}
          >
            <Card
              variant="floating"
              padding="md"
              borderRadius="xl"
              glow
              style={{
                backgroundColor: theme.colors.success['500'],
              }}
            >
              <Typography
                variant="bodyMd"
                weight="semibold"
                color="#FFFFFF"
                style={styles.buttonText}
              >
                {buttonText}
              </Typography>
            </Card>
          </TouchableOpacity>
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
  handleIndicator: {
    width: 40,
  },
  background: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  card: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonText: {
    textAlign: 'center',
  },
});