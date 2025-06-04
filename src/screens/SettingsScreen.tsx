
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  Alert,
  Switch,
  ScrollView,
  Linking,
} from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { Typography, Surface } from '../ui/atoms';
import { useAuth } from '../providers/AuthProvider';
import { useState, useEffect } from 'react';

interface SettingsScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

interface SettingRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  icon?: string;
}

const SettingRow = ({ 
  title, 
  subtitle, 
  onPress, 
  rightElement, 
  showChevron = false,
  icon 
}: SettingRowProps) => {
  const { theme } = useTheme();
  
  return (
    <TouchableOpacity 
      style={[
        styles.settingRow,
        { borderBottomColor: theme.colors.border }
      ]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingRowContent}>
        {icon && (
          <Typography 
            variant="bodyLg" 
            style={styles.settingIcon}
          >
            {icon}
          </Typography>
        )}
        <View style={styles.settingTextContainer}>
          <Typography variant="bodyLg" weight="medium">
            {title}
          </Typography>
          {subtitle && (
            <Typography 
              variant="bodySm" 
              color={theme.colors.textSecondary}
              style={styles.settingSubtitle}
            >
              {subtitle}
            </Typography>
          )}
        </View>
        {rightElement && (
          <View style={styles.settingRightElement}>
            {rightElement}
          </View>
        )}
        {showChevron && (
          <Typography 
            variant="bodyLg" 
            color={theme.colors.textSecondary}
            style={styles.chevron}
          >
            ›
          </Typography>
        )}
      </View>
    </TouchableOpacity>
  );
};

const SettingSection = ({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode; 
}) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.sectionContainer}>
      <Typography 
        variant="bodySm" 
        weight="medium"
        color={theme.colors.textSecondary}
        style={styles.sectionTitle}
      >
        {title.toUpperCase()}
      </Typography>
      <Surface elevation={1} style={styles.section}>
        {children}
      </Surface>
    </View>
  );
};

export const SettingsScreen = ({ navigation }: SettingsScreenProps) => {
  const { theme, colorScheme, toggleTheme } = useTheme();
  const { user, signOut, loading } = useAuth();
  const [appVersion, setAppVersion] = useState<string>('');
  const [notifications, setNotifications] = useState(true);

  // Get app version on mount
  useEffect(() => {
    setAppVersion('1.0.0'); // Hardcoded for now, can be replaced with actual version detection
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: signOut
        }
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://yourapp.com/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://yourapp.com/terms');
  };

  const handleSupport = () => {
    Linking.openURL('mailto:support@yourapp.com?subject=Pocket T3 Support');
  };

  const handleRateApp = () => {
    // iOS/Android specific store URLs would go here
    Alert.alert('Rate App', 'This would open the app store for rating.');
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Typography 
          variant="h2" 
          weight="bold"
          style={styles.title}
        >
          Settings
        </Typography>

        {/* Appearance Section */}
        <SettingSection title="Appearance">
          <SettingRow
            icon="🎨"
            title="Theme"
            subtitle={colorScheme === 'light' ? 'Light mode' : 'Dark mode'}
            rightElement={
              <Switch
                value={colorScheme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ 
                  false: theme.colors.gray[300], 
                  true: theme.colors.brand[500] 
                }}
                thumbColor={theme.colors.gray[50]}
              />
            }
          />
        </SettingSection>

        {/* Account Section */}
        <SettingSection title="Account">
          <SettingRow
            icon="👤"
            title="Profile"
            subtitle={user?.email || 'Unknown user'}
          />
          <SettingRow
            icon="💳"
            title="Subscription"
            subtitle="Manage your plan"
            onPress={() => navigation.navigate('CreditsPurchase')}
            showChevron
          />
          <SettingRow
            icon="📊"
            title="Usage Analytics"
            subtitle="View your token usage"
            onPress={() => navigation.navigate('TokenUsageAnalytics')}
            showChevron
          />
        </SettingSection>

        {/* Preferences Section */}
        <SettingSection title="Preferences">
          <SettingRow
            icon="🔔"
            title="Notifications"
            subtitle="Push notifications"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ 
                  false: theme.colors.gray[300], 
                  true: theme.colors.brand[500] 
                }}
                thumbColor={theme.colors.gray[50]}
              />
            }
          />
          <SettingRow
            icon="🤖"
            title="Personas"
            subtitle="Manage AI personas"
            onPress={() => navigation.navigate('PersonaPicker')}
            showChevron
          />
        </SettingSection>

        {/* Support & About Section */}
        <SettingSection title="Support & About">
          <SettingRow
            icon="⭐"
            title="Rate App"
            subtitle="Help us improve"
            onPress={handleRateApp}
            showChevron
          />
          <SettingRow
            icon="💬"
            title="Contact Support"
            subtitle="Get help"
            onPress={handleSupport}
            showChevron
          />
          <SettingRow
            icon="🔒"
            title="Privacy Policy"
            onPress={handlePrivacyPolicy}
            showChevron
          />
          <SettingRow
            icon="📋"
            title="Terms of Service"
            onPress={handleTermsOfService}
            showChevron
          />
          <SettingRow
            icon="ℹ️"
            title="App Version"
            subtitle={appVersion || '1.0.0'}
          />
        </SettingSection>

        {/* Debug Section (Dev only) */}
        {__DEV__ && (
          <SettingSection title="Developer">
            <SettingRow
              icon="🔍"
              title="IAP Debug Tool"
              subtitle="Test in-app purchases"
              onPress={() => navigation.navigate('IAPDebug')}
              showChevron
            />
            <SettingRow
              icon="🏥"
              title="Database Diagnostics"
              subtitle="Check database health"
              onPress={() => navigation.navigate('DatabaseDiagnostic')}
              showChevron
            />
          </SettingSection>
        )}

        {/* Sign Out Section */}
        <SettingSection title="Account Actions">
          <SettingRow
            icon="🚪"
            title="Sign Out"
            onPress={handleSignOut}
            rightElement={
              loading ? (
                <Typography 
                  variant="bodySm" 
                  color={theme.colors.textSecondary}
                >
                  Loading...
                </Typography>
              ) : null
            }
          />
        </SettingSection>

        <View style={styles.footer}>
          <Typography 
            variant="bodySm" 
            color={theme.colors.textSecondary}
            style={styles.footerText}
          >
            Made with ❤️ using T3 Stack
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  section: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 52,
  },
  settingIcon: {
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingSubtitle: {
    marginTop: 2,
  },
  settingRightElement: {
    marginLeft: 12,
  },
  chevron: {
    marginLeft: 8,
    fontSize: 20,
    fontWeight: '300',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  footerText: {
    textAlign: 'center',
  },
});
