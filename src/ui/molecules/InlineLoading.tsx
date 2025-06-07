import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AILoadingAnimation } from '../atoms/AILoadingAnimation';
import { Typography } from '../atoms/Typography';
import { useTheme } from '../../components/ThemeProvider';

interface InlineLoadingProps {
  message?: string;
  size?: number;
  showMessage?: boolean;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message = 'Loading...',
  size = 60,
  showMessage = true,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <AILoadingAnimation size={size} />
      {showMessage && (
        <Typography 
          variant="caption" 
          style={[styles.message, { color: theme.colors.textSecondary }]}
        >
          {message}
        </Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  message: {
    marginTop: 8,
    textAlign: 'center',
  },
});
