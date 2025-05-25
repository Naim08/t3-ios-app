import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../components/ThemeProvider';
import { supabase } from '../lib/supabase';

interface EmailOTPModalProps {
  visible: boolean;
  onClose: () => void;
}

const validateEmail = (email: string): boolean => {
  // RFC-5322 compliant email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

export const EmailOTPModal: React.FC<EmailOTPModalProps> = ({ visible, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForLink, setIsWaitingForLink] = useState(false); // Used for magic link flow
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'verified' | 'unverified' | 'not_found' | null>(null);
  const [resendTimer, setResendTimer] = useState(0); // Used for magic link flow
  
  const { 
    signInWithEmail, // This is for magic link
    signInWithEmailPassword, 
    signUpWithEmailPassword, 
    checkEmailStatus, 
    session 
  } = useAuth();
  
  const { theme, colorScheme } = useTheme();

  const isValidEmail = validateEmail(email);
  const isDarkMode = colorScheme === 'dark';

  // Effect for session changes (e.g., after successful sign-in/sign-up)
  useEffect(() => {
    if (session && visible) {
      console.log('✅ Session detected, closing modal due to session change');
      setIsLoading(false); // Ensure loading is stopped
      setIsWaitingForLink(false); // Reset waiting state
      onClose();
    }
  }, [session, onClose, visible]);

  // Check email status when user finishes typing
  useEffect(() => {
    if (!isValidEmail || email.length < 3) {
      setEmailStatus(null);
      return;
    }
    const timeoutId = setTimeout(async () => {
      setIsCheckingEmail(true);
      try {
        const status = await checkEmailStatus(email);
        setEmailStatus(status);
      } catch (error) {
        setEmailStatus(null);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [email, isValidEmail, checkEmailStatus]);

  // Resend timer countdown (for magic link flow)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0 && isWaitingForLink) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer, isWaitingForLink]);

  const handleSignIn = async () => {
    if (!isValidEmail || !password) {
      Alert.alert('Error', 'Please enter a valid email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailPassword(email, password);
      // On success, session change effect will close modal
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!isValidEmail || !password) {
      Alert.alert('Error', 'Please enter a valid email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await signUpWithEmailPassword(email, password);
      Alert.alert(
        'Sign Up Initiated',
        'If this is your first time, please check your email to verify your account. You might be signed in directly if verification is not required or already completed.'
      );
      // On success, session change effect might close modal, or user needs to verify email
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkSignIn = async () => {
    if (!isValidEmail) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    setIsWaitingForLink(true); // Set waiting for link state
    try {
      await signInWithEmail(email); // Uses the magic link signInWithEmail
      setResendTimer(60);
      Alert.alert('Magic Link Sent', 'Check your email for a magic link to sign in.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send magic link.');
      setIsWaitingForLink(false); // Reset on error
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResendLink = async () => {
    if (!isValidEmail || !isWaitingForLink) return;
    setIsLoading(true);
    try {
      await signInWithEmail(email); // Resend magic link
      setResendTimer(60); // Reset timer
      Alert.alert('Magic Link Resent', 'We\'ve sent another magic link to your email.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend magic link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setIsLoading(false);
    setIsWaitingForLink(false);
    setEmailStatus(null);
    setResendTimer(0);
    onClose();
  };

  // Determine background color for inputs based on theme
  const inputBackgroundColor = isDarkMode ? theme.colors.gray["800"] : theme.colors.gray["100"];
  // Determine status indicator colors
  const statusColors = {
    verified: { bg: theme.colors.accent["500"], text: theme.colors.textPrimary },
    unverified: { bg: theme.colors.brand["500"], text: theme.colors.textPrimary },
    not_found: { bg: theme.colors.danger["500"], text: theme.colors.textPrimary },
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {isWaitingForLink ? 'Check Your Email' : 'Sign in or Sign up'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} testID="close-button">
              <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {isWaitingForLink ? (
            // UI for waiting for magic link
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="large" color={theme.colors.brand["500"]} />
              <Text style={[styles.waitingTitle, { color: theme.colors.textPrimary, marginTop: 20 }]}>
                Magic link sent!
              </Text>
              <Text style={[styles.waitingText, { color: theme.colors.textSecondary }]}>
                We sent a magic link to {email}. Click the link in the email to sign in.
              </Text>
              {emailStatus === 'verified' && (
                <Text style={[styles.crossDeviceHint, { color: theme.colors.textSecondary }]}>
                  If you've verified this email on another device, you might be signed in automatically soon.
                </Text>
              )}
              <TouchableOpacity 
                style={[styles.resendButton, (resendTimer > 0 || isLoading) && styles.buttonDisabled]} 
                onPress={handleResendLink} 
                disabled={resendTimer > 0 || isLoading}
              >
                <Text style={[styles.resendText, { color: theme.colors.brand["500"]}, resendTimer > 0 && styles.disabledText]}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend magic link'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // UI for email/password input
            <>
              <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                Enter your email and password to continue, or use a magic link.
              </Text>
              
              {/* Email Status Indicator */}
              {emailStatus && email.length > 2 && !isCheckingEmail && (
                <View style={[
                  styles.statusContainer,
                  {
                    backgroundColor: statusColors[emailStatus]?.bg || theme.colors.gray["200"],
                    opacity: 0.8
                  }
                ]}>
                  <Text style={[styles.statusText, { color: statusColors[emailStatus]?.text || theme.colors.textPrimary}]}>
                    {emailStatus === 'verified' ? '✓ Email Verified' : 
                     emailStatus === 'unverified' ? '! Email Unverified' : 
                     '? New Email'}
                  </Text>
                </View>
              )}
              {isCheckingEmail && <ActivityIndicator style={{ marginBottom: 10 }}/>}

              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: theme.colors.border, 
                    color: theme.colors.textPrimary,
                    backgroundColor: inputBackgroundColor
                  }
                ]}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="email-input"
              />
              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: theme.colors.border, 
                    color: theme.colors.textPrimary,
                    backgroundColor: inputBackgroundColor
                  }
                ]}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                testID="password-input"
              />
              {email.length > 0 && !isValidEmail && (
                <Text style={[styles.errorText, {color: theme.colors.danger["500"] }]}>Please enter a valid email address</Text>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: theme.colors.brand["500"] },
                  (!isValidEmail || !password || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleSignIn}
                disabled={!isValidEmail || !password || isLoading}
                testID="signin-button"
              >
                {isLoading && !isWaitingForLink ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.secondaryButton,
                  { borderColor: theme.colors.brand["500"] },
                  (!isValidEmail || !password || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleSignUp}
                disabled={!isValidEmail || !password || isLoading}
                testID="signup-button"
              >
                {isLoading && !isWaitingForLink ? (
                  <ActivityIndicator color={theme.colors.brand["500"]} />
                ) : (
                  <Text style={[styles.buttonText, { color: theme.colors.brand["500"] }]}>Sign Up</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.subtleButton,
                  { marginTop: 10 }, 
                  (!isValidEmail || (isLoading && !isWaitingForLink)) && styles.buttonDisabled,
                ]}
                onPress={handleMagicLinkSignIn}
                disabled={!isValidEmail || (isLoading && !isWaitingForLink)}
                testID="send-magic-link-button"
              >
                {(isLoading && isWaitingForLink) ? (
                  <ActivityIndicator color={theme.colors.brand["500"]} />
                ) : (
                  <Text style={[styles.buttonText, { color: theme.colors.brand["500"] }]}>Or Use Magic Link</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    // backgroundColor is set dynamically by theme
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Extra padding for home indicator on iOS
    minHeight: 300, // Ensure modal has a decent height
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    // borderBottomColor is set dynamically
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  title: {
    fontSize: 20, // Slightly smaller title
    fontWeight: 'bold',
    // color is set dynamically
    textAlign: 'center',
    flex: 1, // Allow title to take space and center
    marginLeft: 30, // Offset for close button to truly center title
  },
  closeButton: {
    padding: 5, // Make it easier to tap
    position: 'absolute', // Position it correctly
    right: 0,
    top: -5, // Adjust based on title padding
  },
  closeText: {
    fontSize: 24, // Larger X for easier tap
    fontWeight: 'normal',
    // color is set dynamically
  },
  description: {
    fontSize: 15,
    // color is set dynamically
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 12,
    // borderColor, color, backgroundColor are set dynamically
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    // backgroundColor is set dynamically
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    // color for primary button is white, for others set dynamically
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    // color is set dynamically
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 13,
  },
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  waitingText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 15,
  },
  resendButton: {
    marginTop: 15,
    paddingVertical: 10,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '500',
    // color is set dynamically
  },
  disabledText: {
    opacity: 0.6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 15,
    alignSelf: 'flex-start', // Align to the start of the input fields
  },
  statusText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  crossDeviceHint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5, // Slightly thicker border for secondary
    // borderColor is set dynamically
  },
  subtleButton: {
    backgroundColor: 'transparent',
    paddingVertical: 10, // Add some padding for tap area
  }
});
