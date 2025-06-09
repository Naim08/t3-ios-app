
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
import { useTheme } from '../components/ThemeProvider';
import { Typography, Avatar } from '../ui/atoms';
import { useAuth } from '../providers/AuthProvider';
import { useProfile } from '../hooks/useProfile';
import { AvatarPicker } from '../components/AvatarPicker';
import { ThemeToggle } from '../components/ThemeToggle';

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
  icon?: React.ComponentType<any>; // Lucide icon component
}

const SettingRow = ({ 
  title, 
  subtitle, 
  onPress, 
  rightElement, 
  showChevron = false,
  icon 
}: SettingRowProps) => {
  const { theme, colorScheme } = useTheme();
  
  return (
    <TouchableOpacity 
      className={`border-b ${colorScheme === 'dark' ? 'border-gray-700' : 'border-gray-200'} ${!onPress ? 'opacity-60' : ''}`}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center px-4 py-4 min-h-[52px]">
        {icon && (
          <View className="mr-3 w-6 items-center justify-center">
            {React.createElement(icon, { 
              size: 20, 
              color: colorScheme === 'dark' ? '#E5E7EB' : theme.colors.gray['600']
            })}
          </View>
        )}
        <View className="flex-1">
          <Typography variant="bodyLg" weight="medium" className={colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}>
            {title}
          </Typography>
          {subtitle && (
            <Typography 
              variant="bodySm" 
              className={`${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}
            >
              {subtitle}
            </Typography>
          )}
        </View>
        {rightElement && (
          <View className="ml-3">
            {rightElement}
          </View>
        )}
        {showChevron && (
          <View className="ml-2">
            <ChevronRight 
              size={16} 
              color={colorScheme === 'dark' ? '#D1D5DB' : theme.colors.gray['500']} 
            />
          </View>
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
  const { colorScheme } = useTheme();
  
  return (
    <View className="mb-6">
      <Typography 
        variant="bodySm" 
        weight="medium"
        className={`${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-2 px-1 tracking-wider`}
      >
        {title.toUpperCase()}
      </Typography>
      <View className={`${colorScheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl overflow-hidden shadow-sm border`}>
        {children}
      </View>
    </View>
  );
};

export const SettingsScreen = ({ navigation }: SettingsScreenProps) => {
  const { theme, colorScheme, toggleTheme } = useTheme();
  const { user, signOut, loading } = useAuth();
  const { profile, getAvatarUrl, refetch } = useProfile();
  const [appVersion, setAppVersion] = useState<string>('');
  const [notifications, setNotifications] = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);

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
    <SafeAreaView className={`flex-1 ${colorScheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <ScrollView 
        className="flex-1"
        contentContainerClassName="p-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Typography 
          variant="h2" 
          weight="bold"
          className={`${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6 px-1`}
        >
          Settings
        </Typography>

        {/* Appearance Section */}
        <SettingSection title="Appearance">
          <SettingRow
            icon={Palette}
            title="Theme"
            subtitle={colorScheme === 'light' ? 'Light mode' : 'Dark mode'}
            rightElement={
              <ThemeToggle size={56} />
            }
          />
        </SettingSection>

        {/* Account Section */}
        <SettingSection title="Account">
          <SettingRow
            icon={User}
            title="Profile"
            subtitle={user?.email || 'Unknown user'}
            onPress={() => setShowAvatarPicker(true)}
            rightElement={
              <Avatar
                key={`${profile?.avatar_url || profile?.default_avatar_id || 'default'}-${avatarRefreshKey}`}
                size={40}
                showBorder={true}
                accessibilityLabel="Current profile picture"
              />
            }
            showChevron
          />
          <SettingRow
            icon={CreditCard}
            title="Subscription"
            subtitle="Manage your plan"
            onPress={() => navigation.navigate('CreditsPurchase')}
            showChevron
          />
          <SettingRow
            icon={BarChart3}
            title="Usage Analytics"
            subtitle="View your token usage"
            onPress={() => navigation.navigate('TokenUsageAnalytics')}
            showChevron
          />
        </SettingSection>

        {/* Preferences Section */}
        <SettingSection title="Preferences">
          <SettingRow
            icon={Bell}
            title="Notifications"
            subtitle="Push notifications"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ 
                  false: '#d1d5db', 
                  true: '#3b82f6' 
                }}
                thumbColor="#ffffff"
                ios_backgroundColor="#d1d5db"
              />
            }
          />
          <SettingRow
            icon={Bot}
            title="Personas"
            subtitle="Manage AI personas"
            onPress={() => navigation.navigate('PersonaPicker')}
            showChevron
          />
        </SettingSection>

        {/* Support & About Section */}
        <SettingSection title="Support & About">
          <SettingRow
            icon={Star}
            title="Rate App"
            subtitle="Help us improve"
            onPress={handleRateApp}
            showChevron
          />
          <SettingRow
            icon={MessageCircle}
            title="Contact Support"
            subtitle="Get help"
            onPress={handleSupport}
            showChevron
          />
          <SettingRow
            icon={Shield}
            title="Privacy Policy"
            onPress={handlePrivacyPolicy}
            showChevron
          />
          <SettingRow
            icon={FileText}
            title="Terms of Service"
            onPress={handleTermsOfService}
            showChevron
          />
          <SettingRow
            icon={Info}
            title="App Version"
            subtitle={appVersion || '1.0.0'}
          />
        </SettingSection>

        {/* Debug Section (Dev only) */}
        {__DEV__ && (
          <SettingSection title="Developer">
            <SettingRow
              icon={Search}
              title="IAP Debug Tool"
              subtitle="Test in-app purchases"
              onPress={() => navigation.navigate('IAPDebug')}
              showChevron
            />
            <SettingRow
              icon={Wrench}
              title="Tools Debug"
              subtitle="View available AI tools"
              onPress={() => navigation.navigate('ToolsDebug')}
              showChevron
            />
            <SettingRow
              icon={Stethoscope}
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
            icon={LogOut}
            title="Sign Out"
            onPress={handleSignOut}
            rightElement={
              loading ? (
                <Typography 
                  variant="bodySm" 
                  className={colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
                >
                  Loading...
                </Typography>
              ) : null
            }
          />
        </SettingSection>

        <View className="items-center mt-8 mb-4">
          <Typography 
            variant="bodySm" 
            className={`${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center`}
          >
            Made with ❤️ using T3 Stack
          </Typography>
        </View>
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
            // Refresh profile data and force avatar re-render
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

