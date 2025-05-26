import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { DemoScreen } from '../screens/DemoScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChatScreen } from '../chat';
import { PaywallScreen } from '../paywall/PaywallScreen';
import { CreditsPurchaseScreen } from '../credits/CreditsPurchaseScreen';
import { useTheme } from '../components/ThemeProvider';
import { AuthGate } from '../auth/AuthGate';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { theme, colorScheme } = useTheme();

  return (
    <NavigationContainer
      theme={{
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
      }}
    >
      <AuthGate>
        <Stack.Navigator>
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
            name="Chat"
            component={ChatScreen}
            options={{ title: 'AI Assistant' }}
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
        </Stack.Navigator>
      </AuthGate>
    </NavigationContainer>
  );
};
