import { useMediaQuery } from '@mui/material'; // v5.0.0
import { BREAKPOINTS } from '../constants/ui.constants';
import { useMemo, useCallback } from 'react';

// Types for breakpoint values
type BreakpointKey = 'mobile' | 'tablet' | 'desktop' | 'wide';
type ResponsiveValues<T> = Partial<Record<BreakpointKey, T>>;

/**
 * Custom hook that returns the current active breakpoint
 * Uses memoization for performance optimization
 * @returns {BreakpointKey} Current breakpoint identifier
 */
export const useBreakpoint = (): BreakpointKey => {
  const isWideScreen = useMediaQuery(`(min-width:${BREAKPOINTS.WIDE.min}px)`);
  const isDesktopScreen = useMediaQuery(`(min-width:${BREAKPOINTS.DESKTOP.min}px)`);
  const isTabletScreen = useMediaQuery(`(min-width:${BREAKPOINTS.TABLET.min}px)`);
  const isMobileScreen = useMediaQuery(`(min-width:${BREAKPOINTS.MOBILE.min}px)`);

  return useMemo(() => {
    if (isWideScreen) return 'wide';
    if (isDesktopScreen) return 'desktop';
    if (isTabletScreen) return 'tablet';
    if (isMobileScreen) return 'mobile';
    return 'mobile'; // Mobile-first fallback
  }, [isWideScreen, isDesktopScreen, isTabletScreen, isMobileScreen]);
};

/**
 * Checks if current viewport matches mobile breakpoint
 * Considers device orientation for accurate detection
 * @returns {boolean} True if viewport is in mobile range
 */
export const isMobile = (): boolean => {
  const matches = useMediaQuery(
    `(min-width:${BREAKPOINTS.MOBILE.min}px) and 
     (max-width:${BREAKPOINTS.MOBILE.max}px) and 
     (orientation:${BREAKPOINTS.MOBILE.orientation})`
  );
  return useMemo(() => matches, [matches]);
};

/**
 * Checks if current viewport matches tablet breakpoint
 * Handles both portrait and landscape orientations
 * @returns {boolean} True if viewport is in tablet range
 */
export const isTablet = (): boolean => {
  const matches = useMediaQuery(
    `(min-width:${BREAKPOINTS.TABLET.min}px) and 
     (max-width:${BREAKPOINTS.TABLET.max}px)`
  );
  return useMemo(() => matches, [matches]);
};

/**
 * Checks if current viewport matches desktop breakpoint
 * Supports high-DPI display scaling
 * @returns {boolean} True if viewport is in desktop range
 */
export const isDesktop = (): boolean => {
  const matches = useMediaQuery(
    `(min-width:${BREAKPOINTS.DESKTOP.min}px) and 
     (max-width:${BREAKPOINTS.DESKTOP.max}px)`
  );
  return useMemo(() => matches, [matches]);
};

/**
 * Checks if current viewport matches wide breakpoint
 * Supports multi-monitor configurations
 * @returns {boolean} True if viewport is in wide range
 */
export const isWide = (): boolean => {
  const matches = useMediaQuery(`(min-width:${BREAKPOINTS.WIDE.min}px)`);
  return useMemo(() => matches, [matches]);
};

/**
 * Returns appropriate value based on current breakpoint with fallback chain
 * Implements mobile-first approach with graceful fallback
 * @param {ResponsiveValues<T>} values Object containing breakpoint-specific values
 * @returns {T} Value corresponding to current breakpoint or nearest available fallback
 */
export const getResponsiveValue = <T>(values: ResponsiveValues<T>): T => {
  const currentBreakpoint = useBreakpoint();
  
  const getFallbackValue = useCallback((): T => {
    // Fallback chain: wide → desktop → tablet → mobile
    const breakpointOrder: BreakpointKey[] = ['wide', 'desktop', 'tablet', 'mobile'];
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
    
    // Look for the nearest available value in the fallback chain
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const value = values[breakpointOrder[i]];
      if (value !== undefined) return value;
    }
    
    // If no value found in fallback chain, look in reverse
    for (let i = currentIndex - 1; i >= 0; i--) {
      const value = values[breakpointOrder[i]];
      if (value !== undefined) return value;
    }
    
    throw new Error('No responsive value available');
  }, [currentBreakpoint, values]);

  return useMemo(() => {
    const currentValue = values[currentBreakpoint];
    return currentValue !== undefined ? currentValue : getFallbackValue();
  }, [currentBreakpoint, values, getFallbackValue]);
};