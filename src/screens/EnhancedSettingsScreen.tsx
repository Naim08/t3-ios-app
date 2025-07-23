import React, { useState, useEffect } from 'react';
import {
  View,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
  Linking,
  Modal,
} from 'react-native';
import { 
  Palette, 
  User, 
  CreditCard, 
  BarChart3, 
  Bell, 
  Bot,
  Star,
  MessageCircle,
  Shield,
  FileText,
  Info,
  Search,
  Wrench,
  Stethoscope,
  LogOut,
  ChevronRight
} from 'lucide-react-native';

// Conditional imports for gradients
let LinearGradient: any;
try {
  const gradientLib = require('expo-linear-gradient');
  LinearGradient = gradientLib.LinearGradient;
} catch (error) {
  LinearGradient = ({ children, style, ...props }: any) => 
    React.createElement(View, { style, ...props }, children);
}

import { useTheme } from '../components/ThemeProvider';
import { Typography, Avatar, Card, Surface } from '../ui/atoms';
import { AnimatedTouchable, FadeInView, SlideInView, StaggeredView } from '../ui/atoms';
import { useAuth } from '../providers/AuthProvider';
import { useProfile } from '../hooks/useProfile';
import { AvatarPicker } from '../components/AvatarPicker';
import { ThemeToggle } from '../components/ThemeToggle';

interface EnhancedSettingsScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

interface EnhancedSettingRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  icon?: React.ComponentType<any>;
  iconBgColor?: string;
  isLast?: boolean;
}

const EnhancedSettingRow = ({ 
  title, 
  subtitle, 
  onPress, 
  rightElement, 
  showChevron = false,
  icon,
  iconBgColor,
  isLast = false
}: EnhancedSettingRowProps) => {
  const { theme, colorScheme } = useTheme();
  
  return (
    <AnimatedTouchable 
      onPress={onPress}
      disabled={!onPress}
      animationType="scale"
      scaleValue={0.98}
      style={{
        backgroundColor: 'transparent',
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.colors.border + '40',
      }}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        minHeight: 64,
      }}>
        {icon && (
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: iconBgColor || theme.colors.brand['500'] + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 16,
            shadowColor: iconBgColor || theme.colors.brand['500'],
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}>
            {React.createElement(icon, { 
              size: 20, 
              color: iconBgColor?.includes('#') ? '#FFFFFF' : theme.colors.brand['600']
            })}
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Typography 
            variant="bodyLg" 
            weight="medium" 
            color={theme.colors.textPrimary}
            style={{ marginBottom: subtitle ? 2 : 0 }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography 
              variant="bodySm" 
              color={theme.colors.textSecondary}
            >
              {subtitle}
            </Typography>
          )}
        </View>
        {rightElement && (
          <View style={{ marginLeft: 12 }}>
            {rightElement}
          </View>
        )}
        {showChevron && (
          <View style={{ marginLeft: 8 }}>
            <ChevronRight 
              size={18} 
              color={theme.colors.textSecondary} 
            />
          </View>
        )}
      </View>
    </AnimatedTouchable>
  );
};

