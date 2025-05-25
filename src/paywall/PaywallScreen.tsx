import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { Typography, PrimaryButton, Surface } from '../ui/atoms';
import { useEntitlements } from '../hooks/useEntitlements';
import { useTranslation } from 'react-i18next';

export interface PaywallScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export const PaywallScreen: React.FC<PaywallScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isSubscriber, hasCustomKey } = useEntitlements();
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Redirect if already entitled
  useEffect(() => {
    if (isSubscriber || hasCustomKey) {
      navigation.goBack();
    }
  }, [isSubscriber, hasCustomKey, navigation]);

  // Mock network check
  useEffect(() => {
    // In real app, check actual network connectivity
    setIsOffline(false);
  }, []);

  const requestPurchase = async () => {
    if (isOffline) {
      Alert.alert(
        t('paywall.offlineTitle'),
        t('paywall.offlineMessage'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    setIsLoading(true);
    
    try {
      // Mock purchase flow - replace with actual StoreKit integration
      await new Promise(resolve => global.setTimeout(resolve, 2000));
      
      Alert.alert(
        t('paywall.purchaseSuccessTitle'),
        t('paywall.purchaseSuccessMessage'),
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch {
      Alert.alert(
        t('paywall.purchaseErrorTitle'),
        t('paywall.purchaseErrorMessage'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSettings = () => {
    // Mock navigation to settings - replace with actual route
    Alert.alert(
      t('paywall.settingsTitle'),
      t('paywall.settingsMessage'),
      [{ text: t('common.ok') }]
    );
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://example.com/privacy');
  };

  const openTerms = () => {
    Linking.openURL('https://example.com/terms');
  };

  return (
    <SafeAreaView style={{...styles.safeAreaContainer, backgroundColor: theme.colors.background }}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Surface style={{...styles.heroSurface, backgroundColor: theme.colors.surface }}>
          <Image
            source={{ uri: 'https://via.placeholder.com/200x150/3970FF/FFFFFF?text=Premium' }}
            style={styles.heroImage}
            accessibilityLabel={t('paywall.premiumImageAlt')}
          />
          <Typography
            variant="h2"
            weight="bold"
            style={{...styles.heroTitle, color: theme.colors.textPrimary }}
          >
            {t('paywall.title')}
          </Typography>
          <Typography
            variant="bodyMd"
            style={{...styles.heroSubtitle, color: theme.colors.textSecondary }}
          >
            {t('paywall.subtitle')}
          </Typography>
        </Surface>

        <View style={styles.featuresSection}>
          <Surface style={{...styles.priceSurface, 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.brand['500']
          }}>
            <Typography
              variant="h3"
              weight="bold"
              style={{...styles.priceTitle, color: theme.colors.brand['600'] }}
            >
              {t('paywall.price')}
            </Typography>
            <Typography
              variant="bodySm"
              style={{...styles.priceDescription, color: theme.colors.textSecondary }}
            >
              {t('paywall.priceDescription')}
            </Typography>
          </Surface>

          <View style={styles.alternativeSection}>
            <Typography
              variant="bodySm"
              style={{...styles.alternativeText, color: theme.colors.textSecondary }}
            >
              {t('paywall.alternative')}
            </Typography>
          </View>
        </View>

        <View style={styles.buttonsSection}>
          <PrimaryButton
            title={t('paywall.subscribe')}
            onPress={requestPurchase}
            loading={isLoading}
            disabled={isOffline}
            variant="primary"
            size="large"
            style={styles.subscribeButton}
            accessibilityLabel={t('paywall.subscribeAccessibility')}
            accessibilityHint={t('paywall.subscribeHint')}
          />

          <PrimaryButton
            title={t('paywall.enterKey')}
            onPress={navigateToSettings}
            variant="outline"
            size="large"
            style={styles.keyButton}
            accessibilityLabel={t('paywall.enterKeyAccessibility')}
            accessibilityHint={t('paywall.enterKeyHint')}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <Typography
              variant="caption"
              onPress={openPrivacyPolicy}
              style={{
                ...styles.footerLink,
                color: theme.colors.brand['600']
              }}
              accessibilityRole="link"
            >
              {t('paywall.privacyPolicy')}
            </Typography>
            <Typography
              variant="caption"
              style={{ color: theme.colors.textSecondary }}
            >
              {' • '}
            </Typography>
            <Typography
              variant="caption"
              onPress={openTerms}
              style={{
                ...styles.footerLink,
                color: theme.colors.brand['600']
              }}
              accessibilityRole="link"
            >
              {t('paywall.terms')}
            </Typography>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  heroSurface: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  heroImage: {
    width: 120,
    height: 90,
    borderRadius: 12,
    marginBottom: 16,
  },
  heroTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresSection: {
    marginBottom: 32,
  },
  priceSurface: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  priceTitle: {
    marginBottom: 4,
  },
  priceDescription: {
    textAlign: 'center',
  },
  alternativeSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  alternativeText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonsSection: {
    gap: 12,
    marginBottom: 32,
  },
  subscribeButton: {
    minHeight: 48,
  },
  keyButton: {
    minHeight: 48,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLink: {
    textDecorationLine: 'underline',
    minHeight: 44,
    textAlignVertical: 'center',
    paddingVertical: 8,
  },
});
