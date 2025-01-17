import { createTheme } from '@fluentui/react'; // @fluentui/react@8.0.0
import { Theme, IPartialTheme } from '@fluentui/theme'; // @fluentui/theme@2.6.0

// Base spacing unit in pixels
const SPACING_UNIT = 4;

// Default font family following Microsoft Teams design system
const FONT_FAMILY = "'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', sans-serif";

// Responsive breakpoints (in pixels)
const BREAKPOINTS = {
  xs: 320,
  sm: 768,
  md: 1024,
  lg: 1440
};

/**
 * Creates spacing scale based on base unit with consistent multipliers
 * @param baseUnit Base spacing unit in pixels
 * @returns Object containing spacing scale values
 */
const createSpacing = (baseUnit: number) => {
  const cache: { [key: string]: number } = {};
  
  return {
    xxs: cache.xxs || (cache.xxs = baseUnit * 0.5),  // 2px
    xs: cache.xs || (cache.xs = baseUnit),           // 4px
    sm: cache.sm || (cache.sm = baseUnit * 2),       // 8px
    md: cache.md || (cache.md = baseUnit * 3),       // 12px
    lg: cache.lg || (cache.lg = baseUnit * 4),       // 16px
    xl: cache.xl || (cache.xl = baseUnit * 6),       // 24px
    xxl: cache.xxl || (cache.xxl = baseUnit * 8)     // 32px
  };
};

/**
 * Generates semantic colors based on base palette with WCAG AA compliance
 * @param basePalette Base color palette
 * @returns Semantic color mapping
 */
const createSemanticColors = (basePalette: IPartialTheme['palette']) => ({
  bodyBackground: basePalette?.white,
  bodyText: basePalette?.neutralPrimary,
  bodySubtext: basePalette?.neutralSecondary,
  bodyDivider: basePalette?.neutralLight,
  
  actionLink: basePalette?.themePrimary,
  actionLinkHovered: basePalette?.themeDarker,
  
  buttonBackground: basePalette?.themePrimary,
  buttonBackgroundHovered: basePalette?.themeDarker,
  buttonBackgroundPressed: basePalette?.themeDark,
  buttonText: basePalette?.white,
  buttonTextHovered: basePalette?.white,
  buttonTextPressed: basePalette?.white,
  
  inputBackground: basePalette?.white,
  inputBorder: basePalette?.neutralSecondary,
  inputBorderHovered: basePalette?.neutralPrimary,
  inputFocusBorderAlt: basePalette?.themePrimary,
  inputPlaceholderText: basePalette?.neutralTertiary,
  
  errorText: basePalette?.redDark,
  warningText: basePalette?.orangeLight,
  successText: basePalette?.greenDark,
  
  focusBorder: basePalette?.themePrimary
});

// Light theme configuration
export const lightTheme: Theme = createTheme({
  palette: {
    themePrimary: '#0078d4',
    themeLighterAlt: '#f3f9fd',
    themeLighter: '#d0e7f8',
    themeLight: '#a7d0f2',
    themeTertiary: '#5ca3e5',
    themeSecondary: '#207bd3',
    themeDarkAlt: '#006cbe',
    themeDark: '#005ba1',
    themeDarker: '#004377',
    neutralLighterAlt: '#faf9f8',
    neutralLighter: '#f3f2f1',
    neutralLight: '#edebe9',
    neutralQuaternaryAlt: '#e1dfdd',
    neutralQuaternary: '#d0d0d0',
    neutralTertiaryAlt: '#c8c6c4',
    neutralTertiary: '#a19f9d',
    neutralSecondary: '#605e5c',
    neutralPrimaryAlt: '#3b3a39',
    neutralPrimary: '#323130',
    neutralDark: '#201f1e',
    black: '#000000',
    white: '#ffffff'
  },
  fonts: {
    medium: {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      fontWeight: 400
    },
    mediumPlus: {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      fontWeight: 400
    },
    large: {
      fontFamily: FONT_FAMILY,
      fontSize: '18px',
      fontWeight: 400
    },
    xLarge: {
      fontFamily: FONT_FAMILY,
      fontSize: '22px',
      fontWeight: 600
    }
  },
  effects: {
    roundedCorner2: '2px',
    roundedCorner4: '4px',
    roundedCorner6: '6px',
    elevation4: '0 1.6px 3.6px 0 rgba(0, 0, 0, 0.132), 0 0.3px 0.9px 0 rgba(0, 0, 0, 0.108)',
    elevation8: '0 3.2px 7.2px 0 rgba(0, 0, 0, 0.132), 0 0.6px 1.8px 0 rgba(0, 0, 0, 0.108)',
    elevation16: '0 6.4px 14.4px 0 rgba(0, 0, 0, 0.132), 0 1.2px 3.6px 0 rgba(0, 0, 0, 0.108)'
  },
  spacing: createSpacing(SPACING_UNIT),
  breakpoints: BREAKPOINTS,
  animation: {
    duration: {
      fast: '100ms',
      medium: '200ms',
      slow: '300ms'
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)'
    }
  }
});

