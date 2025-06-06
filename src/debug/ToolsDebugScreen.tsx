import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { Typography, Surface } from '../ui/atoms';
import { useAvailableTools } from '../hooks/useAvailableTools';
import { ToolSelector } from '../components/ToolSelector';

export const ToolsDebugScreen = () => {
  const { theme } = useTheme();
  const { tools, loading, error, refetch } = useAvailableTools();
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <Typography variant="bodyLg" color={theme.colors.textSecondary}>
            Loading tools...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <Typography variant="h6" color={theme.colors.danger['600']} style={styles.marginBottom}>
            Error Loading Tools
          </Typography>
          <Typography variant="bodyMd" color={theme.colors.textSecondary} align="center">
            {error}
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Typography variant="h5" weight="bold" color={theme.colors.textPrimary} style={styles.title}>
          Tools Debug - Interactive Selector
        </Typography>
        
        <Typography variant="bodySm" color={theme.colors.textSecondary} style={styles.subtitle}>
          Test the tool selector component that will be used in persona creation
        </Typography>

        <ToolSelector
          selectedTools={selectedTools}
          onToolsChange={setSelectedTools}
        />

        {/* Debug Info */}
        <Surface style={styles.debugInfo}>
          <Typography variant="bodyMd" weight="semibold" color={theme.colors.textPrimary}>
            Debug Info:
          </Typography>
          <Typography variant="bodySm" color={theme.colors.textSecondary}>
            Selected: {selectedTools.length > 0 ? selectedTools.join(', ') : 'None'}
          </Typography>
          <Typography variant="bodySm" color={theme.colors.textSecondary}>
            Total tools available: {tools.length}
          </Typography>
        </Surface>
      </View>
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
  contentContainer: {
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  toolCard: {
    padding: 16,
    marginBottom: 12,
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  description: {
    marginBottom: 8,
  },
  toolDetails: {
    gap: 2,
  },
  marginBottom: {
    marginBottom: 8,
  },
  marginTop: {
    marginTop: 8,
  },
});