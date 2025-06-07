import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { getUserAvatarUrl, DefaultAvatarId } from '../utils/avatars';

export interface UserProfile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  avatar_type: 'default' | 'uploaded';
  default_avatar_id?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  updateDefaultAvatar: (avatarId: DefaultAvatarId) => Promise<UserProfile>;
  uploadAvatar: (imageUri: string) => Promise<UserProfile>;
  getAvatarUrl: (size?: number) => string | null;
  refetch: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  const updateDefaultAvatar = async (avatarId: DefaultAvatarId) => {
    return updateProfile({
      default_avatar_id: avatarId,
      avatar_type: 'default',
      avatar_url: null
    });
  };

  const uploadAvatar = async (imageUri: string) => {
    if (!user) throw new Error('No user logged in');

    try {
      const { decode } = await import('base64-arraybuffer');
      const FileSystem = await import('expo-file-system');
      
      // Create a unique filename
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
      
      // Read the file as base64 using Expo FileSystem
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to ArrayBuffer for Supabase
      const arrayBuffer = decode(base64);

      // Upload using Supabase client with ArrayBuffer
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL using Supabase client
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-busting parameter to ensure image refreshes
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile with the cache-busted uploaded avatar URL
      const updatedProfile = await updateProfile({
        avatar_url: cacheBustedUrl,
        avatar_type: 'uploaded',
        default_avatar_id: null
      });
      
      return updatedProfile;
    } catch (err) {
      console.error('Error uploading avatar:', err);
      throw err;
    }
  };

  const getAvatarUrl = useCallback((size = 200) => {
    if (!profile) return null;
    return getUserAvatarUrl(profile, size);
  }, [profile]);

  const refetch = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const value: ProfileContextType = useMemo(() => ({
    profile,
    loading,
    error,
    updateProfile,
    updateDefaultAvatar,
    uploadAvatar,
    getAvatarUrl,
    refetch
  }), [profile, loading, error, getAvatarUrl, refetch]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};