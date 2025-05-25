import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  SafeAreaView,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../components/ThemeProvider';
import {
  Typography,
  PrimaryButton,
  TextField,
  Surface,
} from '../ui/atoms';

export const DemoScreen = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [textValue, setTextValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailBlur = () => {
    setEmailTouched(true);
    if (emailValue && !emailValue.includes('@')) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
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
        {/* Typography Section */}
        <Surface elevation={2} padding="lg" style={styles.section}>
          <Typography variant="h3" weight="bold" style={styles.sectionTitle}>
            Typography Showcase
          </Typography>
          
          <Typography variant="h1" weight="bold" style={styles.item}>
            Heading 1 - Bold
          </Typography>
          <Typography variant="h2" weight="semibold" style={styles.item}>
            Heading 2 - Semibold
          </Typography>
          <Typography variant="h3" weight="medium" style={styles.item}>
            Heading 3 - Medium
          </Typography>
          <Typography variant="bodyLg" style={styles.item}>
            Body Large - Regular text with proper line height and spacing.
          </Typography>
          <Typography variant="bodyMd" style={styles.item}>
            Body Medium - The default text size for most content.
          </Typography>
          <Typography variant="bodySm" color={theme.colors.textSecondary} style={styles.item}>
            Body Small - Secondary text in muted color.
          </Typography>
          <Typography variant="caption" color={theme.colors.textSecondary}>
            Caption - Smallest text for labels and hints.
          </Typography>
        </Surface>

        {/* Buttons Section */}
        <Surface elevation={2} padding="lg" style={styles.section}>
          <Typography variant="h3" weight="bold" style={styles.sectionTitle}>
            Button Variants
          </Typography>
          
          <PrimaryButton
            title="Primary Button"
            onPress={() => console.log('Primary pressed')}
            style={styles.button}
          />
          
          <PrimaryButton
            title="Secondary Button"
            variant="secondary"
            onPress={() => console.log('Secondary pressed')}
            style={styles.button}
          />
          
          <PrimaryButton
            title="Outline Button"
            variant="outline"
            onPress={() => console.log('Outline pressed')}
            style={styles.button}
          />
          
          <PrimaryButton
            title="Ghost Button"
            variant="ghost"
            onPress={() => console.log('Ghost pressed')}
            style={styles.button}
          />
          
          <View style={styles.buttonRow}>
            <PrimaryButton
              title="Small"
              size="small"
              onPress={() => console.log('Small pressed')}
              style={[styles.button, styles.buttonInRow]}
            />
            <PrimaryButton
              title="Medium"
              size="medium"
              onPress={() => console.log('Medium pressed')}
              style={[styles.button, styles.buttonInRow]}
            />
            <PrimaryButton
              title="Large"
              size="large"
              onPress={() => console.log('Large pressed')}
              style={[styles.button, styles.buttonInRow]}
            />
          </View>
          
          <PrimaryButton
            title="Disabled Button"
            disabled
            onPress={() => console.log('This should not fire')}
            style={styles.button}
          />
          
          <PrimaryButton
            title={isLoading ? '' : 'Loading Demo'}
            loading={isLoading}
            onPress={handleLoadingDemo}
            style={styles.button}
          />
        </Surface>

        {/* Text Fields Section */}
        <Surface elevation={2} padding="lg" style={styles.section}>
          <Typography variant="h3" weight="bold" style={styles.sectionTitle}>
            Text Input Fields
          </Typography>
          
          <TextField
            label="Basic Text Field"
            placeholder="Enter some text..."
            value={textValue}
            onChangeText={setTextValue}
            style={styles.textField}
          />
          
          <TextField
            label="Email Address"
            placeholder="your.email@example.com"
            value={emailValue}
            onChangeText={(text) => {
              setEmailValue(text);
              if (emailTouched && emailError) {
                setEmailError('');
              }
            }}
            onBlur={handleEmailBlur}
            error={emailError}
            touched={emailTouched}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={styles.textField}
          />
          
          <TextField
            label="Password"
            placeholder="Enter your password"
            value={passwordValue}
            onChangeText={setPasswordValue}
            secureTextEntry
            showPasswordToggle
            autoComplete="password"
            style={styles.textField}
          />
          
          <TextField
            label="Disabled Field"
            placeholder="This field is disabled"
            value="Cannot edit this"
            onChangeText={() => {}}
            editable={false}
            style={styles.textField}
          />
        </Surface>

        {/* Surface Elevation Section */}
        <Surface elevation={2} padding="lg" style={styles.section}>
          <Typography variant="h3" weight="bold" style={styles.sectionTitle}>
            Surface Elevations
          </Typography>
          
          <View style={styles.elevationRow}>
            <Surface elevation={0} padding="md" style={styles.elevationCard}>
              <Typography variant="bodySm" align="center">Elevation 0</Typography>
            </Surface>
            <Surface elevation={1} padding="md" style={styles.elevationCard}>
              <Typography variant="bodySm" align="center">Elevation 1</Typography>
            </Surface>
            <Surface elevation={2} padding="md" style={styles.elevationCard}>
              <Typography variant="bodySm" align="center">Elevation 2</Typography>
            </Surface>
          </View>
          
          <View style={styles.elevationRow}>
            <Surface elevation={3} padding="md" style={styles.elevationCard}>
              <Typography variant="bodySm" align="center">Elevation 3</Typography>
            </Surface>
            <Surface elevation={4} padding="md" style={styles.elevationCard}>
              <Typography variant="bodySm" align="center">Elevation 4</Typography>
            </Surface>
            <Surface elevation={5} padding="md" style={styles.elevationCard}>
              <Typography variant="bodySm" align="center">Elevation 5</Typography>
            </Surface>
          </View>
        </Surface>

        {/* Theme Toggle */}
        <Surface elevation={3} padding="lg" style={styles.section}>
          <Typography variant="h3" weight="bold" style={styles.sectionTitle}>
            Theme Controls
          </Typography>
          <Typography variant="bodyMd" style={styles.item}>
            Toggle between light and dark themes to see the design system in action.
          </Typography>
          <PrimaryButton
            title={t('toggleTheme')}
            onPress={toggleTheme}
            variant="accent"
            size="large"
          />
        </Surface>
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
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  item: {
    marginBottom: 8,
  },
  button: {
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  buttonInRow: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 0,
  },
  textField: {
    marginBottom: 16,
  },
  elevationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  elevationCard: {
    flex: 1,
    marginHorizontal: 4,
    minHeight: 60,
    justifyContent: 'center',
  },
});
