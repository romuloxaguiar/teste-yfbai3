import styled, { keyframes } from 'styled-components'; // ^5.3.0
import { lightTheme } from '../../assets/styles/theme';

// Interface for spinner size calculations
interface SpinnerDimensions {
  width: string;
  height: string;
  borderWidth: string;
}

/**
 * Calculates spinner dimensions based on size variant and viewport width
 * Ensures responsive scaling while maintaining proportions
 */
const getSpinnerSize = (size: 'small' | 'medium' | 'large'): SpinnerDimensions => {
  const baseSize = {
    small: { size: 16, border: 2 },
    medium: { size: 32, border: 3 },
    large: { size: 48, border: 4 }
  };

  const dimensions = baseSize[size];
  
  return {
    width: `${dimensions.size}px`,
    height: `${dimensions.size}px`,
    borderWidth: `${dimensions.border}px`
  };
};

// Rotation animation keyframes with Teams-standard easing
const spinAnimation = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

/**
 * Container for loading spinner with accessible markup and responsive spacing
 * Implements WCAG 2.1 AA status role patterns
 */
export const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  padding: ${lightTheme.spacing.lg}px;
  position: relative;
  
  /* Responsive padding adjustments */
  @media (max-width: ${lightTheme.breakpoints.sm}px) {
    padding: ${lightTheme.spacing.md}px;
    min-height: 80px;
  }

  /* Accessibility attributes */
  &[role="status"] {
    outline: none;
  }
`;

/**
 * Animated spinner component with Teams theme integration
 * Supports reduced motion preferences and keyboard focus states
 */
export const Spinner = styled.div<{ size: 'small' | 'medium' | 'large' }>`
  ${props => {
    const dimensions = getSpinnerSize(props.size);
    return `
      width: ${dimensions.width};
      height: ${dimensions.height};
      border: ${dimensions.borderWidth} solid ${lightTheme.palette.neutralLight};
      border-top-color: ${lightTheme.palette.themePrimary};
    `;
  }}
  
  border-radius: 50%;
  animation: ${spinAnimation} 0.8s ${lightTheme.animation.easing.easeInOut} infinite;
  transition: all ${lightTheme.animation.duration.medium};
  
  /* High contrast mode support */
  @media (forced-colors: active) {
    border-color: ButtonText;
    border-top-color: Highlight;
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    animation-duration: 1.5s;
    transition: none;
  }
  
  /* Keyboard focus styling */
  &:focus-visible {
    outline: 2px solid ${lightTheme.palette.themePrimary};
    outline-offset: 2px;
  }
`;

/**
 * Visually hidden text for screen readers
 * Implements WCAG 2.1 AA hidden content patterns
 */
export const LoadingText = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  user-select: none;
  
  /* Ensure text remains hidden in high contrast mode */
  @media (forced-colors: active) {
    color: ButtonText;
  }
`;