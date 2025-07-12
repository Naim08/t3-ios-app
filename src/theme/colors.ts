export const colors = {
  light: {
    brand: {
      "50": "#EEF4FF",
      "100": "#DFE8FF",
      "200": "#C0D1FF",
      "300": "#91B0FF",
      "400": "#6290FF",
      "500": "#3970FF",
      "600": "#2154E6",
      "700": "#173EC0",
      "800": "#112B8D",
      "900": "#0C1D61"
    },
    accent: {
      "50": "#F0FFFA",
      "100": "#CCFCEF",
      "200": "#9DF7DB",
      "300": "#69EFC8",
      "400": "#39E3B4",
      "500": "#16C79B",
      "600": "#0E9C7A",
      "700": "#0A775D",
      "800": "#06543F",
      "900": "#033628"
    },
    gray: {
      "50": "#FFFFFF",
      "100": "#F8F9FA",
      "200": "#E9ECEF",
      "300": "#DEE2E6",
      "400": "#CED4DA",
      "500": "#ADB5BD",
      "600": "#6C757D",
      "700": "#495057",
      "800": "#343A40",
      "900": "#212529"
    },
    danger: {
      "50": "#FFF5F5",
      "100": "#FFE3E3",
      "200": "#FFC9C9",
      "300": "#FFA8A8",
      "400": "#FF8787",
      "500": "#FF6B6B",
      "600": "#FA5252",
      "700": "#F03E3E",
      "800": "#E03131",
      "900": "#C92A2A"
    },
    success: {
      "50": "#F0FDF4",
      "100": "#DCFCE7",
      "200": "#BBF7D0",
      "300": "#86EFAC",
      "400": "#4ADE80",
      "500": "#22C55E",
      "600": "#16A34A",
      "700": "#15803D",
      "800": "#166534",
      "900": "#14532D"
    },
    warning: {
      "50": "#FFFBEB",
      "100": "#FEF3C7",
      "200": "#FDE68A",
      "300": "#FCD34D",
      "400": "#FBBF24",
      "500": "#F59E0B",
      "600": "#D97706",
      "700": "#B45309",
      "800": "#92400E",
      "900": "#78350F"
    },
    info: {
      "50": "#EFF6FF",
      "100": "#DBEAFE",
      "200": "#BFDBFE",
      "300": "#93C5FD",
      "400": "#60A5FA",
      "500": "#3B82F6",
      "600": "#2563EB",
      "700": "#1D4ED8",
      "800": "#1E40AF",
      "900": "#1E3A8A"
    },
    background: "#FAFBFC",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    surfaceVariant: "#F8F9FA",
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    textTertiary: "#94A3B8",
    border: "#E2E8F0",
    borderLight: "#F1F5F9",
    borderStrong: "#CBD5E1",
    shadow: "rgba(15, 23, 42, 0.08)",
    shadowMedium: "rgba(15, 23, 42, 0.12)",
    shadowStrong: "rgba(15, 23, 42, 0.20)"
  },
  dark: {
    brand: {
      "50": "#102043",
      "100": "#152B5C",
      "200": "#1E3A7C",
      "300": "#27489C",
      "400": "#2F55BA",
      "500": "#3963D9",
      "600": "#517CFF",
      "700": "#7FA1FF",
      "800": "#B2C5FF",
      "900": "#E3E8FF"
    },
    accent: {
      "50": "#022B24",
      "100": "#04392F",
      "200": "#07503F",
      "300": "#0D6853",
      "400": "#148165",
      "500": "#1E9A79",
      "600": "#34B58C",
      "700": "#67D0A9",
      "800": "#9DE7C7",
      "900": "#D2F9E5"
    },
    gray: {
      "50": "#0E0F11",
      "100": "#141518",
      "200": "#1B1D20",
      "300": "#222428",
      "400": "#2C2F33",
      "500": "#3A3D42",
      "600": "#4F5359",
      "700": "#6C7077",
      "800": "#9A9EA5",
      "900": "#C8CBD1"
    },
    danger: {
      "50": "#2A0C0C",
      "100": "#3D0E0E",
      "200": "#581212",
      "300": "#711515",
      "400": "#8B1919",
      "500": "#A61D1D",
      "600": "#D43131",
      "700": "#F25555",
      "800": "#FF9A9A",
      "900": "#FFDADA"
    },
    background: "#0E0F11",
    surface: "#141518",
    surfaceElevated: "#1B1D20",
    surfaceVariant: "#222428",
    textPrimary: "#E3E8FF",
    textSecondary: "#9A9EA5",
    textTertiary: "#6C7077",
    border: "#2C2F33",
    borderLight: "#222428",
    borderStrong: "#3A3D42",
    shadow: "rgba(0, 0, 0, 0.3)",
    shadowMedium: "rgba(0, 0, 0, 0.4)",
    shadowStrong: "rgba(0, 0, 0, 0.6)"
  }
};

