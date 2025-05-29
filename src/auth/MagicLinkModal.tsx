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

export const MagicLinkModal: React.FC<BaseAuthModalProps> = ({ 
  visible, 
  onClose, 
  onSuccess, 
  onSwitchMode 
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForLink, setIsWaitingForLink] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  const { theme } = useTheme();
  const isValidEmail = validateEmail(email);

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

  // Resend timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0 && isWaitingForLink) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer, isWaitingForLink]);

  // Monitor for successful authentication while waiting for magic link
  useEffect(() => {
    if (!isWaitingForLink || !visible) return;

    const checkInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[MagicLinkModal] Session detected while waiting for magic link');
        onSuccess();
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(checkInterval);
  }, [isWaitingForLink, visible, onSuccess]);

  const handleSendMagicLink = async () => {
    if (!isValidEmail) {
      Alert.alert('Error', 'Please enter a valid email address.');
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
        Alert.alert('Error', error.message || 'Failed to send magic link.');
        setIsLoading(false);
        return;
      }
      
      console.log('[MagicLinkModal] Magic link sent successfully');
      setIsWaitingForLink(true);
      setResendTimer(60);
      Alert.alert('Magic Link Sent', 'Check your email for a sign-in link.');
    } catch (error: any) {
      console.error('[MagicLinkModal] Magic link error:', error);
      Alert.alert('Error', 'Failed to send magic link. Please try again.');
      setIsLoading(false);
    }
  };
  
  const handleResendLink = async () => {
    if (!isValidEmail || !isWaitingForLink || resendTimer > 0) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      
      if (error) {
        Alert.alert('Error', error.message || 'Failed to resend magic link.');
      } else {
        setResendTimer(60);
        Alert.alert('Magic Link Resent', 'We\'ve sent another magic link to your email.');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to resend magic link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setIsLoading(false);
    setIsWaitingForLink(false);
    setResendTimer(0);
    onClose();
  };

  const handleBackToForm = () => {
    setIsWaitingForLink(false);
    setResendTimer(0);
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
                theme.colors.accent['500'] + '15',
                theme.colors.surface,
              ]}
              style={styles.headerGradient}
            >
              <View style={styles.dragIndicator} />
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                  {isWaitingForLink ? '📨 Check Your Email' : '✨ Magic Link'}
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <BlurView intensity={20} style={styles.closeButtonBlur}>
                    <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>✕</Text>
                  </BlurView>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {isWaitingForLink ? (
              // Magic link waiting UI
              <View style={styles.waitingContainer}>
                <View style={[styles.emailIconWrapper, { backgroundColor: theme.colors.accent['500'] + '20' }]}>
                  <Text style={styles.emailSentIcon}>📨</Text>
                </View>
                <Text style={[styles.waitingTitle, { color: theme.colors.textPrimary }]}>
                  Magic link sent!
                </Text>
                <Text style={[styles.waitingText, { color: theme.colors.textSecondary }]}>
                  We sent a magic link to
                </Text>
                <View style={[styles.emailBadge, { backgroundColor: theme.colors.accent['500'] + '10' }]}>
                  <Text style={[styles.emailBadgeText, { color: theme.colors.accent['500'] }]}>
                    {email}
                  </Text>
                </View>
                <Text style={[styles.waitingText, { color: theme.colors.textSecondary }]}>
                  Click the link in the email to sign in.
                </Text>
                
                <View style={styles.waitingButtonContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.resendButton,
                      { 
                        backgroundColor: (resendTimer > 0 || isLoading) 
                          ? theme.colors.gray['200'] 
                          : theme.colors.accent['500'] + '10',
                        borderColor: theme.colors.accent['500'],
                      },
                      (resendTimer > 0 || isLoading) && styles.buttonDisabled
                    ]} 
                    onPress={handleResendLink} 
                    disabled={resendTimer > 0 || isLoading}
                  >
                    <Text style={[
                      styles.resendText, 
                      { color: theme.colors.accent["500"]},
                      (resendTimer > 0 || isLoading) && { color: theme.colors.textSecondary }
                    ]}>
                      {resendTimer > 0 ? `⏱ Resend in ${resendTimer}s` : '🔁 Resend magic link'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[
                      styles.backButton,
                      { 
                        backgroundColor: theme.colors.gray['100'],
                        borderColor: theme.colors.border,
                      }
                    ]} 
                    onPress={handleBackToForm}
                  >
                    <Text style={[styles.backText, { color: theme.colors.textSecondary }]}>
                      ← Back to form
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Email input form
              <>
                <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                  Enter your email and we'll send you a magic link to sign in instantly
                </Text>

                <View style={styles.inputContainer}>
                  <View style={[styles.inputWrapper, { borderColor: email ? theme.colors.accent['500'] : theme.colors.border }]}>
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
                </View>

                {email.length > 0 && !isValidEmail && (
                  <Text style={[styles.errorText, {color: theme.colors.danger["500"] }]}>
                    Please enter a valid email address
                  </Text>
                )}

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { backgroundColor: theme.colors.accent["500"] },
                      (!isValidEmail || isLoading) && styles.buttonDisabled,
                    ]}
                    onPress={handleSendMagicLink}
                    disabled={!isValidEmail || isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.magicIcon}>✨</Text>
                        <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Send Magic Link</Text>
                      </>
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
                    <Text style={[styles.buttonText, { color: theme.colors.brand["500"] }]}>Sign In with Password</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tertiaryButton,
                      { 
                        borderColor: theme.colors.brand["500"],
                        backgroundColor: 'transparent',
                      }
                    ]}
                    onPress={() => onSwitchMode?.('signup')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.buttonText, { color: theme.colors.brand["500"] }]}>Create Account</Text>
                  </TouchableOpacity>
                </View>
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
  waitingButtonContainer: {
    marginTop: 24,
    gap: 12,
    width: '100%',
  },
  resendButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});