// Dark theme configuration
export const darkTheme: Theme = createTheme({
  palette: {
    themePrimary: '#2899f5',
    themeLighterAlt: '#020609',
    themeLighter: '#061823',
    themeLight: '#0b2d43',
    themeTertiary: '#175b85',
    themeSecondary: '#2285c3',
    themeDarkAlt: '#3ea3f6',
    themeDark: '#5cb2f7',
    themeDarker: '#87c6f9',
    neutralLighterAlt: '#2b2b2b',
    neutralLighter: '#333333',
    neutralLight: '#414141',
    neutralQuaternaryAlt: '#4a4a4a',
    neutralQuaternary: '#515151',
    neutralTertiaryAlt: '#6f6f6f',
    neutralTertiary: '#c8c8c8',
    neutralSecondary: '#d0d0d0',
    neutralPrimaryAlt: '#dadada',
    neutralPrimary: '#ffffff',
    neutralDark: '#f4f4f4',
    black: '#f8f8f8',
    white: '#1f1f1f'
  },
  semanticColors: createSemanticColors({
    ...darkTheme?.palette,
    bodyBackground: '#1f1f1f',
    bodyText: '#ffffff'
  }),
  fonts: lightTheme.fonts,
  effects: lightTheme.effects,
  spacing: lightTheme.spacing,
  breakpoints: lightTheme.breakpoints,
  animation: lightTheme.animation
});

// High contrast theme configuration (WCAG AAA compliant)
export const highContrastTheme: Theme = createTheme({
  palette: {
    themePrimary: '#ffff00',
    themeLighterAlt: '#000000',
    themeLighter: '#808000',
    themeLight: '#d4d400',
    themeTertiary: '#ffff3d',
    themeSecondary: '#ffff71',
    themeDarkAlt: '#ffff8f',
    themeDark: '#ffffa6',
    themeDarker: '#ffffc7',
    neutralLighterAlt: '#000000',
    neutralLighter: '#000000',
    neutralLight: '#000000',
    neutralQuaternaryAlt: '#000000',
    neutralQuaternary: '#000000',
    neutralTertiaryAlt: '#000000',
    neutralTertiary: '#ffffff',
    neutralSecondary: '#ffffff',
    neutralPrimaryAlt: '#ffffff',
    neutralPrimary: '#ffffff',
    neutralDark: '#ffffff',
    black: '#ffffff',
    white: '#000000'
  },
  semanticColors: {
    bodyBackground: '#000000',
    bodyText: '#ffffff',
    buttonBackground: '#ffffff',
    buttonText: '#000000',
    inputBackground: '#000000',
    inputBorder: '#ffffff',
    inputFocusBorderAlt: '#ffff00',
    errorText: '#ff0000',
    warningText: '#ffff00',
    successText: '#00ff00',
    focusBorder: '#ffff00'
  },
  fonts: {
    ...lightTheme.fonts,
    medium: {
      ...lightTheme.fonts.medium,
      fontSize: '16px' // Increased font size for better readability
    }
  },
  effects: {
    ...lightTheme.effects,
    elevation4: '0 0 0 1px #ffffff',
    elevation8: '0 0 0 2px #ffffff',
    elevation16: '0 0 0 4px #ffffff'
  },
  spacing: lightTheme.spacing,
  breakpoints: lightTheme.breakpoints,
  animation: {
    ...lightTheme.animation,
    duration: {
      ...lightTheme.animation.duration,
      medium: '400ms' // Slower animations for better visibility
    }
  }
});