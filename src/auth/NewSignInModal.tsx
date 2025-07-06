import React from 'react';
import { View, Text } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '../components/ThemeProvider';
import { supabase } from '../lib/supabase';
import { BaseAuthModalProps } from './types';
import { useAuthForm } from '../hooks/useAuthForm';
import { BaseAuthModal } from './components/BaseAuthModal';
import { AuthInput } from './components/AuthInput';
import { PrimaryButton } from '../ui/atoms/PrimaryButton';
import { Divider } from './components/Divider';
import { authModalStyles } from './styles/authModalStyles';

export const NewSignInModal: React.FC<BaseAuthModalProps> = ({
  visible,
  onClose,
  onSuccess,
  onSwitchMode,
}) => {
  const { theme } = useTheme();
  const {
    email,
    password,
    isLoading,
    isValidEmail,
    isFormValid,
    setEmail,
    setPassword,
    setIsLoading,
    validateForm,
    resetForm,
    handleError,
  } = useAuthForm();

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        handleError(error);
        return;
      }

      if (data.user) {
        resetForm();
        onSuccess?.(data.user);
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleMagicLink = async () => {
    if (!isValidEmail) {
      handleError({ message: 'Please enter a valid email address first.' });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        handleError(error);
        return;
      }

      resetForm();
      // Note: In a real implementation, you might show a success message
      // or navigate to a "check your email" screen
      onClose();
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <BaseAuthModal
      visible={visible}
      onClose={handleClose}
      title="Welcome Back"
    >
      <Text style={[authModalStyles.description, { color: theme.colors.textSecondary }]}>
        Sign in to your account to continue
      </Text>

      <View style={authModalStyles.inputContainer}>
        <AuthInput
          icon="mail"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          hasError={email.length > 0 && !isValidEmail}
        />
        
        <AuthInput
          icon="lock"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <View style={authModalStyles.buttonContainer}>
        <PrimaryButton
          title="Sign In"
          variant="primary"
          size="large"
          onPress={handleSignIn}
          loading={isLoading}
          disabled={!isFormValid}
        />

        <Divider />

        <PrimaryButton
          title="✨ Send Magic Link"
          variant="outline"
          size="large"
          onPress={handleMagicLink}
          loading={isLoading}
          disabled={!isValidEmail}
        />

        <PrimaryButton
          title="Create Account"
          variant="ghost"
          size="large"
          onPress={() => onSwitchMode?.('signup')}
          disabled={isLoading}
        />
      </View>
    </BaseAuthModal>
  );
};