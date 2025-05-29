import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  AccessibilityProps,
} from 'react-native';
import { useTheme } from '../../components/ThemeProvider';
import { Typography } from './Typography';

export interface TextFieldProps extends AccessibilityProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
  touched?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'off' | 'username' | 'password' | 'email' | 'name' | 'tel' | 'street-address' | 'postal-code';
  autoFocus?: boolean;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  testID?: string;
  showPasswordToggle?: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  onFocus,
  error,
  touched = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete = 'off',
  autoFocus = false,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style,
  inputStyle,
  testID,
  showPasswordToggle = false,
  accessibilityLabel,
  accessibilityHint,
  ...accessibilityProps
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const showError = touched && !!error;
  const isSecure = secureTextEntry && !isPasswordVisible;

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const getContainerStyle = (): ViewStyle => {
    const baseStyle = {
      borderWidth: 1,
      borderRadius: 8,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    };

    if (showError) {
      return {
        ...baseStyle,
        borderColor: theme.colors.danger['600'],
      };
    }

    if (isFocused) {
      return {
        ...baseStyle,
        borderColor: theme.colors.brand['500'],
        borderWidth: 2,
      };
    }

    if (!editable) {
      return {
        ...baseStyle,
        backgroundColor: theme.colors.gray['100'],
        borderColor: theme.colors.gray['300'],
      };
    }

    return baseStyle;
  };

  const getInputStyle = (): TextStyle => {
    return {
      ...styles.input,
      color: editable ? theme.colors.textPrimary : theme.colors.textSecondary,
      fontSize: theme.typography.scale.bodyMd.fontSize,
      lineHeight: theme.typography.scale.bodyMd.lineHeight,
      fontFamily: theme.typography.fontFamily.regular,
      ...inputStyle,
    };
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Typography
          variant="bodySm"
          weight="medium"
          color={showError ? theme.colors.danger['600'] : theme.colors.textSecondary}
          style={styles.label}
        >
          {label}
        </Typography>
      )}
      
      <View style={[styles.inputContainer, getContainerStyle()]}>
        <TextInput
          style={getInputStyle()}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          testID={testID}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint}
          allowFontScaling={true}
          {...accessibilityProps}
        />
        
        {secureTextEntry && showPasswordToggle && (
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={togglePasswordVisibility}
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            testID={`${testID}-password-toggle`}
          >
            <Typography
              variant="bodySm"
              color={theme.colors.textSecondary}
            >
              {isPasswordVisible ? '🙈' : '👁️'}
            </Typography>
          </TouchableOpacity>
        )}
      </View>
      
      {showError && (
        <Typography
          variant="bodyXs"
          color={theme.colors.danger['600']}
          style={styles.errorText}
        >
          {error}
        </Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  label: {
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    margin: 0,
    textAlignVertical: 'top',
  },
  passwordToggle: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
});
