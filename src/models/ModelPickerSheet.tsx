/* eslint-disable react-native/no-inline-styles */
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
import { Lock, Check, AlertTriangle, Circle } from 'lucide-react-native';
import { PremiumBadge } from './PremiumBadge';
import { ModelProviderLogo, getProviderFromModelId } from '../components/ModelProviderLogo';
import { ModelCapabilityIcons, getModelCapabilities } from '../components/ModelCapabilityIcons';
import { useEntitlements } from '../hooks/useEntitlements';
import { useTranslation } from 'react-i18next';
import { usePersona } from '../context/PersonaContext';
import { AI_MODELS, ModelOption } from '../config/models';

export interface ModelPickerSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (modelId: string) => void;
  onNavigateToPaywall: () => void;
  remainingTokens: number;
  currentModelId?: string;
}

export const ModelPickerSheet: React.FC<ModelPickerSheetProps> = ({
  isVisible,
  onClose,
  onSelect,
  onNavigateToPaywall,
  remainingTokens,
  currentModelId,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isSubscriber, hasCustomKey } = useEntitlements();
  const { currentPersona } = usePersona();

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
      if (isModelUnlocked(model)) {
        onSelect(model.id);
        onClose();
      } else {
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
      const isCurrentModel = currentModelId === model.id;
      const isPersonaDefault = currentPersona?.default_model === model.id;

      return (
        <TouchableOpacity
          key={model.id}
          onPress={() => !isDisabled && handleModelPress(model)}
          style={[
            styles.modelCard,
            isDisabled && styles.disabledCard,
            isLockedPremium && styles.lockedCard,
            isCurrentModel && styles.selectedCard
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
            ...(isCurrentModel && { 
              borderColor: theme.colors.brand['500'],
              borderWidth: 2,
              backgroundColor: theme.colors.brand['50']
            }),
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
                <View style={styles.modelNameContainer}>
                  <View style={styles.modelTitleRow}>
                    <ModelProviderLogo 
                      provider={model.provider || getProviderFromModelId(model.id)} 
                      size={20}
                      style={{ marginRight: 8 }}
                    />
                    <Typography
                      variant="bodyMd"
                      weight="semibold"
                      style={{ 
                        color: isDisabled || isLockedPremium
                          ? theme.colors.textSecondary 
                          : theme.colors.textPrimary,
                        flex: 1,
                      }}
                    >
                      {model.name}
                    </Typography>
                    {isLockedPremium && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
                        <Lock size={12} color={theme.colors.brand['500']} strokeWidth={2} />
                        <Typography variant="caption" style={{ color: theme.colors.brand['500'], marginLeft: 2 }}>
                          Premium
                        </Typography>
                      </View>
                    )}
                  </View>
                  <View style={styles.badges}>
                    {isPersonaDefault && (
                      <View style={[styles.badge, { backgroundColor: theme.colors.accent['100'] }]}>
                        <Typography variant="caption" style={{ color: theme.colors.accent['700'] }}>
                          {currentPersona?.icon} Default
                        </Typography>
                      </View>
                    )}
                    {isCurrentModel && (
                      <View style={[styles.badge, { backgroundColor: theme.colors.brand['100'] }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Check size={12} color={theme.colors.brand['700']} strokeWidth={2.5} />
                          <Typography variant="caption" style={{ color: theme.colors.brand['700'], marginLeft: 2 }}>
                            Selected
                          </Typography>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.rightSection}>
                  <ModelCapabilityIcons 
                    capabilities={getModelCapabilities(model)}
                    iconSize={14}
                    maxIcons={3}
                    style={{ marginRight: 8 }}
                  />
                  {showWarning && (
                    <AlertTriangle 
                      size={16} 
                      color={theme.colors.danger['600']} 
                      strokeWidth={2}
                    />
                  )}
                </View>
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
      currentModelId,
      currentPersona,
      theme.colors,
      t,
      handleModelPress,
      onNavigateToPaywall,
    ]
  );

  if (!isVisible) {
    return null;
  }
  
  return (
    <BottomSheet
      snapPoints={snapPoints}
      onClose={() => {
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {remainingTokens === 0 && (
                <View style={{ marginRight: 4 }}>
                  <Circle 
                    size={12} 
                    color={theme.colors.danger['600']} 
                    fill={theme.colors.danger['600']}
                    strokeWidth={0}
                  />
                </View>
              )}
              {t('models.remainingTokens', { count: remainingTokens })}
            </View>
          </Typography>
        </View>

        <View style={styles.modelsList}>
          {AI_MODELS.map(renderModelCard)}
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
  selectedCard: {
    // Additional styles will be applied inline
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
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  modelNameContainer: {
    flex: 1,
  },
  modelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  modelDescription: {
    color: 'textSecondary',
    lineHeight: 18,
  },
  remainingTokens: {
    marginTop: 4,
  },
});
