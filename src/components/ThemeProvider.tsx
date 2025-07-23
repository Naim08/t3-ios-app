import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useMemo,
} from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, createTheme, ColorScheme } from '../theme';

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = '@pocket_t3_theme';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const renderCount = useRef(0);
  renderCount.current += 1;

  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setColorScheme(savedTheme as ColorScheme);
        } else {
          // Fall back to system preference if no saved preference
          const systemTheme = Appearance.getColorScheme() as ColorScheme;
          setColorScheme(systemTheme || 'light');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
        // Fall back to system preference on error
        const systemTheme = Appearance.getColorScheme() as ColorScheme;
        setColorScheme(systemTheme || 'light');
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, []);

  // Save theme preference whenever it changes
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(THEME_STORAGE_KEY, colorScheme).catch((error) => {
        console.error('Error saving theme preference:', error);
      });
    }
  }, [colorScheme, isLoading]);

  // MEMOIZE the theme to prevent unnecessary re-renders
  const theme = useMemo(() => {
    return createTheme(colorScheme);
  }, [colorScheme]);

  const toggleTheme = () => {
    setColorScheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // MEMOIZE the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    return { theme, colorScheme, toggleTheme, setColorScheme };
  }, [theme, colorScheme]);

  // Don't render children until theme is loaded to prevent flash
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};