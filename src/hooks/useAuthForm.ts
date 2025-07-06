import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { validateEmail } from '../auth/types';

interface UseAuthFormProps {
  initialEmail?: string;
  initialPassword?: string;
  requirePasswordConfirmation?: boolean;
}

interface UseAuthFormReturn {
  email: string;
  password: string;
  passwordConfirmation: string;
  isLoading: boolean;
  isValidEmail: boolean;
  isFormValid: boolean;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setPasswordConfirmation: (password: string) => void;
  setIsLoading: (loading: boolean) => void;
  validateForm: () => boolean;
  resetForm: () => void;
  handleError: (error: any) => void;
}

export const useAuthForm = ({
  initialEmail = '',
  initialPassword = '',
  requirePasswordConfirmation = false
}: UseAuthFormProps = {}): UseAuthFormReturn => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isValidEmail = validateEmail(email);
  
  const isFormValid = useMemo(() => {
    if (!isValidEmail || !password) {
      return false;
    }
    
    if (requirePasswordConfirmation && password !== passwordConfirmation) {
      return false;
    }
    
    return true;
  }, [isValidEmail, password, passwordConfirmation, requirePasswordConfirmation]);

  const validateForm = useCallback(() => {
    if (!isValidEmail) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return false;
    }
    
    if (!password) {
      Alert.alert('Error', 'Please enter a password.');
      return false;
    }
    
    if (requirePasswordConfirmation) {
      if (!passwordConfirmation) {
        Alert.alert('Error', 'Please confirm your password.');
        return false;
      }
      
      if (password !== passwordConfirmation) {
        Alert.alert('Error', 'Passwords do not match.');
        return false;
      }
    }
    
    return true;
  }, [isValidEmail, password, passwordConfirmation, requirePasswordConfirmation]);

  const resetForm = useCallback(() => {
    setEmail(initialEmail);
    setPassword(initialPassword);
    setPasswordConfirmation('');
    setIsLoading(false);
  }, [initialEmail, initialPassword]);

  const handleError = useCallback((error: any) => {
    let errorMessage = 'An unexpected error occurred.';
    
    if (error?.message) {
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link.';
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.message.includes('Password should be at least')) {
        errorMessage = 'Password should be at least 6 characters long.';
      } else if (error.message.includes('Unable to validate email address')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage = error.message;
      }
    }
    
    Alert.alert('Error', errorMessage);
    setIsLoading(false);
  }, []);

  return {
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
  };
};