const EnhancedSettingSection = ({ 
  title, 
  children,
  delay = 0 
}: { 
  title: string; 
  children: React.ReactNode;
  delay?: number;
}) => {
  const { theme } = useTheme();
  
  return (
    <SlideInView
      visible={true}
      direction="up"
      delay={delay}
      style={{ marginBottom: 32 }}
    >
      <Typography 
        variant="caption" 
        weight="semibold"
        color={theme.colors.textSecondary}
        style={{ 
          marginBottom: 12, 
          marginLeft: 4,
          letterSpacing: 1,
          textTransform: 'uppercase'
        }}
      >
        {title}
      </Typography>
      <Card 
        variant="glass"
        style={{
          backgroundColor: theme.colors.surface + 'F8',
          borderColor: theme.colors.border + '60',
          borderWidth: 1,
          borderRadius: 20,
          overflow: 'hidden',
          shadowColor: theme.colors.gray['500'],
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        {children}
      </Card>
    </SlideInView>
  );
};

const ProfileHeader = ({ profile, user, onAvatarPress }: any) => {
  const { theme } = useTheme();
  
  return (
    <FadeInView visible={true} style={{ marginBottom: 32 }}>
      <Card
        variant="gradient"
        style={{
          borderRadius: 24,
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        <LinearGradient
          colors={[
            theme.colors.brand['400'],
            theme.colors.brand['500'],
            theme.colors.accent['600'],
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            padding: 24,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <AnimatedTouchable
            onPress={onAvatarPress}
            animationType="bounce"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Avatar
              size={72}
              showBorder={true}
              style={{
                borderColor: 'rgba(255,255,255,0.3)',
                borderWidth: 3,
              }}
            />
          </AnimatedTouchable>
          <View style={{ flex: 1, marginLeft: 20 }}>
            <Typography
              variant="h5"
              weight="bold"
              color="#FFFFFF"
              style={{ marginBottom: 4 }}
            >
              {profile?.display_name || 'User'}
            </Typography>
            <Typography
              variant="bodyMd"
              color="rgba(255,255,255,0.9)"
            >
              {user?.email || 'No email'}
            </Typography>
          </View>
          <TouchableOpacity
            onPress={onAvatarPress}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
            }}
          >
            <Typography
              variant="caption"
              weight="semibold"
              color="#FFFFFF"
            >
              Edit
            </Typography>
          </TouchableOpacity>
        </LinearGradient>
      </Card>
    </FadeInView>
  );
};

export const EnhancedSettingsScreen = ({ navigation }: EnhancedSettingsScreenProps) => {
  const { theme, colorScheme, toggleTheme } = useTheme();
  const { user, signOut, loading } = useAuth();
  const { profile, refetch } = useProfile();
  const [appVersion, setAppVersion] = useState<string>('');
  const [notifications, setNotifications] = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);

  useEffect(() => {
    setAppVersion('1.0.0');
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
    Alert.alert('Rate App', 'This would open the app store for rating.');
  };

  return (
    <SafeAreaView style={{
      flex: 1,
      backgroundColor: theme.colors.background,
    }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingHorizontal: 20,
          paddingVertical: 20,
          paddingBottom: 40 
        }}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView visible={true}>
          <Typography 
            variant="h1" 
            weight="bold"
            color={theme.colors.textPrimary}
            style={{ marginBottom: 24, fontSize: 32 }}
          >
            Settings
          </Typography>
        </FadeInView>

        <ProfileHeader 
          profile={profile}
          user={user}
          onAvatarPress={() => setShowAvatarPicker(true)}
        />

        <StaggeredView
          visible={true}
          staggerDelay={100}
          type="slide-up"
        >
          {/* Appearance Section */}
          <EnhancedSettingSection title="Appearance" delay={0}>
            <EnhancedSettingRow
              icon={Palette}
              iconBgColor={theme.colors.purple['500']}
              title="Theme"
              subtitle={colorScheme === 'light' ? 'Light mode' : 'Dark mode'}
              rightElement={<ThemeToggle size={56} />}
              isLast
            />
          </EnhancedSettingSection>

          {/* Account Section */}
          <EnhancedSettingSection title="Account" delay={100}>
            <EnhancedSettingRow
              icon={CreditCard}
              iconBgColor={theme.colors.green['500']}
              title="Subscription"
              subtitle="Manage your plan"
              onPress={() => navigation.navigate('CreditsPurchase')}
              showChevron
            />
            <EnhancedSettingRow
              icon={BarChart3}
              iconBgColor={theme.colors.blue['500']}
              title="Usage Analytics"
              subtitle="View your token usage"
              onPress={() => navigation.navigate('TokenUsageAnalytics')}
              showChevron
              isLast
            />
          </EnhancedSettingSection>

          {/* Preferences Section */}
          <EnhancedSettingSection title="Preferences" delay={200}>
            <EnhancedSettingRow
              icon={Bell}
              iconBgColor={theme.colors.orange['500']}
              title="Notifications"
              subtitle="Push notifications"
              rightElement={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ 
                    false: theme.colors.gray['300'], 
                    true: theme.colors.brand['400']
                  }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={theme.colors.gray['300']}
                />
              }
            />
            <EnhancedSettingRow
              icon={Bot}
              iconBgColor={theme.colors.brand['500']}
              title="Personas"
              subtitle="Manage AI personas"
              onPress={() => navigation.navigate('PersonaPicker')}
              showChevron
              isLast
            />
          </EnhancedSettingSection>

          {/* Support & About Section */}
          <EnhancedSettingSection title="Support & About" delay={300}>
            <EnhancedSettingRow
              icon={Star}
              iconBgColor={theme.colors.yellow['500']}
              title="Rate App"
              subtitle="Help us improve"
              onPress={handleRateApp}
              showChevron
            />
            <EnhancedSettingRow
              icon={MessageCircle}
              iconBgColor={theme.colors.cyan['500']}
              title="Contact Support"
              subtitle="Get help"
              onPress={handleSupport}
              showChevron
            />
            <EnhancedSettingRow
              icon={Shield}
              iconBgColor={theme.colors.gray['500']}
              title="Privacy Policy"
              onPress={handlePrivacyPolicy}
              showChevron
            />
            <EnhancedSettingRow
              icon={FileText}
              iconBgColor={theme.colors.gray['600']}
              title="Terms of Service"
              onPress={handleTermsOfService}
              showChevron
            />
            <EnhancedSettingRow
              icon={Info}
              iconBgColor={theme.colors.indigo['500']}
              title="App Version"
              subtitle={appVersion || '1.0.0'}
              isLast
            />
          </EnhancedSettingSection>

          {/* Debug Section (Admin only) */}
          {user?.email === 'testforge0890@gmail.com' && (
            <EnhancedSettingSection title="Developer" delay={400}>
              <EnhancedSettingRow
                icon={Search}
                iconBgColor={theme.colors.pink['500']}
                title="IAP Debug Tool"
                subtitle="Test in-app purchases"
                onPress={() => navigation.navigate('IAPDebug')}
                showChevron
              />
              <EnhancedSettingRow
                icon={Wrench}
                iconBgColor={theme.colors.teal['500']}
                title="Tools Debug"
                subtitle="View available AI tools"
                onPress={() => navigation.navigate('ToolsDebug')}
                showChevron
              />
              <EnhancedSettingRow
                icon={Stethoscope}
                iconBgColor={theme.colors.red['500']}
                title="Database Diagnostics"
                subtitle="Check database health"
                onPress={() => navigation.navigate('DatabaseDiagnostic')}
                showChevron
                isLast
              />
            </EnhancedSettingSection>
          )}

          {/* Sign Out Section */}
          <EnhancedSettingSection title="Account Actions" delay={500}>
            <EnhancedSettingRow
              icon={LogOut}
              iconBgColor={theme.colors.red['500']}
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
              isLast
            />
          </EnhancedSettingSection>
        </StaggeredView>

        <FadeInView visible={true} delay={600}>
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <Typography 
              variant="bodySm" 
              color={theme.colors.textSecondary}
              style={{ textAlign: 'center' }}
            >
              Made with ❤️ using T3 Stack
            </Typography>
          </View>
        </FadeInView>
      </ScrollView>

      {/* Avatar Picker Modal */}
      <Modal
        visible={showAvatarPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <AvatarPicker 
          onClose={() => {
            setShowAvatarPicker(false);
            setTimeout(() => {
              refetch();
              setAvatarRefreshKey(prev => prev + 1);
            }, 100);
          }} 
        />
      </Modal>
    </SafeAreaView>
  );
};