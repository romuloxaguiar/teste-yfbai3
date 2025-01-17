import React, { createContext, useContext, useState, useEffect } from 'react'; // @react@18.0.0
import { Theme } from '@fluentui/theme'; // @fluentui/theme@2.6.0
import { lightTheme, darkTheme, highContrastTheme } from '../assets/styles/theme';

// Type definitions for theme context
interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setHighContrast: (enabled: boolean) => void;
  isHighContrast: boolean;
}

// Custom hook for system theme preference detection
const useThemeMediaQuery = (): boolean => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDarkMode(event.matches);
    };

    // Add event listener with compatibility check
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      // Clean up listener with compatibility check
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return isDarkMode;
};

// Custom hook for theme persistence
const useThemePersistence = () => {
  const STORAGE_KEY = 'theme-preferences';

  const getStoredPreferences = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error reading theme preferences:', error);
      return null;
    }
  };

  const setStoredPreferences = (preferences: { isDark: boolean; isHighContrast: boolean }) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error storing theme preferences:', error);
    }
  };

  return { getStoredPreferences, setStoredPreferences };
};

// Create theme context with default values
export const ThemeContext = createContext<ThemeContextType>({
  currentTheme: lightTheme,
  setTheme: () => {},
  toggleTheme: () => {},
  setHighContrast: () => {},
  isHighContrast: false,
});

// Custom hook for using theme context
export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemPrefersDark = useThemeMediaQuery();
  const { getStoredPreferences, setStoredPreferences } = useThemePersistence();
  
  // Initialize state from stored preferences or system defaults
  const storedPreferences = getStoredPreferences();
  const [currentTheme, setCurrentTheme] = useState<Theme>(
    storedPreferences?.isHighContrast
      ? highContrastTheme
      : storedPreferences?.isDark ?? systemPrefersDark
      ? darkTheme
      : lightTheme
  );
  const [isHighContrast, setIsHighContrastState] = useState<boolean>(
    storedPreferences?.isHighContrast ?? false
  );

  // Apply theme to document root using CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const theme = currentTheme;

    // Apply color palette
    Object.entries(theme.palette).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Apply typography
    Object.entries(theme.fonts).forEach(([key, value]) => {
      root.style.setProperty(`--font-${key}-family`, value.fontFamily);
      root.style.setProperty(`--font-${key}-size`, value.fontSize);
      root.style.setProperty(`--font-${key}-weight`, value.fontWeight.toString());
    });

    // Apply spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, `${value}px`);
    });

    // Apply effects
    Object.entries(theme.effects).forEach(([key, value]) => {
      root.style.setProperty(`--effect-${key}`, value);
    });
  }, [currentTheme]);

  // Handle Teams theme synchronization
  useEffect(() => {
    const handleTeamsTheme = () => {
      if ((window as any).microsoftTeams) {
        (window as any).microsoftTeams.getContext((context: any) => {
          if (context.theme) {
            setCurrentTheme(context.theme === 'dark' ? darkTheme : lightTheme);
          }
        });
      }
    };

    // Initialize Teams theme
    if ((window as any).microsoftTeams) {
      (window as any).microsoftTeams.initialize();
      handleTeamsTheme();
      (window as any).microsoftTeams.registerOnThemeChangeHandler(handleTeamsTheme);
    }
  }, []);

  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    setStoredPreferences({
      isDark: theme === darkTheme,
      isHighContrast: theme === highContrastTheme,
    });
  };

  const toggleTheme = () => {
    const newTheme = currentTheme === lightTheme ? darkTheme : lightTheme;
    setTheme(newTheme);
  };

  const setHighContrast = (enabled: boolean) => {
    setIsHighContrastState(enabled);
    setTheme(enabled ? highContrastTheme : systemPrefersDark ? darkTheme : lightTheme);
  };

  const contextValue: ThemeContextType = {
    currentTheme,
    setTheme,
    toggleTheme,
    setHighContrast,
    isHighContrast,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};