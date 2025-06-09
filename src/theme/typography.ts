import { Platform } from 'react-native';

export const typography = {
  fontFamily: {
    regular: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }),
    medium: Platform.select({
      ios: 'System',
      android: 'Roboto_medium',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }),
    semibold: Platform.select({
      ios: 'System',
      android: 'Roboto_bold',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }),
    bold: Platform.select({
      ios: 'System',
      android: 'Roboto_bold',
      default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    })
  },
  scale: {
    h1: { fontSize: 32, lineHeight: 40 },
    h2: { fontSize: 28, lineHeight: 36 },
    h3: { fontSize: 24, lineHeight: 32 },
    h4: { fontSize: 20, lineHeight: 28 },
    h5: { fontSize: 18, lineHeight: 24 },
    h6: { fontSize: 16, lineHeight: 24 },
    bodyLg: { fontSize: 18, lineHeight: 28 },
    bodyMd: { fontSize: 16, lineHeight: 24 },
    bodySm: { fontSize: 14, lineHeight: 20 },
    bodyXs: { fontSize: 12, lineHeight: 16 },
    caption: { fontSize: 12, lineHeight: 16 },
    overline: { fontSize: 10, lineHeight: 16 }
  },
  weight: {
    regular: Platform.select({
      ios: '400',
      android: 'normal',
      default: '400'
    }) as '400' | 'normal',
    medium: Platform.select({
      ios: '500',
      android: '500',
      default: '500'
    }) as '500',
    semibold: Platform.select({
      ios: '600',
      android: '600',
      default: '600'
    }) as '600',
    bold: Platform.select({
      ios: '700',
      android: 'bold',
      default: '700'
    }) as '700' | 'bold'
  }
};

export type TypographyVariant = keyof typeof typography.scale;
export type TypographyWeight = keyof typeof typography.weight;

// TailwindCSS class utilities for typography
export const tailwindTypography = {
  // Font sizes mapping to Tailwind classes
  fontSize: {
    h1: 'text-h1',
    h2: 'text-h2', 
    h3: 'text-h3',
    h4: 'text-h4',
    h5: 'text-h5',
    h6: 'text-h6',
    bodyLg: 'text-body-lg',
    bodyMd: 'text-body-md',
    bodySm: 'text-body-sm',
    bodyXs: 'text-body-xs',
    caption: 'text-caption',
    overline: 'text-overline'
  },
  // Font weights mapping to Tailwind classes
  fontWeight: {
    regular: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  }
} as const;

// Utility function to combine typography variant and weight into Tailwind classes
export const getTypographyClasses = (
  variant: TypographyVariant,
  weight?: TypographyWeight,
  additionalClasses?: string
): string => {
  const sizeClass = tailwindTypography.fontSize[variant];
  const weightClass = weight ? tailwindTypography.fontWeight[weight] : tailwindTypography.fontWeight.regular;
  
  return [sizeClass, weightClass, additionalClasses].filter(Boolean).join(' ');
};
