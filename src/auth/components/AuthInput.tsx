import React from 'react';
import { View, TextInput, TextInputProps } from 'react-native';
import { Mail, Lock, User } from 'lucide-react-native';
import { useTheme } from '../../components/ThemeProvider';
import { authModalStyles } from '../styles/authModalStyles';

interface AuthInputProps extends Omit<TextInputProps, 'style'> {
  icon: 'mail' | 'lock' | 'user';
  hasError?: boolean;
}

const getIconComponent = (icon: AuthInputProps['icon'], theme: any): React.ReactElement => {
  const iconProps = { 
    size: 20, 
    color: theme.colors.textSecondary, 
    strokeWidth: 2 
  };
  
  switch (icon) {
    case 'mail':
      return <Mail {...iconProps} />;
    case 'lock':
      return <Lock {...iconProps} />;
    case 'user':
      return <User {...iconProps} />;
    default:
      return <Mail {...iconProps} />;
  }
};

export const AuthInput: React.FC<AuthInputProps> = ({
  icon,
  hasError = false,
  ...textInputProps
}) => {
  const { theme } = useTheme();

  return (
    <View 
      style={[
        authModalStyles.inputWrapper, 
        { 
          borderColor: hasError 
            ? 'rgba(255, 107, 107, 0.6)' 
            : textInputProps.value 
              ? theme.colors.brand['400'] 
              : 'rgba(0, 0, 0, 0.1)' 
        }
      ]}
    >
      <View style={authModalStyles.inputIcon}>
        {getIconComponent(icon, theme)}
      </View>
      <TextInput
        style={[authModalStyles.input, { color: theme.colors.textPrimary }]}
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        {...textInputProps}
      />
    </View>
  );
};