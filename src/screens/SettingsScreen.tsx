
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { Typography, Surface } from '../ui/atoms';
import { useAuth } from '../providers/AuthProvider';

interface SettingsScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export const SettingsScreen = ({ navigation }: SettingsScreenProps) => {
  const { theme } = useTheme();
  const { user, signOut, loading } = useAuth();

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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Typography 
          variant="h2" 
          weight="bold"
          style={styles.title}
        >
          Settings
        </Typography>

        <Surface elevation={1} style={styles.section}>
          <View style={styles.userInfo}>
            <Typography variant="bodyLg" weight="medium">
              Signed in as
            </Typography>
            <Typography 
              variant="bodyMd" 
              color={theme.colors.textSecondary}
            >
              {user?.email || 'Unknown user'}
            </Typography>
          </View>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={loading}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Surface>

        {__DEV__ && (
          <View style={styles.debugSection}>
            <Surface elevation={1} style={styles.section}>
              <TouchableOpacity
                style={styles.debugButton}
                onPress={() => navigation.navigate('IAPDebug')}
              >
                <Text style={styles.debugText}>🔍 IAP Debug Tool</Text>
              </TouchableOpacity>
            </Surface>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    marginBottom: 24,
  },
  section: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  userInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  signOutButton: {
    padding: 20,
    alignItems: 'center',
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
  },
  debugSection: {
    marginTop: 16,
  },
  debugButton: {
    padding: 20,
    alignItems: 'center',
  },
  debugText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
