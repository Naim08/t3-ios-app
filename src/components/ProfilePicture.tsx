import React from 'react';
import { Image, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../components/ThemeProvider';

interface ProfilePictureProps {
  size?: number;
  showBorder?: boolean;
  onPress?: () => void;
  userId?: string; // For displaying other users' avatars (future feature)
}

export function ProfilePicture({ 
  size = 40, 
  showBorder = true, 
  onPress,
  userId 
}: ProfilePictureProps) {
  const { theme } = useTheme();
  const { getAvatarUrl } = useProfile();

  const avatarUrl = getAvatarUrl(size);

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: showBorder ? 1 : 0,
      borderColor: theme.colors.border,
    }
  ];

  const imageStyle = [
    styles.image,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    }
  ];

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component style={containerStyle} onPress={onPress}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={imageStyle} />
      ) : (
        <View style={[imageStyle, { backgroundColor: theme.colors.gray[200] }]} />
      )}
    </Component>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
});