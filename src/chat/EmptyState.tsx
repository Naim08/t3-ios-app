
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { Typography, Surface } from '../ui/atoms';

export const EmptyState: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Surface elevation={1} style={styles.card}>
        <View style={styles.iconContainer}>
          <View style={[styles.icon, { backgroundColor: theme.colors.brand['500'] }]}>
            <Typography variant="h2" color="#FFFFFF" align="center">
              💬
            </Typography>
          </View>
        </View>
        
        <Typography
          variant="h3"
          weight="semibold"
          align="center"
          style={styles.title}
        >
          Start a conversation
        </Typography>
        
        <Typography
          variant="bodyMd"
          color={theme.colors.textSecondary}
          align="center"
          style={styles.subtitle}
        >
          Ask me anything about React Native, development tips, or how to optimize your app.
        </Typography>
        
        <View style={styles.suggestions}>
          <Surface elevation={0} style={{
            ...styles.suggestion,
            borderColor: theme.colors.border
          }}>
            <Typography variant="bodySm" color={theme.colors.textSecondary}>
              💡 "How do I optimize my app performance?"
            </Typography>
          </Surface>
          
          <Surface elevation={0} style={{
            ...styles.suggestion,
            borderColor: theme.colors.border
          }}>
            <Typography variant="bodySm" color={theme.colors.textSecondary}>
              🚀 "What are React Native best practices?"
            </Typography>
          </Surface>
          
          <Surface elevation={0} style={{
            ...styles.suggestion,
            borderColor: theme.colors.border
          }}>
            <Typography variant="bodySm" color={theme.colors.textSecondary}>
              🔧 "Help me debug this issue..."
            </Typography>
          </Surface>
        </View>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    padding: 32,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    lineHeight: 22,
  },
  suggestions: {
    gap: 12,
  },
  suggestion: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});
