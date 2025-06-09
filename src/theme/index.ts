import { colors, ColorScheme, ColorTokens, tailwindColors, getThemeClass } from './colors';
import { typography, TypographyVariant, TypographyWeight, tailwindTypography, getTypographyClasses } from './typography';

export interface Theme {
  colors: ColorTokens;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
  };
  typography: typeof typography;
}

export const createTheme = (scheme: ColorScheme): Theme => ({
  colors: colors[scheme] || colors.light,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
  },
  typography,
});

// TailwindCSS spacing utilities
export const tailwindSpacing = {
  xs: 'space-xs',    // 4px
  sm: 'space-sm',    // 8px  
  md: 'space-md',    // 12px
  lg: 'space-lg',    // 16px
  // Standard Tailwind spacing
  0: 'space-0',
  1: 'space-1',      // 4px
  2: 'space-2',      // 8px
  3: 'space-3',      // 12px
  4: 'space-4',      // 16px
  5: 'space-5',      // 20px
  6: 'space-6',      // 24px
  8: 'space-8',      // 32px
  10: 'space-10',    // 40px
  12: 'space-12',    // 48px
  16: 'space-16',    // 64px
  20: 'space-20',    // 80px
  24: 'space-24',    // 96px
} as const;

// Common TailwindCSS class combinations for our design system
export const twPresets = {
  // Card styles
  card: 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700',
  cardHover: 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow',
  
  // Button styles
  button: {
    primary: 'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold py-3 px-6 rounded-lg',
    secondary: 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg',
    outline: 'border border-brand-500 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900 font-semibold py-3 px-6 rounded-lg',
    ghost: 'text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900 font-semibold py-3 px-6 rounded-lg',
  },
  
  // Text styles
  text: {
    primary: 'text-gray-900 dark:text-white',
    secondary: 'text-gray-500 dark:text-gray-400',
    muted: 'text-gray-400 dark:text-gray-500',
    accent: 'text-brand-500',
    danger: 'text-danger-500',
  },
  
  // Input styles
  input: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
  
  // Surface styles
  surface: {
    primary: 'bg-white dark:bg-gray-800',
    secondary: 'bg-gray-50 dark:bg-gray-900',
    elevated: 'bg-white dark:bg-gray-800 shadow-sm',
  }
} as const;

export { 
  colors, 
  ColorScheme, 
  ColorTokens, 
  typography, 
  TypographyVariant, 
  TypographyWeight,
  tailwindColors,
  tailwindTypography,
  getThemeClass,
  getTypographyClasses
};
