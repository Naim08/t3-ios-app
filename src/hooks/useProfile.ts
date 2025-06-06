import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { getUserAvatarUrl, DefaultAvatarId } from '../utils/avatars';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

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

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔧 PROFILE: Fetching profile for user:', user.id);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      console.log('🔧 PROFILE: Fetched profile data:', data);
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

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
      console.log('🔧 AVATAR UPLOAD: Starting upload for URI:', imageUri);
      

      
      // Create a unique filename
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
      
      console.log('🔧 AVATAR UPLOAD: Reading file as base64...');
      
      // Read the file as base64 using Expo FileSystem
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('🔧 AVATAR UPLOAD: Converting base64 to ArrayBuffer, length:', base64.length);
      
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
        console.error('🔧 AVATAR UPLOAD: Upload failed:', uploadError);
        throw uploadError;
      }

      console.log('🔧 AVATAR UPLOAD: Upload successful:', uploadData);

      // Get the public URL using Supabase client
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-busting parameter to ensure image refreshes
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      console.log('🔧 AVATAR UPLOAD: Upload successful, public URL:', cacheBustedUrl);

      // Update profile with the cache-busted uploaded avatar URL
      const updatedProfile = await updateProfile({
        avatar_url: cacheBustedUrl,
        avatar_type: 'uploaded',
        default_avatar_id: null
      });
      
      console.log('🔧 AVATAR UPLOAD: Profile updated:', updatedProfile);
      return updatedProfile;
    } catch (err) {
      console.error('Error uploading avatar:', err);
      throw err;
    }
  };

  const getAvatarUrl = (size = 200) => {
    if (!profile) return null;
    return getUserAvatarUrl(profile, size);
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    updateDefaultAvatar,
    uploadAvatar,
    getAvatarUrl,
    refetch: fetchProfile
  };
}