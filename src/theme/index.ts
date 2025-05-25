import { colors, ColorScheme, ColorTokens } from './colors';
import { typography, TypographyVariant, TypographyWeight } from './typography';

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

export { colors, ColorScheme, ColorTokens, typography, TypographyVariant, TypographyWeight };
