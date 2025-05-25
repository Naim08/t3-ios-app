import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Alert, Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

// THIS IS CRUCIAL - Call this before any auth session
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithApple: () => Promise<void>;
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 Initial session:', session ? '✅ Found' : '❌ None');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session ? '✅ Session exists' : '❌ No session');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Handle deep linking when app returns from OAuth
    const handleURL = (url: string) => {
      console.log('🔗 Received deep link:', url);
      if (url.includes('pocket-t3://auth')) {
        console.log('✅ OAuth redirect detected, completing auth session...');
        // This tells WebBrowser that the auth session is complete and Safari should close
        WebBrowser.maybeCompleteAuthSession();
        
        // Parse the URL to extract tokens if present
        try {
          const parsedUrl = new URL(url);
          const accessToken = parsedUrl.searchParams.get('access_token') || 
                             parsedUrl.hash.includes('access_token');
          const refreshToken = parsedUrl.searchParams.get('refresh_token') || 
                              parsedUrl.hash.includes('refresh_token');
          
          if (accessToken) {
            console.log('🎯 Tokens found in redirect URL');
          }
        } catch (e) {
          console.log('⚠️ Could not parse redirect URL, checking session normally');
        }
        
        // Give Supabase a moment to process the session
        setTimeout(async () => {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            console.log('✅ Session established from deep link:', sessionData.session.user?.email);
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
    };
  }, []);

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

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signIn,
      signInWithApple,
      signOut,
    }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};