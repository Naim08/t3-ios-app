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

export const NewMagicLinkModal: React.FC<BaseAuthModalProps> = ({
  visible,
  onClose,
  onSuccess,
  onSwitchMode,
}) => {
  const { theme } = useTheme();
  const {
    email,
    isLoading,
    isValidEmail,
    setEmail,
    setIsLoading,
    resetForm,
    handleError,
  } = useAuthForm();

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSendMagicLink = async () => {
    if (!isValidEmail) {
      handleError({ message: 'Please enter a valid email address.' });
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
      // In a real implementation, you might show a success message
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
      title="Magic Link"
    >
      <Text style={[authModalStyles.description, { color: theme.colors.textSecondary }]}>
        Enter your email to receive a magic link for secure, passwordless access
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
      </View>

      <View style={authModalStyles.buttonContainer}>
        <PrimaryButton
          title="✨ Send Magic Link"
          variant="primary"
          size="large"
          onPress={handleSendMagicLink}
          loading={isLoading}
          disabled={!isValidEmail}
        />

        <Divider />

        <PrimaryButton
          title="Sign In with Password"
          variant="outline"
          size="large"
          onPress={() => onSwitchMode?.('signin')}
          disabled={isLoading}
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