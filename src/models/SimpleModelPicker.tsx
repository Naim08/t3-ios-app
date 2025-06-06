import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { Typography, Surface } from '../ui/atoms';
import { PremiumBadge } from './PremiumBadge';
import { useEntitlements } from '../hooks/useEntitlements';
import { useTranslation } from 'react-i18next';
import { AI_MODELS, ModelOption } from '../config/models';

export interface SimpleModelPickerProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (modelId: string) => void;
  onNavigateToPaywall: () => void;
  remainingTokens: number;
}

export const SimpleModelPicker: React.FC<SimpleModelPickerProps> = ({
  isVisible,
  onClose,
  onSelect,
  onNavigateToPaywall,
  remainingTokens,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isSubscriber, hasCustomKey } = useEntitlements();

  const isModelUnlocked = useCallback(
    (model: ModelOption) => {
      if (!model.isPremium) return true;
      return isSubscriber || hasCustomKey;
    },
    [isSubscriber, hasCustomKey]
  );

  const handleModelPress = useCallback(
    (model: ModelOption) => {
      console.log(`Model pressed: ${model.id}`);
      if (isModelUnlocked(model)) {
        console.log(`Model ${model.id} is unlocked, selecting`);
        onSelect(model.id);
        onClose();
      } else {
        console.log(`Model ${model.id} is locked, navigating to paywall`);
        onNavigateToPaywall();
      }
    },
    [isModelUnlocked, onSelect, onClose, onNavigateToPaywall]
  );

  const renderModelCard = useCallback(
    (model: ModelOption) => {
      const isUnlocked = isModelUnlocked(model);
      const showWarning = !model.isPremium && remainingTokens === 0;

      return (
        <TouchableOpacity
          key={model.id}
          onPress={() => handleModelPress(model)}
          style={styles.modelCard}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${model.name}: ${model.description}`}
          accessibilityHint={
            isUnlocked
              ? t('models.selectModelHint')
              : t('models.unlockRequiredHint')
          }
        >
          <Surface style={styles.cardSurface}>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Typography
                  variant="bodyMd"
                  weight="semibold"
                  style={{ color: theme.colors.textPrimary }}
                >
                  {model.name}
                </Typography>
                {showWarning && (
                  <Typography
                    variant="caption"
                    style={{ color: theme.colors.danger['600'] }}
                  >
                    ⚠
                  </Typography>
                )}
              </View>
              <Typography
                variant="caption"
                style={{ 
                  ...styles.modelDescription,
                  color: theme.colors.textSecondary
                }}
              >
                {model.description}
              </Typography>
            </View>

            {!isUnlocked && (
              <PremiumBadge onUnlockPress={() => onNavigateToPaywall()} />
            )}
          </Surface>
        </TouchableOpacity>
      );
    },
    [
      isModelUnlocked,
      remainingTokens,
      theme.colors,
      t,
      handleModelPress,
      onNavigateToPaywall,
    ]
  );

  if (!isVisible) {
    console.log('SimpleModelPicker not visible, returning null');
    return null;
  }

  console.log('SimpleModelPicker rendering with visibility:', isVisible);
  
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
              <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                  <Typography
                    variant="h3"
                    weight="bold"
                    style={{ color: theme.colors.textPrimary }}
                  >
                    {t('models.selectModel')}
                  </Typography>
                  <Typography
                    variant="caption"
                    style={{
                      ...styles.remainingTokens,
                      color: theme.colors.textSecondary
                    }}
                  >
                    {t('models.remainingTokens', { count: remainingTokens })}
                  </Typography>
                </View>

                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close model picker"
                >
                  <Typography variant="bodyMd" weight="bold">✕</Typography>
                </TouchableOpacity>

                <ScrollView>
                  <View style={styles.modelsList}>
                    {AI_MODELS.map(renderModelCard)}
                  </View>
                </ScrollView>
              </SafeAreaView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    height: '60%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
    paddingTop: 8,
  },
  modelsList: {
    gap: 12,
    paddingBottom: 24,
  },
  modelCard: {
    minHeight: 44, // Accessibility
  },
  cardSurface: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
    borderColor: '#CED4DA',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modelDescription: {
    lineHeight: 18,
  },
  remainingTokens: {
    marginTop: 4,
  },
});
