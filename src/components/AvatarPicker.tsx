import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../components/ThemeProvider';
import { useProfile } from '../hooks/useProfile';
import { getAvatarOptions, DefaultAvatarId } from '../utils/avatars';
import { Typography, Surface } from '../ui/atoms';

interface AvatarPickerProps {
  onClose: () => void;
}

export function AvatarPicker({ onClose }: AvatarPickerProps) {
  const { theme } = useTheme();
  const { updateDefaultAvatar, uploadAvatar, getAvatarUrl, refetch } = useProfile();
  const [uploading, setUploading] = useState(false);
  const [selectedDefault, setSelectedDefault] = useState<DefaultAvatarId | null>(null);

  const avatarOptions = getAvatarOptions('ui-avatars');

  const handleDefaultAvatarSelect = async (avatarId: DefaultAvatarId) => {
    try {
      setSelectedDefault(avatarId);
      await updateDefaultAvatar(avatarId);
      await refetch(); // Refresh profile data to show new avatar
      Alert.alert('Success', 'Avatar updated!');
      onClose();
    } catch (error) {
      console.error('Error updating avatar:', error);
      Alert.alert('Error', 'Failed to update avatar');
      setSelectedDefault(null);
    }
  };

  const handleUploadPhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant photo library access to upload a profile picture.');
        return;
      }

      // Launch image picker - omit mediaTypes to avoid API issues
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false, // We'll read base64 separately using FileSystem
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        await uploadAvatar(result.assets[0].uri);
        await refetch(); // Refresh profile data to show new avatar
        Alert.alert('Success', 'Profile picture uploaded!');
        onClose();
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera access to take a profile picture.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false, // We'll read base64 separately using FileSystem
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        await uploadAvatar(result.assets[0].uri);
        await refetch(); // Refresh profile data to show new avatar
        Alert.alert('Success', 'Profile picture updated!');
        onClose();
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Typography variant="h3" weight="semibold">Choose Profile Picture</Typography>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Typography variant="bodyLg" color={theme.colors.textPrimary}>✕</Typography>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Current Avatar */}
        <View style={styles.currentSection}>
          <Typography variant="bodySm" weight="medium" color={theme.colors.textSecondary} style={styles.sectionTitle}>
            CURRENT AVATAR
          </Typography>
          <Surface elevation={1} style={styles.currentAvatar}>
            <Image
              source={{ uri: getAvatarUrl(120) || undefined }}
              style={styles.currentAvatarImage}
            />
          </Surface>
        </View>

        {/* Upload Options */}
        <View style={styles.section}>
          <Typography variant="bodySm" weight="medium" color={theme.colors.textSecondary} style={styles.sectionTitle}>
            UPLOAD PHOTO
          </Typography>
          <View style={styles.uploadButtons}>
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: theme.colors.brand['500'] }]}
              onPress={handleUploadPhoto}
              disabled={uploading}
            >
              <Typography variant="bodyMd" weight="medium" color={theme.colors.background}>
                {uploading ? 'Uploading...' : 'Choose from Library'}
              </Typography>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: theme.colors.brand['500'] }]}
              onPress={handleTakePhoto}
              disabled={uploading}
            >
              <Typography variant="bodyMd" weight="medium" color={theme.colors.background}>
                Take Photo
              </Typography>
            </TouchableOpacity>
          </View>
        </View>

        {/* Default Avatars */}
        <View style={styles.section}>
          <Typography variant="bodySm" weight="medium" color={theme.colors.textSecondary} style={styles.sectionTitle}>
            DEFAULT AVATARS
          </Typography>
          <View style={styles.avatarGrid}>
            {avatarOptions.map((avatar) => (
              <TouchableOpacity
                key={avatar.id}
                style={[
                  styles.avatarOption,
                  { borderColor: selectedDefault === avatar.id ? theme.colors.brand['500'] : theme.colors.border }
                ]}
                onPress={() => handleDefaultAvatarSelect(avatar.id)}
              >
                <Image source={{ uri: avatar.url }} style={styles.avatarImage} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  currentSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  currentAvatar: {
    marginTop: 12,
    padding: 8,
    borderRadius: 68, // 120 + 16 padding / 2
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentAvatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  uploadButtons: {
    gap: 12,
  },
  uploadButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  avatarOption: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});