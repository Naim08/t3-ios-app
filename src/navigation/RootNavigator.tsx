import React, { useRef, useMemo } from 'react';
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
import { PersonaPickerScreen } from '../personas/PersonaPickerScreen';
import { PersonaCreateScreen } from '../personas/PersonaCreateScreen';
import { ConversationListScreen } from '../conversations/ConversationListScreen';
import { useTheme } from '../components/ThemeProvider';
import { AuthGate } from '../auth/AuthGate';
import { PersonaProvider } from '../context/PersonaContext';
import { Typography } from '../ui/atoms';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { theme, colorScheme } = useTheme();
  const renderCount = useRef(0);
  renderCount.current += 1;

  console.log(`🗂️ RootNavigator render #${renderCount.current}`, {
    colorScheme,
    backgroundTheme: theme.colors.background
  });

  // MEMOIZE the navigation theme to prevent unnecessary re-renders
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
  }), [colorScheme, theme.colors.brand, theme.colors.background, theme.colors.surface, theme.colors.textPrimary, theme.colors.border, theme.colors.danger]);

  return (
    <PersonaProvider>
      <NavigationContainer theme={navigationTheme}>
        <AuthGate>
          <Stack.Navigator>
            <Stack.Screen
              name="ConversationList"
              component={ConversationListScreen}
              options={({ navigation }) => ({
                title: 'Chats',
                headerLeft: () => (
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('Settings')}
                    style={{ marginLeft: 10 }}
                  >
                    <Typography variant="h3" color="#007AFF">
                      ⚙️
                    </Typography>
                  </TouchableOpacity>
                ),
                headerRight: () => (
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('PersonaPicker')}
                    style={{ marginRight: 10 }}
                  >
                    <Typography variant="h3" color="#007AFF">
                      +
                    </Typography>
                  </TouchableOpacity>
                ),
              })}
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
              options={({ navigation, route }) => ({
                headerTitle: () => {
                  // This will be updated dynamically by the ChatScreen component
                  return null;
                },
                headerRight: () => (
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('CreditsPurchase')}
                    style={{ marginRight: 10 }}
                  >
                    <Typography variant="bodySm" color="#007AFF">
                      Credits
                    </Typography>
                  </TouchableOpacity>
                ),
                title: 'Chat',
                // Prevent screen from remounting when navigating with different params
                freezeOnBlur: false,
              })}
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
          </Stack.Navigator>
        </AuthGate>
      </NavigationContainer>
    </PersonaProvider>
  );
};
