import { useContext } from 'react'; // @react@18.0.0
import { Theme } from '@fluentui/theme'; // @fluentui/theme@2.6.0
import { ThemeContext } from '../contexts/ThemeContext';

/**
 * Custom hook that provides access to theme context and theme management functions
 * with comprehensive error handling and type validation.
 * 
 * @returns {Object} Theme context value with management functions
 * @throws {Error} If used outside ThemeContext provider or if context is malformed
 * 
 * @example
 * const { currentTheme, setTheme, toggleTheme, setHighContrast } = useTheme();
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);

  // Validate context existence
  if (!context) {
    throw new Error(
      'useTheme must be used within a ThemeProvider. ' +
      'Ensure ThemeProvider is present in the component tree above this location.'
    );
  }

  // Runtime type validation of context properties
  const validateThemeShape = (theme: unknown): theme is Theme => {
    return (
      theme !== null &&
      typeof theme === 'object' &&
      'palette' in theme &&
      'fonts' in theme &&
      'effects' in theme &&
      'spacing' in theme
    );
  };

  // Validate theme object structure
  if (!validateThemeShape(context.currentTheme)) {
    throw new Error(
      'Invalid theme structure detected in ThemeContext. ' +
      'Ensure theme object contains required properties: palette, fonts, effects, spacing.'
    );
  }

  // Validate function properties
  if (
    typeof context.setTheme !== 'function' ||
    typeof context.toggleTheme !== 'function' ||
    typeof context.setHighContrast !== 'function'
  ) {
    throw new Error(
      'Invalid theme context structure. ' +
      'Required functions missing: setTheme, toggleTheme, or setHighContrast.'
    );
  }

  // Development mode warnings
  if (process.env.NODE_ENV === 'development') {
    // Log theme changes for debugging
    const originalSetTheme = context.setTheme;
    context.setTheme = (theme: Theme) => {
      console.debug('Theme changed:', theme);
      originalSetTheme(theme);
    };

    // Warn about potential performance issues
    if (Object.keys(context.currentTheme.palette).length > 50) {
      console.warn(
        'Large theme palette detected. Consider optimizing theme structure ' +
        'to improve performance.'
      );
    }
  }

  return {
    currentTheme: context.currentTheme,
    setTheme: context.setTheme,
    toggleTheme: context.toggleTheme,
    setHighContrast: context.setHighContrast,
    isHighContrast: context.isHighContrast
  };
};

// Type definitions for hook return value
export type UseThemeReturn = ReturnType<typeof useTheme>;