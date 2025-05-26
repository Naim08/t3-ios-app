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
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../components/ThemeProvider';
import { Typography, PrimaryButton, Surface } from '../ui/atoms';
import { useEntitlements } from '../hooks/useEntitlements';
import { usePurchase } from '../purchases';
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
  const { purchaseSubscription, purchaseTokens, restorePurchases, isLoading, error, subscriptionProduct, tokenProducts } = usePurchase();
  const [isOffline, setIsOffline] = useState(false);

  // Redirect if already entitled
  useEffect(() => {
    if (isSubscriber || hasCustomKey) {
      navigation.goBack();
    }
  }, [isSubscriber, hasCustomKey, navigation]);

  // Network connectivity check
  useEffect(() => {
    const checkNetworkStatus = async () => {
      const netInfo = await NetInfo.fetch();
      setIsOffline(!netInfo.isConnected);
    };

    checkNetworkStatus();

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return unsubscribe;
  }, []);

  const getTokenAmountFromId = (productId: string): string => {
    switch (productId) {
      case '25K_tokens': return '25,000 tokens';
      case '100K_tokens': return '100,000 tokens';
      case 'tokens_250k': return '250,000 tokens';
      case '500K_tokens': return '500,000 tokens';
      default: return 'Tokens';
    }
  };

  const requestTokenPurchase = async (productId: string) => {
    try {
      await purchaseTokens(productId);
    } catch (error) {
      console.error('Token purchase error:', error);
      // Error handling is done in PurchaseProvider with toast messages
    }
  };

  const requestPurchase = async () => {
    try {
      await purchaseSubscription();
    } catch (error) {
      console.error('Purchase error:', error);
      // Error handling is done in PurchaseProvider with toast messages
    }
  };

  const handleRestorePurchases = async () => {
    try {
      await restorePurchases();
    } catch (error) {
      console.error('Restore purchases error:', error);
      Alert.alert(
        'Restore Failed',
        'Failed to restore purchases. Please try again.',
        [{ text: t('common.ok') }]
      );
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
              {subscriptionProduct?.localizedPrice || '$7.99'} / month
            </Typography>
            <Typography
              variant="bodySm"
              style={{...styles.priceDescription, color: theme.colors.textSecondary }}
            >
              150,000 tokens • Unlock GPT-4o & Claude Sonnet
            </Typography>
          </Surface>

          <View style={styles.alternativeSection}>
            <Typography
              variant="bodySm"
              style={{...styles.alternativeText, color: theme.colors.textSecondary }}
            >
              {t('paywall.alternative')}
            </Typography>
            
            {/* Token Packages Section */}
            {tokenProducts.length > 0 && (
              <View style={styles.tokenPackagesSection}>
                <Typography
                  variant="h4"                        weight="semibold"
                  style={{...styles.tokenPackagesTitle, color: theme.colors.textPrimary }}
                >
                  Or buy tokens individually:
                </Typography>
                <View style={styles.tokenPackagesGrid}>
                  {tokenProducts.map((tokenProduct) => (
                    <Surface 
                      key={tokenProduct.productId} 
                      style={{...styles.tokenPackageSurface, backgroundColor: theme.colors.surface}}
                    >
                      <Typography
                        variant="bodyMd"
                        weight="semibold"
                        style={{...styles.tokenPackageAmount, color: theme.colors.textPrimary }}
                      >
                        {getTokenAmountFromId(tokenProduct.productId)}
                      </Typography>
                      <Typography
                        variant="bodySm"
                        style={{...styles.tokenPackagePrice, color: theme.colors.textSecondary }}
                      >
                        {tokenProduct.localizedPrice}
                      </Typography>
                      <PrimaryButton
                        title="Buy"
                        onPress={() => requestTokenPurchase(tokenProduct.productId)}
                        loading={isLoading}
                        disabled={isOffline}
                        variant="outline"
                        size="small"
                        style={styles.tokenPackageButton}
                      />
                    </Surface>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.buttonsSection}>
          <PrimaryButton
            title={isLoading ? 'Processing...' : t('paywall.subscribe')}
            onPress={requestPurchase}
            loading={isLoading}
            disabled={isOffline || !subscriptionProduct}
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

          <Typography
            variant="bodySm"
            onPress={handleRestorePurchases}
            style={{
              ...styles.restoreLink,
              color: theme.colors.brand['600']
            }}
            accessibilityRole="button"
          >
            Restore Purchases
          </Typography>
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
  restoreLink: {
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 16,
    minHeight: 44,
    textAlignVertical: 'center',
    paddingVertical: 8,
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
  tokenPackagesSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  tokenPackagesTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  tokenPackagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  tokenPackageSurface: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 140,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tokenPackageAmount: {
    marginBottom: 4,
    textAlign: 'center',
  },
  tokenPackagePrice: {
    marginBottom: 12,
    textAlign: 'center',
  },
  tokenPackageButton: {
    minWidth: 80,
  },
});
