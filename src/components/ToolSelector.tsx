import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from './ThemeProvider';
import { Typography, Surface } from '../ui/atoms';
import { useAvailableTools } from '../hooks/useAvailableTools';
import { Tool } from '../context/PersonaContext';

interface ToolSelectorProps {
  selectedTools: string[];
  onToolsChange: (toolIds: string[]) => void;
  disabled?: boolean;
}

interface ToolCardProps {
  tool: Tool;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const ToolCard = ({ tool, isSelected, onToggle, disabled }: ToolCardProps) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Surface
        style={[
          styles.toolCard,
          isSelected && {
            borderColor: theme.colors.brand['500'],
            borderWidth: 2,
            backgroundColor: theme.colors.brand['50'],
          },
          disabled && styles.disabledCard,
        ]}
      >
        <View style={styles.toolCardHeader}>
          <View style={styles.toolCardTitle}>
            <View style={styles.checkbox}>
              {isSelected && (
                <Typography variant="bodySm" color={theme.colors.brand['500']}>
                  ✓
                </Typography>
              )}
            </View>
            <Typography
              variant="bodyMd"
              weight="semibold"
              color={isSelected ? theme.colors.brand['700'] : theme.colors.textPrimary}
              style={styles.toolName}
            >
              {tool.name}
            </Typography>
          </View>

          <View style={styles.badges}>
            <View style={[styles.costBadge, { backgroundColor: theme.colors.gray['100'] }]}>
              <Typography variant="caption" color={theme.colors.textSecondary}>
                {tool.cost_tokens} tokens
              </Typography>
            </View>
            {tool.requires_premium && (
              <View style={[styles.premiumBadge, { backgroundColor: theme.colors.brand['100'] }]}>
                <Typography variant="caption" color={theme.colors.brand['700']}>
                  Premium
                </Typography>
              </View>
            )}
          </View>
        </View>

        <Typography
          variant="bodySm"
          color={isSelected ? theme.colors.brand['600'] : theme.colors.textSecondary}
          style={styles.toolDescription}
        >
          {tool.description}
        </Typography>
      </Surface>
    </TouchableOpacity>
  );
};

export const ToolSelector = ({ selectedTools, onToolsChange, disabled }: ToolSelectorProps) => {
  const { theme } = useTheme();
  const { tools, loading, error } = useAvailableTools();
  const [estimatedCost, setEstimatedCost] = useState(0);

  // Calculate estimated cost when selected tools change
  useEffect(() => {
    const totalCost = selectedTools.reduce((sum, toolId) => {
      const tool = tools.find(t => t.id === toolId);
      return sum + (tool?.cost_tokens || 0);
    }, 0);
    setEstimatedCost(totalCost);
  }, [selectedTools, tools]);

  const handleToolToggle = (toolId: string) => {
    if (disabled) return;

    const isCurrentlySelected = selectedTools.includes(toolId);
    let newSelection: string[];

    if (isCurrentlySelected) {
      // Remove tool
      newSelection = selectedTools.filter(id => id !== toolId);
    } else {
      // Add tool
      newSelection = [...selectedTools, toolId];
    }

    onToolsChange(newSelection);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Typography variant="h6" weight="semibold" style={styles.title}>
          Tools & Capabilities
        </Typography>
        <View style={styles.loadingContainer}>
          <Typography variant="bodyMd" color={theme.colors.textSecondary}>
            Loading available tools...
          </Typography>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Typography variant="h6" weight="semibold" style={styles.title}>
          Tools & Capabilities
        </Typography>
        <Surface style={styles.errorContainer}>
          <Typography variant="bodyMd" color={theme.colors.danger['600']}>
            Error loading tools: {error}
          </Typography>
        </Surface>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h6" weight="semibold" style={styles.title}>
          Tools & Capabilities
        </Typography>
        <Typography variant="bodySm" color={theme.colors.textSecondary} style={styles.subtitle}>
          Choose which tools this persona can access during conversations
        </Typography>
      </View>

      {tools.length === 0 ? (
        <Surface style={styles.emptyState}>
          <Typography variant="bodyMd" color={theme.colors.textSecondary} align="center">
            No tools are currently available
          </Typography>
        </Surface>
      ) : (
        <>
          <ScrollView style={styles.toolsList} showsVerticalScrollIndicator={false}>
            {tools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isSelected={selectedTools.includes(tool.id)}
                onToggle={() => handleToolToggle(tool.id)}
                disabled={disabled}
              />
            ))}
          </ScrollView>

          {/* Cost estimation */}
          {selectedTools.length > 0 && (
            <Surface style={styles.costEstimation}>
              <View style={styles.costHeader}>
                <Typography variant="bodyMd" weight="medium" color={theme.colors.textPrimary}>
                  Estimated Cost per Use
                </Typography>
                <Typography variant="bodyLg" weight="bold" color={theme.colors.brand['600']}>
                  {estimatedCost} tokens
                </Typography>
              </View>
              <Typography variant="caption" color={theme.colors.textSecondary}>
                This is the estimated token cost if all selected tools are used in one conversation
              </Typography>
            </Surface>
          )}

          {selectedTools.length === 0 && (
            <Surface style={styles.noSelectionInfo}>
              <Typography variant="bodySm" color={theme.colors.textSecondary} align="center">
                💡 Your persona will work without tools, but won't have access to real-time information
              </Typography>
            </Surface>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    lineHeight: 18,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 16,
    marginVertical: 8,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  toolsList: {
    flex: 1,
    marginBottom: 16,
  },
  toolCard: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  disabledCard: {
    opacity: 0.6,
  },
  toolCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  toolCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolName: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  costBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  toolDescription: {
    lineHeight: 18,
  },
  costEstimation: {
    padding: 16,
    marginBottom: 8,
  },
  costHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noSelectionInfo: {
    padding: 16,
    marginBottom: 8,
  },
});