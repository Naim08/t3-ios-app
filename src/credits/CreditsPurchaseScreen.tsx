import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { Typography, PrimaryButton, Surface } from '../ui/atoms';
import { useCredits, addTokens } from '../hooks/useCredits';
import { useTranslation } from 'react-i18next';

interface CreditsPurchaseScreenProps {
  navigation: {
    goBack: () => void;
  };
}

interface CreditPackage {
  id: string;
  tokens: number;
  price: string;
  priceValue: number;
  popular?: boolean;
  bonus?: number;
}

const creditPackages: CreditPackage[] = [
  {
    id: 'small',
    tokens: 25000,
    price: '$2.99',
    priceValue: 2.99,
  },
  {
    id: 'medium',
    tokens: 100000,
    price: '$9.99',
    priceValue: 9.99,
    bonus: 10000,
    popular: true,
  },
  {
    id: 'large',
    tokens: 250000,
    price: '$19.99',
    priceValue: 19.99,
    bonus: 50000,
  },
  {
    id: 'xl',
    tokens: 500000,
    price: '$34.99',
    priceValue: 34.99,
    bonus: 150000,
  },
];

export const CreditsPurchaseScreen: React.FC<CreditsPurchaseScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { remaining, refetch } = useCredits();
  const [loading, setLoading] = useState<string | null>(null);

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    setLoading(pkg.id);
    
    try {
      // TODO: Implement actual payment processing (Stripe, RevenueCat, etc.)
      // For now, simulate a successful purchase
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add the purchased tokens
      const totalTokens = pkg.tokens + (pkg.bonus || 0);
      await addTokens(totalTokens);
      
      // Refresh the credits display
      await refetch();
      
      Alert.alert(
        'Purchase Successful!',
        `${formatTokens(totalTokens)} tokens have been added to your account.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Purchase failed:', error);
      Alert.alert(
        'Purchase Failed',
        'There was an error processing your purchase. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(null);
    }
  };

  const renderCreditPackage = (pkg: CreditPackage) => {
    const isLoading = loading === pkg.id;
    const totalTokens = pkg.tokens + (pkg.bonus || 0);
    
    const packageStyle = {
      ...styles.packageCard,
      backgroundColor: theme.colors.surface,
      borderColor: pkg.popular ? theme.colors.brand['500'] : theme.colors.border,
      borderWidth: pkg.popular ? 2 : 1,
    };
    
    return (
      <Surface
        key={pkg.id}
        elevation={pkg.popular ? 3 : 1}
        style={packageStyle}
      >
        {pkg.popular && (
          <View style={[styles.popularBadge, { backgroundColor: theme.colors.brand['500'] }]}>
            <Typography
              variant="caption"
              color="#FFFFFF"
              weight="semibold"
            >
              MOST POPULAR
            </Typography>
          </View>
        )}
        
        <View style={styles.packageContent}>
          <Typography
            variant="h2"
            weight="bold"
            color={theme.colors.textPrimary}
            align="center"
          >
            {formatTokens(pkg.tokens)}
          </Typography>
          
          {pkg.bonus && (
            <View style={styles.bonusContainer}>
              <Typography
                variant="bodySm"
                color={theme.colors.brand['600']}
                weight="semibold"
                align="center"
              >
                + {formatTokens(pkg.bonus)} bonus
              </Typography>
            </View>
          )}
          
          <Typography
            variant="bodyMd"
            color={theme.colors.textSecondary}
            align="center"
            style={styles.tokenLabel}
          >
            tokens
          </Typography>
          
          <Typography
            variant="h3"
            weight="bold"
            color={theme.colors.textPrimary}
            align="center"
            style={styles.price}
          >
            {pkg.price}
          </Typography>
          
          <Typography
            variant="caption"
            color={theme.colors.textSecondary}
            align="center"
            style={styles.pricePerToken}
          >
            ${(pkg.priceValue / totalTokens * 1000).toFixed(2)} per 1K tokens
          </Typography>
          
          <PrimaryButton
            title={isLoading ? 'Processing...' : 'Purchase'}
            onPress={() => handlePurchase(pkg)}
            disabled={isLoading}
            style={styles.purchaseButton}
          />
        </View>
      </Surface>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Typography
            variant="h1"
            weight="bold"
            align="center"
            color={theme.colors.textPrimary}
          >
            Purchase Credits
          </Typography>
          
          <Typography
            variant="bodyMd"
            align="center"
            color={theme.colors.textSecondary}
            style={styles.subtitle}
          >
            Get more tokens to continue using AI models
          </Typography>
          
          <Surface elevation={1} style={{ ...styles.currentCredits, backgroundColor: theme.colors.surface }}>
            <Typography
              variant="caption"
              color={theme.colors.textSecondary}
              align="center"
            >
              Current Balance
            </Typography>
            <Typography
              variant="h2"
              weight="bold"
              color={theme.colors.brand['600']}
              align="center"
            >
              {formatTokens(remaining)} tokens
            </Typography>
          </Surface>
        </View>
        
        {/* Credit Packages */}
        <View style={styles.packagesContainer}>
          {creditPackages.map(renderCreditPackage)}
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <Typography
            variant="caption"
            color={theme.colors.textSecondary}
            align="center"
          >
            Tokens never expire • Secure payment processing
          </Typography>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 32,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
  },
  currentCredits: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  packagesContainer: {
    gap: 16,
  },
  packageCard: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    zIndex: 1,
  },
  packageContent: {
    padding: 20,
    paddingTop: 24,
  },
  bonusContainer: {
    marginTop: 4,
  },
  tokenLabel: {
    marginTop: 4,
    marginBottom: 16,
  },
  price: {
    marginBottom: 4,
  },
  pricePerToken: {
    marginBottom: 20,
  },
  purchaseButton: {
    width: '100%',
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});
