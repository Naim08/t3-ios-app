import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Alert, Linking, Platform, AppState } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

// THIS IS CRUCIAL - Call this before any auth session
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isOnline: boolean;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  checkEmailStatus: (email: string) => Promise<'verified' | 'unverified' | 'not_found'>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // SecureStore keys
  const SESSION_KEY = 'user_session';
  const REFRESH_TOKEN_KEY = 'refresh_token';

  // Helper functions for SecureStore - store only essential data
  const storeSession = async (session: Session) => {
    try {
      // Store only essential tokens, not the entire session object
      const essentialData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user_id: session.user?.id,
      };
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(essentialData));
      console.log('💾 Session stored in SecureStore');
    } catch (error) {
      console.error('❌ Error storing session:', error);
    }
  };

  const clearStoredSession = async () => {
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      console.log('🗑️ Session cleared from SecureStore');
    } catch (error) {
      console.error('❌ Error clearing session:', error);
    }
  };

  useEffect(() => {
    // Initialize network listener
    const unsubscribeNetInfo = NetInfo.addEventListener((state: any) => {
      setIsOnline(!!state.isConnected);
    });

    // Try to restore session from SecureStore first
    const restoreSession = async () => {
      try {
        const storedSession = await SecureStore.getItemAsync(SESSION_KEY);
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);
          console.log('🔄 Restoring session from SecureStore...');
          
          // Validate and refresh the stored session
          const { data, error } = await supabase.auth.setSession({
            access_token: parsedSession.access_token,
            refresh_token: parsedSession.refresh_token,
          });
          
          if (error) {
            console.log('⚠️ Stored session invalid, clearing...');
            await clearStoredSession();
          } else {
            console.log('✅ Session restored successfully');
            setSession(data.session);
            setUser(data.session?.user ?? null);
          }
        }
      } catch (error) {
        console.log('⚠️ Error restoring session:', error);
        await clearStoredSession();
      }
      
      // Fall back to Supabase session check
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Initial session:', session ? '✅ Found' : '❌ None');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    restoreSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session ? `✅ Session exists (${session.user?.email})` : '❌ No session');
      
      // Debug: Log all session details for troubleshooting
      if (session) {
        console.log('🔍 Session details:', {
          access_token: session.access_token ? 'present' : 'missing',
          user_id: session.user?.id,
          user_email: session.user?.email,
          expires_at: session.expires_at,
        });
      }
      
      // Only update session state for legitimate auth events
      // Ignore transient session states that might occur during failed auth attempts
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ Legitimate sign-in detected, updating session state');
        setSession(session);
        setUser(session?.user ?? null);
        await storeSession(session);
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 Sign-out detected, clearing session state');
        setSession(null);
        setUser(null);
        await clearStoredSession();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('🔄 Token refreshed, updating session');
        setSession(session);
        setUser(session?.user ?? null);
        await storeSession(session);
      } else {
        console.log(`⚠️ Ignoring auth event: ${event} (session: ${session ? 'present' : 'null'})`);
      }
      
      setLoading(false);
    });

    // Handle deep linking when app returns from OAuth
    const handleURL = async (url: string) => {
      console.log('🔗 Received deep link:', url);
      if (url.includes('pocket-t3://auth')) {
        console.log('✅ OAuth redirect detected, completing auth session...');
        // This tells WebBrowser that the auth session is complete and Safari should close
        WebBrowser.maybeCompleteAuthSession();
        
        // Parse the URL to extract tokens from the hash fragment
        try {
          const urlObj = new URL(url);
          let fragment = urlObj.hash.substring(1); // Remove the #
          
          // First decode the URL-encoded fragment
          fragment = decodeURIComponent(fragment);
          console.log('🔍 Decoded fragment:', fragment);
          
          const params = new URLSearchParams(fragment);
          
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const expiresAt = params.get('expires_at');
          
          console.log('🔍 Extracted tokens:', { 
            accessToken: accessToken ? `✅ Present (${accessToken.substring(0, 20)}...)` : '❌ Missing',
            refreshToken: refreshToken ? `✅ Present (${refreshToken.substring(0, 20)}...)` : '❌ Missing',
            expiresAt: expiresAt || 'Not provided'
          });
          
          if (accessToken && refreshToken) {
            console.log('🎯 Tokens found in redirect URL, setting session...');
            
            // Set the session with Supabase immediately
            const sessionData: {
              access_token: string;
              refresh_token: string;
              expires_at?: number;
            } = {
              access_token: accessToken,
              refresh_token: refreshToken,
            };
            
            // Add expires_at if available
            if (expiresAt) {
              sessionData.expires_at = parseInt(expiresAt);
            }
            
            const { data, error } = await supabase.auth.setSession(sessionData);
            
            if (error) {
              console.error('❌ Error setting session from deep link:', error);
            } else {
              console.log('✅ Session set successfully from deep link!', data.user?.email);
              setSession(data.session);
              setUser(data.session?.user ?? null);
              if (data.session) {
                await storeSession(data.session);
              }
            }
            return; // Exit early since we handled the tokens
          }
        } catch (e) {
          console.log('⚠️ Could not parse redirect URL tokens:', e);
        }
        
        // Fallback: Give Supabase a moment to process the session
        setTimeout(async () => {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            console.log('✅ Session established from deep link fallback:', sessionData.session.user?.email);
          }
        }, 500);
      }
    };

    // Listen for URL events
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      handleURL(url);
    });

    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleURL(url);
      }
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription?.remove();
      unsubscribeNetInfo();
    };
  }, []);

  const checkEmailStatus = async (email: string): Promise<'verified' | 'unverified' | 'not_found'> => {
    try {
      console.log('🔍 Checking email status for:', email);
      
      // Try to send a sign-in OTP (this won't create a user)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });
      
      if (error) {
        if (error.message.includes('not found') || 
            error.message.includes('Invalid email') ||
            error.message.includes('User not found')) {
          console.log('❓ Email not found in system');
          return 'not_found';
        }
        
        if (error.message.includes('email not confirmed') ||
            error.message.includes('signup') ||
            error.message.includes('verification')) {
          console.log('⚠️ Email exists but is unverified');
          return 'unverified';
        }
        
        // For other errors, assume unverified to be safe
        console.log('⚠️ Error checking email, assuming unverified:', error.message);
        return 'unverified';
      }
      
      console.log('✅ Email is verified and ready for sign-in');
      return 'verified';
    } catch (error: any) {
      console.error('💥 Error checking email status:', error);
      return 'not_found';
    }
  };

  const signInWithEmail = async (email: string) => {
    try {
      setLoading(true);
      console.log('📧 Starting Email Sign In for:', email);
      console.log('🌐 Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log('🔑 Has Anon Key:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
      
      // Since we've enabled email confirmations and updated config, use signInWithOtp directly
      // This will create a user if they don't exist AND send them a magic link
      console.log('📧 Sending magic link (signup/signin)...');
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // Allow user creation
          data: {
            // Any additional user metadata can go here
          },
        },
      });
      
      console.log('📧 Magic Link Response - Data:', data, 'Error:', error);
      
      if (error) {
        console.error('❌ Error sending magic link:', error);
        
        // Check specific error types
        if (error.message.includes('rate limit')) {
          throw new Error('Too many requests. Please wait a moment before trying again.');
        } else if (error.message.includes('invalid email')) {
          throw new Error('Please enter a valid email address.');
        } else if (error.message.includes('Signups not allowed')) {
          throw new Error('Email signup is currently disabled. Please try again later or contact support.');
        } else {
          throw error;
        }
      }
      
      console.log('✅ Magic link sent successfully!');
      console.log('📬 Check your email for the sign-in link');
    } catch (error: any) {
      console.error('💥 Email sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔐 Starting Email/Password Sign In for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Email/Password sign in error:', error);
        console.log('🔍 About to throw error in AuthProvider');
        // Make sure no session state gets updated on error
        setLoading(false);
        throw error;
      }
      
      if (data.session) {
        console.log('✅ Email/Password sign in successful');
        // Session will be set by the onAuthStateChange listener
        // Don't manually set it here to avoid race conditions
      }
    } catch (error: any) {
      console.error('💥 Email/Password sign in error:', error);
      console.log('🔍 In catch block of AuthProvider, about to throw error');
      setLoading(false);
      throw error;
    }
    // Don't set loading to false here in finally block - let the auth state change handle it
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('📝 Starting Email/Password Sign Up for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Email/Password sign up error:', error);
        setLoading(false);
        throw error;
      }
      
      if (data.session) {
        console.log('✅ Email/Password sign up successful with immediate session');
        // Session will be set by the onAuthStateChange listener
      } else if (data.user && !data.user.email_confirmed_at) {
        console.log('📧 Email confirmation required');
        setLoading(false);
        // You might want to show a message to the user about checking their email
      }
    } catch (error: any) {
      console.error('💥 Email/Password sign up error:', error);
      setLoading(false);
      throw error;
    }
    // Don't set loading to false in finally - let auth state change handle successful cases
  };

  const signInWithApple = async () => {
    try {
      setLoading(true);
      console.log('🍎 Starting Apple Sign In...');
      
      // Get the Supabase authorization URL with proper redirect
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: Platform.OS === 'ios' ? 'pocket-t3://auth' : 'pocket-t3://auth',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('❌ Error getting auth URL:', error);
        Alert.alert('Error', `Failed to initialize sign-in: ${error.message}`);
        return;
      }
      
      if (!data.url) {
        console.error('❌ No authorization URL received');
        Alert.alert('Error', 'No authorization URL received');
        return;
      }
      
      console.log('🔗 Auth URL generated:', data.url);
      console.log('🌐 Opening OAuth session in browser...');
      
      // Open the OAuth flow with proper browser settings
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        'pocket-t3://auth',
        {
          preferEphemeralSession: true, // Key for Apple OAuth
          showInRecents: false,
          // Additional options to ensure proper closure
          dismissButtonStyle: 'close',
        }
      );
      
      console.log('📱 Auth session result:', JSON.stringify(result, null, 2));
      
      if (result.type === 'success') {
        console.log('✅ Apple OAuth completed successfully');
        
        // The browser should close automatically, but ensure it does
        setTimeout(() => {
          WebBrowser.dismissBrowser().catch(() => {
            console.log('⚠️ Browser already closed or could not dismiss');
          });
        }, 100);
        
        // Extract tokens from the URL and set session immediately
        try {
          const url = result.url;
          console.log('🔗 Processing redirect URL:', url);
          
          // Parse tokens from URL fragment (after #)
          const urlObj = new URL(url);
          const fragment = urlObj.hash.substring(1); // Remove the #
          const params = new URLSearchParams(fragment);
          
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (accessToken && refreshToken) {
            console.log('🎯 Tokens extracted, setting session...');
            
            // Set the session with Supabase
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (sessionError) {
              console.error('❌ Session error:', sessionError);
            } else {
              console.log('✅ Session set successfully!', sessionData.user?.email);
            }
          } else {
            console.log('⚠️ No tokens found in URL, waiting for auth state change...');
          }
        } catch (error) {
          console.error('❌ Error processing tokens:', error);
          console.log('⏳ Falling back to auth state change...');
        }
        
      } else if (result.type === 'cancel') {
        console.log('🚫 User cancelled sign-in');
        Alert.alert('Sign-in cancelled', 'Please try again to continue.');
      } else {
        console.log('❌ OAuth failed with result:', result);
        Alert.alert('Error', 'Authentication was interrupted. Please try again.');
      }
    } catch (error: any) {
      console.error('💥 Apple sign in error:', error);
      Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Alias for backward compatibility
  const signIn = signInWithApple;

  const signOut = async () => {
    try {
      console.log('👋 Signing out...');
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
        Alert.alert('Error', error.message);
      } else {
        console.log('✅ Signed out successfully');
      }
    } catch (error: any) {
      console.error('💥 Sign out error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isOnline,
    signInWithApple,
    signInWithEmail,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    checkEmailStatus,
    signOut,
  }), [user, session, loading, isOnline]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};