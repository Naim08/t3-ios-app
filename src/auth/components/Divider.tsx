import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../components/ThemeProvider';
import { authModalStyles } from '../styles/authModalStyles';

interface DividerProps {
  text?: string;
}

export const Divider: React.FC<DividerProps> = ({ text = 'OR' }) => {
  const { theme } = useTheme();

  return (
    <View style={authModalStyles.dividerContainer}>
      <View style={[authModalStyles.divider, { backgroundColor: theme.colors.border }]} />
      <Text style={[authModalStyles.dividerText, { color: theme.colors.textSecondary }]}>
        {text}
      </Text>
      <View style={[authModalStyles.divider, { backgroundColor: theme.colors.border }]} />
    </View>
  );
};