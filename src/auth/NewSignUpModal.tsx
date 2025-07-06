import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../components/ThemeProvider';
import { supabase } from '../lib/supabase';
import { BaseAuthModalProps } from './types';
import { useAuthForm } from '../hooks/useAuthForm';
import { BaseAuthModal } from './components/BaseAuthModal';
import { AuthInput } from './components/AuthInput';
import { PrimaryButton } from '../ui/atoms/PrimaryButton';
import { Divider } from './components/Divider';
import { authModalStyles } from './styles/authModalStyles';

export const NewSignUpModal: React.FC<BaseAuthModalProps> = ({
  visible,
  onClose,
  onSuccess,
  onSwitchMode,
}) => {
  const { theme } = useTheme();
  const {
    email,
    password,
    passwordConfirmation,
    isLoading,
    isValidEmail,
    isFormValid,
    setEmail,
    setPassword,
    setPasswordConfirmation,
    setIsLoading,
    validateForm,
    resetForm,
    handleError,
  } = useAuthForm({ requirePasswordConfirmation: true });

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
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
          shouldCreateUser: true,
        },
      });

      if (error) {
        handleError(error);
        return;
      }

      resetForm();
      onClose();
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <BaseAuthModal
      visible={visible}
      onClose={handleClose}
      title="Create Account"
    >
      <Text style={[authModalStyles.description, { color: theme.colors.textSecondary }]}>
        Join us to start your journey
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
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <AuthInput
          icon="lock"
          placeholder="Confirm your password"
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          secureTextEntry
          hasError={passwordConfirmation.length > 0 && password !== passwordConfirmation}
        />
      </View>

      <View style={authModalStyles.buttonContainer}>
        <PrimaryButton
          title="Create Account"
          variant="primary"
          size="large"
          onPress={handleSignUp}
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
          title="Already have an account?"
          variant="ghost"
          size="large"
          onPress={() => onSwitchMode?.('signin')}
          disabled={isLoading}
        />
      </View>
    </BaseAuthModal>
  );
};