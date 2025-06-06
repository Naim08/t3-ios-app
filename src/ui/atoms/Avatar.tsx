import React from 'react';
import { Image, View, StyleSheet, TouchableOpacity, AccessibilityProps } from 'react-native';
import { useTheme } from '../../components/ThemeProvider';
import { useProfile } from '../../hooks/useProfile';

export interface AvatarProps extends AccessibilityProps {
  size?: number;
  showBorder?: boolean;
  onPress?: () => void;
  userId?: string; // For future feature to display other users' avatars
}

export const Avatar: React.FC<AvatarProps> = ({ 
  size = 40, 
  showBorder = true, 
  onPress,
  userId,
  accessible = true,
  accessibilityRole = 'image',
  accessibilityLabel = 'User avatar',
  ...accessibilityProps
}) => {
  const { theme } = useTheme();
  const { getAvatarUrl, profile } = useProfile();

  const avatarUrl = getAvatarUrl(size);

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: showBorder ? StyleSheet.hairlineWidth : 0,
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
    <Component 
      style={containerStyle} 
      onPress={onPress}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      {...accessibilityProps}
    >
      {avatarUrl ? (
        <Image 
          source={{ uri: avatarUrl }} 
          style={imageStyle}
          accessible={false} // Parent handles accessibility
        />
      ) : (
        <View 
          style={[
            imageStyle, 
            { backgroundColor: theme.colors.gray['200'] }
          ]} 
        />
      )}
    </Component>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
});