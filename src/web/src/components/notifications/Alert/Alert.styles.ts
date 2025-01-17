import styled from 'styled-components'; // ^5.3.0
import { lightTheme, darkTheme, highContrastTheme } from '../../assets/styles/theme';

// Interface for alert container props
interface AlertContainerProps {
  type: 'success' | 'error' | 'warning' | 'info';
  dismissible?: boolean;
}

// Helper function to get alert type-specific styles
const getAlertTypeStyles = (type: string, theme: typeof lightTheme) => {
  const styles = {
    success: {
      background: theme.palette.neutralLighter,
      color: theme.palette.greenDark,
      borderLeft: `4px solid ${theme.palette.greenDark}`,
    },
    error: {
      background: theme.palette.neutralLighter,
      color: theme.palette.redDark,
      borderLeft: `4px solid ${theme.palette.redDark}`,
    },
    warning: {
      background: theme.palette.neutralLighter,
      color: theme.palette.orangeLight,
      borderLeft: `4px solid ${theme.palette.orangeLight}`,
    },
    info: {
      background: theme.palette.neutralLighter,
      color: theme.palette.themePrimary,
      borderLeft: `4px solid ${theme.palette.themePrimary}`,
    },
  };

  return styles[type as keyof typeof styles];
};

export const AlertContainer = styled.div<AlertContainerProps>`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => `${theme.spacing.s} ${theme.spacing.m}`};
  border-radius: ${({ theme }) => theme.effects.roundedCorner4};
  margin-bottom: ${({ theme }) => theme.spacing.m};
  transition: all ${({ theme }) => theme.animation.duration.medium} ${({ theme }) => theme.animation.easing.easeInOut};
  box-shadow: ${({ theme }) => theme.effects.elevation4};
  position: relative;
  width: 100%;
  max-width: 600px;
  min-height: 48px;
  
  ${({ type, theme }) => getAlertTypeStyles(type, theme)}
  
  /* Accessibility */
  role: alert;
  aria-live: polite;
  
  /* RTL Support */
  direction: inherit;
  text-align: start;
  
  /* Responsive Design */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.s}`};
    margin-bottom: ${({ theme }) => theme.spacing.s};
  }
  
  /* High Contrast Mode Support */
  @media (forced-colors: active) {
    border: 1px solid currentColor;
    forced-color-adjust: none;
  }
`;

export const AlertContent = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  gap: ${({ theme }) => theme.spacing.s};
  padding: ${({ theme }) => theme.spacing.xs} 0;
`;

export const AlertIcon = styled.div`
  display: flex;
  align-items: center;
  font-size: ${({ theme }) => theme.fonts.large.fontSize};
  flex-shrink: 0;
  margin-inline-end: ${({ theme }) => theme.spacing.s};
`;

export const AlertMessage = styled.p`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  font-size: ${({ theme }) => theme.fonts.medium.fontSize};
  line-height: 1.5;
  font-weight: ${({ theme }) => theme.fonts.medium.fontWeight};
  flex: 1;
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  padding: ${({ theme }) => theme.spacing.xs};
  cursor: pointer;
  color: inherit;
  opacity: 0.8;
  transition: opacity ${({ theme }) => theme.animation.duration.fast} ${({ theme }) => theme.animation.easing.easeInOut};
  margin-inline-start: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.effects.roundedCorner2};
  
  /* Accessibility */
  aria-label: "Close alert";
  
  &:hover {
    opacity: 1;
  }
  
  &:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  
  /* High Contrast Mode Support */
  @media (forced-colors: active) {
    border: 1px solid currentColor;
  }
`;