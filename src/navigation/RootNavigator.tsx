import React, { useRef, useMemo, useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { DemoScreen } from '../screens/DemoScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChatScreen } from '../chat';
import { PaywallScreen } from '../paywall/PaywallScreen';
import { CreditsPurchaseScreen } from '../credits/CreditsPurchaseScreen';
import { IAPDebugScreen } from '../debug/IAPDebugScreen';
import { ToolsDebugScreen } from '../debug/ToolsDebugScreen';
import { PersonaPickerScreen } from '../personas/PersonaPickerScreen';
import { PersonaCreateScreen } from '../personas/PersonaCreateScreen';
import { ConversationListScreen } from '../conversations/ConversationListScreen';
import { useTheme } from '../components/ThemeProvider';
import { AuthGate } from '../auth/AuthGate';
import { PersonaProvider } from '../context/PersonaContext';
import { IconButton, Typography } from '../ui/atoms';

const Stack = createNativeStackNavigator();

// Memoized header button styles to prevent re-creation
const headerLeftStyle = { marginLeft: 16 };
const headerRightStyle = { marginRight: 16 };

export const RootNavigator = () => {
  const { theme, colorScheme } = useTheme();
  const renderCount = useRef(0);
  renderCount.current += 1;

  // MEMOIZE the navigation theme to prevent unnecessary re-renders
  // Reduce dependencies by only depending on colorScheme and theme (which is already memoized)
  const navigationTheme = useMemo(() => ({
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.colors.brand['500'],
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.danger['600'],
    },
  }), [colorScheme, theme]);

  // Memoize screen options to prevent re-creation
  const conversationListOptions = useCallback(({ navigation }: any) => ({
    title: 'Chats',
    headerLeft: () => (
      <IconButton
        icon="settings"
        onPress={() => navigation.navigate('Settings')}
        variant="gradient"
        size="sm"
        style={headerLeftStyle}
      />
    ),
    headerRight: () => (
      <IconButton
        icon="plus"
        onPress={() => navigation.navigate('PersonaPicker')}
        variant="gradient"
        size="sm"
        style={headerRightStyle}
      />
    ),
  }), []);

  const chatScreenOptions = useCallback(({ navigation, route }: any) => ({
    headerTitle: () => null, // This will be updated dynamically by the ChatScreen component
    headerLeft: () => (
      <IconButton
        icon="chevron-left"
        onPress={() => navigation.goBack()}
        variant="ghost"
        size="sm"
        style={headerLeftStyle}
      />
    ),
    headerRight: () => (
      <IconButton
        icon="settings"
        onPress={() => {
          // The ChatScreen will handle opening the settings modal
          // This is a placeholder that will be overridden by the screen
        }}
        variant="ghost"
        size="sm"
        style={headerRightStyle}
      />
    ),
    title: 'Chat',
    // Prevent screen from remounting when navigating with different params
    freezeOnBlur: false,
  }), []);

  return (
    <PersonaProvider>
      <NavigationContainer theme={navigationTheme}>
        <AuthGate>
          <Stack.Navigator
            id={undefined}
          >
            <Stack.Screen
              name="ConversationList"
              component={ConversationListScreen}
              options={conversationListOptions}
            />
            <Stack.Screen
              name="PersonaPicker"
              component={PersonaPickerScreen}
              options={{ title: 'AI Assistant' }}
            />
            <Stack.Screen
              name="PersonaCreate"
              component={PersonaCreateScreen}
              options={{ title: 'Create Custom' }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={chatScreenOptions}
            />
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'Pocket T3' }}
            />
            <Stack.Screen
              name="Demo"
              component={DemoScreen}
              options={{ title: 'Design System Demo' }}
            />
            <Stack.Screen
              name="Paywall"
              component={PaywallScreen}
              options={{ title: 'Premium Access' }}
            />
            <Stack.Screen
              name="CreditsPurchase"
              component={CreditsPurchaseScreen}
              options={{ title: 'Purchase Credits' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            <Stack.Screen
              name="IAPDebug"
              component={IAPDebugScreen}
              options={{ title: 'IAP Debug' }}
            />
            <Stack.Screen
              name="ToolsDebug"
              component={ToolsDebugScreen}
              options={{ title: 'Tools Debug' }}
            />
          </Stack.Navigator>
        </AuthGate>
      </NavigationContainer>
    </PersonaProvider>
  );
};
