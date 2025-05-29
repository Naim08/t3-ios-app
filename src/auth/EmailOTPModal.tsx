/* eslint-disable no-undef */

import React, { useState, useEffect, useRef } from 'react';
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
  AppState,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
// Conditional imports for gradients
let LinearGradient, BlurView;
try {
  const gradientLib = require('expo-linear-gradient');
  LinearGradient = gradientLib.LinearGradient;
  const blurLib = require('expo-blur');
  BlurView = blurLib.BlurView;
} catch (error) {
  console.warn('Gradient/Blur libraries not available, using fallback components');
  LinearGradient = ({ children, style, ...props }) => React.createElement(View, { style, ...props }, children);
  BlurView = ({ children, style, ...props }) => React.createElement(View, { style, ...props }, children);
}
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../components/ThemeProvider';
import { supabase } from '../lib/supabase';

const { height } = Dimensions.get('window');

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
  
  // Ref-based tracking to avoid React closure issues
  const authStatusRef = useRef<'idle' | 'authenticating' | 'waiting_for_link'>('idle');
  const visibleRef = useRef(visible);
  const authFailureTimeRef = useRef<number>(0);
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Update visible ref when prop changes
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  // Sophisticated auth state change listener with blackout period
  useEffect(() => {
    console.log('[EmailOTPModal] Setting up auth state listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[EmailOTPModal] Auth event:', event, 'Session:', !!session, 'Modal visible:', visibleRef.current, 'Auth status:', authStatusRef.current);
      
      // Only handle SIGNED_IN events when modal is visible and we're in the right state
      if (event === 'SIGNED_IN' && visibleRef.current && session) {
        const now = Date.now();
        const timeSinceFailure = now - authFailureTimeRef.current;
        
        console.log('[EmailOTPModal] SIGNED_IN event detected. Time since last failure:', timeSinceFailure);
        
        // Implement blackout period: ignore SIGNED_IN events within 2 seconds of auth failure
        if (timeSinceFailure < 2000 && authFailureTimeRef.current > 0) {
          console.log('[EmailOTPModal] Ignoring SIGNED_IN event - within blackout period');
          return;
        }
        
        console.log('[EmailOTPModal] Valid SIGNED_IN event - closing modal');
        
        // Clear auth timeout if set
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
        
        // Reset auth status and close modal
        authStatusRef.current = 'idle';
        onClose();
      }
    });

    return () => {
      console.log('[EmailOTPModal] Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, [onClose]);

  // AppState monitoring for magic link authentication
  useEffect(() => {
    if (!isWaitingForLink) return;
    
    console.log('[EmailOTPModal] Setting up AppState listener for magic link');
    
    const handleAppStateChange = (nextAppState: string) => {
      console.log('[EmailOTPModal] AppState changed to:', nextAppState, 'Waiting for link:', isWaitingForLink);
      
      if (nextAppState === 'active' && isWaitingForLink) {
        // Check if user is now authenticated after returning to app
        console.log('[EmailOTPModal] App became active while waiting for magic link - checking session');
        
        setTimeout(() => {
          if (session && visibleRef.current) {
            console.log('[EmailOTPModal] Session found after app activation - closing modal');
            onClose();
          }
        }, 1000); // Small delay to allow session to update
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isWaitingForLink, session, onClose]);

  // Authentication timeout mechanism (30 seconds)
  useEffect(() => {
    if (authStatusRef.current === 'authenticating') {
      console.log('[EmailOTPModal] Starting auth timeout (30s)');
      
      authTimeoutRef.current = setTimeout(() => {
        console.log('[EmailOTPModal] Auth timeout reached');
        authStatusRef.current = 'idle';
        setIsLoading(false);
        Alert.alert('Timeout', 'Authentication timed out. Please try again.');
      }, 30000);
      
      return () => {
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
      };
    }
  }, [authStatusRef.current]);

  // IMPORTANT: Session effect removed to prevent AuthProvider interference
  // Modal should only close on explicit user actions or successful authentication
  // Previous automatic session-based closure was causing premature modal dismissal

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
    
    console.log('[EmailOTPModal] Starting sign in process');
    authStatusRef.current = 'authenticating';
    setIsLoading(true);
    
    try {
      await signInWithEmailPassword(email, password);
      console.log('[EmailOTPModal] Sign in successful - auth state listener will handle modal closure');
      // Note: Modal closure is now handled by the auth state listener on SIGNED_IN event
    } catch (error: any) {
      console.log('[EmailOTPModal] Sign in failed:', error.message);
      authFailureTimeRef.current = Date.now(); // Record failure time for blackout period
      authStatusRef.current = 'idle';
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
    
    console.log('[EmailOTPModal] Starting sign up process');
    authStatusRef.current = 'authenticating';
    setIsLoading(true);
    
    try {
      await signUpWithEmailPassword(email, password);
      console.log('[EmailOTPModal] Sign up successful');
      Alert.alert(
        'Sign Up Initiated',
        'If this is your first time, please check your email to verify your account. You might be signed in directly if verification is not required or already completed.'
      );
      // Note: Modal closure is handled by the auth state listener on SIGNED_IN event if auto-signed in
    } catch (error: any) {
      console.log('[EmailOTPModal] Sign up failed:', error.message);
      authFailureTimeRef.current = Date.now(); // Record failure time for blackout period
      authStatusRef.current = 'idle';
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
    
    console.log('[EmailOTPModal] Starting magic link sign in process');
    authStatusRef.current = 'waiting_for_link';
    setIsLoading(true);
    setIsWaitingForLink(true); // Set waiting for link state
    
    try {
      await signInWithEmail(email); // Uses the magic link signInWithEmail
      console.log('[EmailOTPModal] Magic link sent successfully');
      setResendTimer(60);
      Alert.alert('Magic Link Sent', 'Check your email for a magic link to sign in.');
    } catch (error: any) {
      console.log('[EmailOTPModal] Magic link failed:', error.message);
      authStatusRef.current = 'idle';
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
    console.log('[EmailOTPModal] Manual close triggered');
    
    // Reset all state
    setEmail('');
    setPassword('');
    setIsLoading(false);
    setIsWaitingForLink(false);
    setEmailStatus(null);
    setResendTimer(0);
    
    // Reset ref tracking
    authStatusRef.current = 'idle';
    authFailureTimeRef.current = 0;
    
    // Clear any pending timeout
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
    
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
          style={[
            styles.backdrop,
            { opacity: fadeAnim }
          ]}
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
            {/* Modern Header with Gradient */}
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
                  {isWaitingForLink ? '📨 Check Your Email' : '🔐 Welcome to Pocket T3'}
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton} testID="close-button">
                  <BlurView intensity={20} style={styles.closeButtonBlur}>
                    <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>✕</Text>
                  </BlurView>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {isWaitingForLink ? (
              // Modern UI for waiting for magic link
              <View style={styles.waitingContainer}>
                <View style={[styles.emailIconWrapper, { backgroundColor: theme.colors.brand['500'] + '20' }]}>
                  <Text style={styles.emailSentIcon}>📨</Text>
                </View>
                <Text style={[styles.waitingTitle, { color: theme.colors.textPrimary }]}>
                  Magic link sent!
                </Text>
                <Text style={[styles.waitingText, { color: theme.colors.textSecondary }]}>
                  We sent a magic link to
                </Text>
                <View style={[styles.emailBadge, { backgroundColor: theme.colors.brand['500'] + '10' }]}>
                  <Text style={[styles.emailBadgeText, { color: theme.colors.brand['500'] }]}>
                    {email}
                  </Text>
                </View>
                <Text style={[styles.waitingText, { color: theme.colors.textSecondary }]}>
                  Click the link in the email to sign in.
                </Text>
                {emailStatus === 'verified' && (
                  <View style={[styles.hintContainer, { backgroundColor: theme.colors.accent['500'] + '10' }]}>
                    <Text style={[styles.crossDeviceHint, { color: theme.colors.accent['700'] }]}>
                      🔄 This email was verified before. You may be signed in automatically.
                    </Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={[
                    styles.resendButton,
                    { 
                      backgroundColor: (resendTimer > 0 || isLoading) 
                        ? theme.colors.gray['200'] 
                        : theme.colors.brand['500'] + '10',
                      borderColor: theme.colors.brand['500'],
                    },
                    (resendTimer > 0 || isLoading) && styles.buttonDisabled
                  ]} 
                  onPress={handleResendLink} 
                  disabled={resendTimer > 0 || isLoading}
                >
                  <Text style={[
                    styles.resendText, 
                    { color: theme.colors.brand["500"]},
                    (resendTimer > 0 || isLoading) && { color: theme.colors.textSecondary }
                  ]}>
                    {resendTimer > 0 ? `⏱ Resend in ${resendTimer}s` : '🔁 Resend magic link'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Modern UI for email/password input
              <>
                <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                  Sign in to access GPT-4, Claude, and Gemini Pro
                </Text>
                
                {/* Modern Email Status Indicator */}
                {emailStatus && email.length > 2 && !isCheckingEmail && (
                  <Animated.View style={[
                    styles.statusContainer,
                    {
                      backgroundColor: statusColors[emailStatus]?.bg || theme.colors.gray["200"],
                    }
                  ]}>
                    <Text style={[styles.statusText, { color: '#FFFFFF' }]}>
                      {emailStatus === 'verified' ? '✓ Verified Email' : 
                       emailStatus === 'unverified' ? '⚠️ Unverified Email' : 
                       '✨ New Email'}
                    </Text>
                  </Animated.View>
                )}
                {isCheckingEmail && (
                  <View style={styles.checkingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.brand['500']} />
                    <Text style={[styles.checkingText, { color: theme.colors.textSecondary }]}>Checking email...</Text>
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <View style={[styles.inputWrapper, { borderColor: email ? theme.colors.brand['500'] : theme.colors.border }]}>
                    <Text style={styles.inputIcon}>📧</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { 
                          color: theme.colors.textPrimary,
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
                  </View>
                  
                  <View style={[styles.inputWrapper, { borderColor: password ? theme.colors.brand['500'] : theme.colors.border }]}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { 
                          color: theme.colors.textPrimary,
                        }
                      ]}
                      placeholder="Enter your password"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      testID="password-input"
                    />
                  </View>
                </View>
              {email.length > 0 && !isValidEmail && (
                <Text style={[styles.errorText, {color: theme.colors.danger["500"] }]}>Please enter a valid email address</Text>
              )}

                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[
                      styles.modernButton,
                      styles.primaryButton,
                      { backgroundColor: theme.colors.brand["500"] },
                      (!isValidEmail || !password || isLoading) && styles.buttonDisabled,
                    ]}
                    onPress={handleSignIn}
                    disabled={!isValidEmail || !password || isLoading}
                    testID="signin-button"
                    activeOpacity={0.8}
                  >
                    {isLoading && !isWaitingForLink ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Sign In</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modernButton,
                      styles.secondaryButton,
                      { 
                        borderColor: theme.colors.brand["500"],
                        backgroundColor: theme.colors.brand['500'] + '10',
                      },
                      (!isValidEmail || !password || isLoading) && styles.buttonDisabled,
                    ]}
                    onPress={handleSignUp}
                    disabled={!isValidEmail || !password || isLoading}
                    testID="signup-button"
                    activeOpacity={0.8}
                  >
                    {isLoading && !isWaitingForLink ? (
                      <ActivityIndicator color={theme.colors.brand["500"]} />
                    ) : (
                      <Text style={[styles.buttonText, { color: theme.colors.brand["500"] }]}>Create Account</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.dividerContainer}>
                  <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                  <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>OR</Text>
                  <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                </View>

                <TouchableOpacity
                  style={[
                    styles.modernButton,
                    styles.magicLinkButton,
                    { 
                      backgroundColor: theme.colors.accent['500'] + '15',
                      borderColor: theme.colors.accent['500'],
                    },
                    (!isValidEmail || (isLoading && !isWaitingForLink)) && styles.buttonDisabled,
                  ]}
                  onPress={handleMagicLinkSignIn}
                  disabled={!isValidEmail || (isLoading && !isWaitingForLink)}
                  testID="send-magic-link-button"
                  activeOpacity={0.8}
                >
                  {(isLoading && isWaitingForLink) ? (
                    <ActivityIndicator color={theme.colors.accent["500"]} />
                  ) : (
                    <>
                      <Text style={styles.magicIcon}>✨</Text>
                      <Text style={[styles.buttonText, { color: theme.colors.accent["700"] }]}>Send Magic Link</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
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
  buttonGroup: {
    paddingHorizontal: 20,
    gap: 12,
  },
  modernButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  primaryButton: {
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
    borderWidth: 2,
  },
  magicLinkButton: {
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
    paddingHorizontal: 20,
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
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emailIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emailSentIcon: {
    fontSize: 40,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  waitingText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  emailBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginVertical: 8,
  },
  emailBadgeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hintContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 20,
  },
  resendButton: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  checkingText: {
    fontSize: 14,
  },
  crossDeviceHint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
});
