import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';

// Conditional imports for gradients
let LinearGradient: any, BlurView: any;
try {
  const gradientLib = require('expo-linear-gradient');
  LinearGradient = gradientLib.LinearGradient;
  const blurLib = require('expo-blur');
  BlurView = blurLib.BlurView;
} catch (error) {
  console.warn('Gradient/Blur libraries not available, using fallback components');
  LinearGradient = ({ children, style, ...props }: any) => React.createElement(View, { style, ...props }, children);
  BlurView = ({ children, style, ...props }: any) => React.createElement(View, { style, ...props }, children);
}

import { useTheme } from '../components/ThemeProvider';
import { supabase } from '../lib/supabase';
import { BaseAuthModalProps, validateEmail } from './types';

const { height } = Dimensions.get('window');

export const SignUpModal: React.FC<BaseAuthModalProps> = ({ 
  visible, 
  onClose, 
  onSuccess, 
  onSwitchMode 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { theme } = useTheme();
  const isValidEmail = validateEmail(email);
  const passwordsMatch = password === confirmPassword;
  const isPasswordValid = password.length >= 6;

  // Animation for modal entrance
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSignUp = async () => {
    if (!isValidEmail || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    
    if (!isPasswordValid) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }
    
    if (!passwordsMatch) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        let errorMessage = 'An unexpected error occurred.';
        if (error.message?.includes('already registered')) {
          errorMessage = 'This email is already registered. Please sign in instead.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        Alert.alert('Sign Up Failed', errorMessage);
        setIsLoading(false);
        return; // Stay on modal
      }
      
      if (data.session) {
        console.log('[SignUpModal] Sign up successful with immediate session');
        onSuccess();
      } else if (data.user) {
        console.log('[SignUpModal] Sign up successful - email verification required');
        Alert.alert(
          'Check Your Email',
          'Please check your email to verify your account before signing in.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form but keep modal open for user to sign in
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setIsLoading(false);
                onSwitchMode?.('signin');
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('[SignUpModal] Sign up error:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setIsLoading(false);
    onClose();
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View 
          style={[styles.backdrop, { opacity: fadeAnim }]}
        >
          <TouchableOpacity 
            style={styles.backdropTouch} 
            onPress={handleClose}
            activeOpacity={1}
          />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.container,
            { 
              backgroundColor: theme.colors.surface,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <ScrollView 
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <LinearGradient
              colors={[
                theme.colors.brand['500'] + '15',
                theme.colors.surface,
              ]}
              style={styles.headerGradient}
            >
              <View style={styles.dragIndicator} />
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                  ✨ Create Account
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <BlurView intensity={20} style={styles.closeButtonBlur}>
                    <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>✕</Text>
                  </BlurView>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              Join Pocket T3 to access GPT-4, Claude, and Gemini Pro
            </Text>

            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, { borderColor: email ? theme.colors.brand['500'] : theme.colors.border }]}>
                <Text style={styles.inputIcon}>📧</Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              
              <View style={[styles.inputWrapper, { borderColor: password ? theme.colors.brand['500'] : theme.colors.border }]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                  placeholder="Create password (min 6 characters)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCorrect={false}
                />
              </View>

              <View style={[styles.inputWrapper, { borderColor: confirmPassword ? theme.colors.brand['500'] : theme.colors.border }]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                  placeholder="Confirm password"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Validation Messages */}
            {email.length > 0 && !isValidEmail && (
              <Text style={[styles.errorText, {color: theme.colors.danger["500"] }]}>
                Please enter a valid email address
              </Text>
            )}
            {password.length > 0 && !isPasswordValid && (
              <Text style={[styles.errorText, {color: theme.colors.danger["500"] }]}>
                Password must be at least 6 characters long
              </Text>
            )}
            {confirmPassword.length > 0 && !passwordsMatch && (
              <Text style={[styles.errorText, {color: theme.colors.danger["500"] }]}>
                Passwords do not match
              </Text>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.colors.brand["500"] },
                  (!isValidEmail || !isPasswordValid || !passwordsMatch || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleSignUp}
                disabled={!isValidEmail || !isPasswordValid || !passwordsMatch || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Create Account</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>OR</Text>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              </View>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { 
                    borderColor: theme.colors.brand["500"],
                    backgroundColor: theme.colors.brand['500'] + '10',
                  }
                ]}
                onPress={() => onSwitchMode?.('signin')}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: theme.colors.brand["500"] }]}>Sign In Instead</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tertiaryButton,
                  { 
                    backgroundColor: theme.colors.accent['500'] + '15',
                    borderColor: theme.colors.accent['500'],
                  }
                ]}
                onPress={() => onSwitchMode?.('magic')}
                activeOpacity={0.8}
              >
                <Text style={styles.magicIcon}>✨</Text>
                <Text style={[styles.buttonText, { color: theme.colors.accent["700"] }]}>Send Magic Link</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouch: {
    flex: 1,
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.9,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  headerGradient: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: -8,
  },
  closeButtonBlur: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  closeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  inputContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  secondaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 2,
  },
  tertiaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  magicIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 20,
  },
});