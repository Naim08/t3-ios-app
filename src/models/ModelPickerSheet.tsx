import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { useTheme } from '../components/ThemeProvider';
import { Typography, Surface } from '../ui/atoms';
import { PremiumBadge } from './PremiumBadge';
import { useEntitlements } from '../hooks/useEntitlements';
import { useTranslation } from 'react-i18next';

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  icon?: string;
}

export interface ModelPickerSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (modelId: string) => void;
  onNavigateToPaywall: () => void;
  remainingTokens: number;
}

const models: ModelOption[] = [
  {
    id: 'gpt-3.5',
    name: 'GPT-3.5',
    description: 'Fast and reliable for everyday tasks',
    isPremium: false,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Latest model with enhanced reasoning',
    isPremium: true,
  },
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet',
    description: 'Advanced reasoning and analysis',
    isPremium: true,
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    description: 'Google\'s advanced multimodal model',
    isPremium: false,
  },
];

export const ModelPickerSheet: React.FC<ModelPickerSheetProps> = ({
  isVisible,
  onClose,
  onSelect,
  onNavigateToPaywall,
  remainingTokens,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isSubscriber, hasCustomKey } = useEntitlements();

  const snapPoints = useMemo(() => ['50%', '70%'], []);
  const { width: screenWidth } = Dimensions.get('window');
  const sheetWidth = Platform.OS === 'ios' && screenWidth > 600 ? 600 : screenWidth;

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
      const isLockedPremium = model.isPremium && !isUnlocked;
      const isDisabled = showWarning;

      return (
        <TouchableOpacity
          key={model.id}
          onPress={() => !isDisabled && handleModelPress(model)}
          style={[
            styles.modelCard,
            isDisabled && styles.disabledCard,
            isLockedPremium && styles.lockedCard
          ]}
          activeOpacity={isDisabled ? 1 : 0.7}
          accessibilityRole="button"
          accessibilityLabel={`${model.name}: ${model.description}`}
          accessibilityHint={
            isDisabled
              ? 'Not enough tokens to use this model'
              : isUnlocked
              ? t('models.selectModelHint')
              : t('models.unlockRequiredHint')
          }
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Surface style={{
            ...styles.cardSurface,
            ...(isDisabled && { opacity: 0.6 }),
            ...(isLockedPremium && { 
              opacity: 0.7,
              borderColor: theme.colors.gray['300'],
              borderWidth: 1,
              borderStyle: 'dashed' as any
            }),
            ...(showWarning && { borderColor: theme.colors.danger['600'] })
          }}>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Typography
                  variant="bodyMd"
                  weight="semibold"
                  style={{ 
                    color: isDisabled || isLockedPremium
                      ? theme.colors.textSecondary 
                      : theme.colors.textPrimary 
                  }}
                >
                  {model.name}
                  {isLockedPremium && (
                    <Typography variant="caption" style={{ color: theme.colors.brand['500'] }}>
                      {' '}🔒 Premium
                    </Typography>
                  )}
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
              {showWarning && (
                <Typography
                  variant="caption"
                  style={{ 
                    color: theme.colors.danger['600'],
                    marginTop: 4,
                    fontStyle: 'italic'
                  }}
                >
                  {t('models.insufficientTokens')}
                </Typography>
              )}
              {isLockedPremium && (
                <Typography
                  variant="caption"
                  style={{ 
                    color: theme.colors.brand['600'],
                    marginTop: 4,
                    fontStyle: 'italic'
                  }}
                >
                  Requires subscription or custom API key
                </Typography>
              )}
            </View>

            {!isUnlocked && !isDisabled && (
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
    console.log('ModelPickerSheet not visible, returning null');
    return null;
  }

  console.log('ModelPickerSheet rendering with visibility:', isVisible);
  
  return (
    <BottomSheet
      snapPoints={snapPoints}
      onClose={() => {
        console.log('BottomSheet onClose triggered');
        onClose();
      }}
      enablePanDownToClose
      index={0}
      backgroundStyle={{ backgroundColor: theme.colors.background }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      enableContentPanningGesture={false}
    >
      <View style={[styles.container, { maxWidth: sheetWidth }]}>
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
              color: remainingTokens === 0 
                ? theme.colors.danger['600'] 
                : theme.colors.textSecondary,
              fontWeight: remainingTokens === 0 ? 'bold' : 'normal'
            }}
          >
            {remainingTokens === 0 
              ? `🔴 ${t('models.remainingTokens', { count: remainingTokens })}`
              : t('models.remainingTokens', { count: remainingTokens })
            }
          </Typography>
        </View>

        <View style={styles.modelsList}>
          {models.map(renderModelCard)}
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  modelsList: {
    gap: 12,
  },
  modelCard: {
    minHeight: 44, // Accessibility
  },
  disabledCard: {
    opacity: 0.6,
  },
  lockedCard: {
    opacity: 0.8,
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
    color: 'textSecondary',
    lineHeight: 18,
  },
  remainingTokens: {
    marginTop: 4,
  },
});
