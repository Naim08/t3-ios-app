import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { Typography, PrimaryButton } from '../ui/atoms';
import { useTranslation } from 'react-i18next';

export interface PremiumBadgeProps {
  onUnlockPress: () => void;
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({ onUnlockPress }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.overlay, { backgroundColor: theme.colors.background + 'E6' }]}>
      <View style={[styles.badge, { backgroundColor: theme.colors.brand['500'] }]}>
        <Typography
          variant="bodyXs"
          weight="semibold"
          style={{...styles.badgeText, color: theme.colors.gray['50'] }}
        >
          {t('models.premium')}
        </Typography>
      </View>
      <PrimaryButton
        title={t('models.unlock')}
        onPress={onUnlockPress}
        variant="outline"
        size="small"
        style={styles.unlockButton}
        accessibilityLabel={t('models.unlockAccessibility')}
        accessibilityHint={t('models.unlockHint')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    textAlign: 'center',
  },
  unlockButton: {
    minHeight: 44, // Accessibility tap target
    minWidth: 120,
  },
});
