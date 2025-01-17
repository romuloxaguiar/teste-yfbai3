import { IFontStyles, IRawStyle } from '@fluentui/react'; // @version ^8.0.0

/**
 * Core font family definitions aligned with Microsoft Teams design system
 */
export const fontFamilies = {
  primary: "'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif",
  monospace: "Consolas, 'Courier New', monospace"
} as const;

/**
 * Typography scale for consistent font sizing across the application
 * Follows Microsoft Teams typography scale for visual consistency
 */
export const fontSizes = {
  tiny: '10px',
  small: '12px',
  medium: '14px',
  large: '16px',
  xLarge: '20px',
  xxLarge: '24px'
} as const;

/**
 * Font weight definitions for text emphasis and hierarchy
 * Aligned with Microsoft Fluent UI font weight system
 */
export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700
} as const;

/**
 * Line height definitions for optimal text readability
 * Based on Microsoft Teams accessibility guidelines
 */
export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.8
} as const;

/**
 * Predefined text styles implementing Teams typography system
 * Provides consistent text styling across the application
 */
export const textStyles: Record<string, IRawStyle> = {
  heading1: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.xxLarge,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    margin: '0 0 8px'
  },
  heading2: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.xLarge,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    margin: '0 0 4px'
  },
  heading3: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.large,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    margin: '0 0 4px'
  },
  body: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.medium,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    margin: '0 0 16px'
  },
  caption: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.small,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    margin: '0'
  }
} as const;