export type ColorScheme = keyof typeof colors;
export type ColorTokens = typeof colors.light;

// TailwindCSS class utilities for theme colors
export const tailwindColors = {
  // Brand colors
  brand: {
    bg: {
      50: 'bg-brand-50',
      100: 'bg-brand-100',
      200: 'bg-brand-200',
      300: 'bg-brand-300',
      400: 'bg-brand-400',
      500: 'bg-brand-500',
      600: 'bg-brand-600',
      700: 'bg-brand-700',
      800: 'bg-brand-800',
      900: 'bg-brand-900',
    },
    text: {
      50: 'text-brand-50',
      100: 'text-brand-100',
      200: 'text-brand-200',
      300: 'text-brand-300',
      400: 'text-brand-400',
      500: 'text-brand-500',
      600: 'text-brand-600',
      700: 'text-brand-700',
      800: 'text-brand-800',
      900: 'text-brand-900',
    },
    border: {
      50: 'border-brand-50',
      100: 'border-brand-100',
      200: 'border-brand-200',
      300: 'border-brand-300',
      400: 'border-brand-400',
      500: 'border-brand-500',
      600: 'border-brand-600',
      700: 'border-brand-700',
      800: 'border-brand-800',
      900: 'border-brand-900',
    }
  },
  // Accent colors
  accent: {
    bg: {
      50: 'bg-accent-50',
      100: 'bg-accent-100',
      200: 'bg-accent-200',
      300: 'bg-accent-300',
      400: 'bg-accent-400',
      500: 'bg-accent-500',
      600: 'bg-accent-600',
      700: 'bg-accent-700',
      800: 'bg-accent-800',
      900: 'bg-accent-900',
    },
    text: {
      50: 'text-accent-50',
      100: 'text-accent-100',
      200: 'text-accent-200',
      300: 'text-accent-300',
      400: 'text-accent-400',
      500: 'text-accent-500',
      600: 'text-accent-600',
      700: 'text-accent-700',
      800: 'text-accent-800',
      900: 'text-accent-900',
    },
    border: {
      50: 'border-accent-50',
      100: 'border-accent-100',
      200: 'border-accent-200',
      300: 'border-accent-300',
      400: 'border-accent-400',
      500: 'border-accent-500',
      600: 'border-accent-600',
      700: 'border-accent-700',
      800: 'border-accent-800',
      900: 'border-accent-900',
    }
  },
  // Danger colors
  danger: {
    bg: {
      50: 'bg-danger-50',
      100: 'bg-danger-100',
      200: 'bg-danger-200',
      300: 'bg-danger-300',
      400: 'bg-danger-400',
      500: 'bg-danger-500',
      600: 'bg-danger-600',
      700: 'bg-danger-700',
      800: 'bg-danger-800',
      900: 'bg-danger-900',
    },
    text: {
      50: 'text-danger-50',
      100: 'text-danger-100',
      200: 'text-danger-200',
      300: 'text-danger-300',
      400: 'text-danger-400',
      500: 'text-danger-500',
      600: 'text-danger-600',
      700: 'text-danger-700',
      800: 'text-danger-800',
      900: 'text-danger-900',
    },
    border: {
      50: 'border-danger-50',
      100: 'border-danger-100',
      200: 'border-danger-200',
      300: 'border-danger-300',
      400: 'border-danger-400',
      500: 'border-danger-500',
      600: 'border-danger-600',
      700: 'border-danger-700',
      800: 'border-danger-800',
      900: 'border-danger-900',
    }
  }
} as const;

// Utility function to get Tailwind class for theme-aware colors
export const getThemeClass = (colorScheme: ColorScheme, property: 'bg' | 'text' | 'border', baseClass: string) => {
  const isDark = colorScheme === 'dark';
  return isDark ? `dark:${baseClass}` : baseClass;
};
