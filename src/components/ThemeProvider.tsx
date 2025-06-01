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

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const renderCount = useRef(0);
  renderCount.current += 1;

  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    (Appearance.getColorScheme() as ColorScheme) || 'light',
  );

  console.log(`🎨 ThemeProvider render #${renderCount.current}`, {
    colorScheme
  });
  
  console.log('🔥🔥🔥 THEME PROVIDER IS RENDERING 🔥🔥🔥');

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      console.log('🎨 ThemeProvider: Appearance changed to', colorScheme);
      setColorScheme((colorScheme as ColorScheme) || 'light');
    });

    return () => subscription.remove();
  }, []);

  // MEMOIZE the theme to prevent unnecessary re-renders
  const theme = useMemo(() => {
    console.log('🎨 ThemeProvider: Creating new theme object for', colorScheme);
    return createTheme(colorScheme);
  }, [colorScheme]);

  const toggleTheme = () => {
    setColorScheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // MEMOIZE the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    console.log('🎨 ThemeProvider: Creating new context value');
    return { theme, colorScheme, toggleTheme, setColorScheme };
  }, [theme, colorScheme]);

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