
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

export const SettingsScreen = () => {
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
});
