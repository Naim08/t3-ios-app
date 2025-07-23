import React from 'react';
import { Image, View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';
import { Typography } from '../ui/atoms';

// Import partner images - following ModelProviderLogo pattern exactly
const PARTNER_IMAGES = {
  'gf_1.webp': require('../../assets/partners/gf_1.webp'),
  'gf_2.webp': require('../../assets/partners/gf_2.webp'), 
  'gf_3.webp': require('../../assets/partners/gf_3.webp'),
  'bf_1.webp': require('../../assets/partners/bf_1.webp'),
  'bf_2.webp': require('../../assets/partners/bf_2.webp'),
  'bf_3.webp': require('../../assets/partners/bf_3.webp'),
} as const;

export type PartnerImageType = keyof typeof PARTNER_IMAGES;

interface PartnerPersonaIconProps {
  icon: string;
  size?: number;
  style?: ViewStyle;
}

export const PartnerPersonaIcon: React.FC<PartnerPersonaIconProps> = ({
  icon,
  size = 36,
  style,
}) => {
  const { theme } = useTheme();
  
  // Check if this is a partner image (.webp file)
  const isPartnerImage = icon.endsWith('.webp') && icon in PARTNER_IMAGES;

  if (isPartnerImage) {
    const imageSource = PARTNER_IMAGES[icon as PartnerImageType];
    
    return (
      <View
        style={[
          styles.imageContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
      >
        <Image
          source={imageSource}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Fallback for unknown partner images or regular emojis - like ModelProviderLogo
  return (
    <View
      style={[
        styles.fallbackContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.brand['500'] + '15',
        },
        style,
      ]}
    >
      <Typography 
        variant="h1" 
        style={[
          styles.emojiIcon,
          { 
            fontSize: size * 0.6, 
            lineHeight: size,
          }
        ]}
      >
        {icon}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    // Image styles are handled via props
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiIcon: {
    textAlign: 'center',
  },
}); 