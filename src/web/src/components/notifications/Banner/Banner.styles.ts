import styled from 'styled-components'; // ^5.3.0
import { Theme } from '@fluentui/theme';
import { lightTheme, darkTheme, highContrastTheme } from '../../../assets/styles/theme';

// Interface for banner container props
interface BannerContainerProps {
  status: 'success' | 'error' | 'warning' | 'info';
  theme: Theme;
  isRTL?: boolean;
}

/**
 * Gets the appropriate background color based on banner status
 * Ensures WCAG AA contrast compliance for text visibility
 */
const getStatusColor = (status: string, theme: Theme): string => {
  // High contrast theme uses specific colors for accessibility
  if (theme === highContrastTheme) {
    switch (status) {
      case 'success': return theme.palette.themeDarker; // High contrast success
      case 'error': return '#ff0000'; // High contrast error
      case 'warning': return theme.palette.themePrimary; // High contrast warning
      case 'info': return theme.palette.themePrimary; // High contrast info
      default: return theme.palette.themePrimary;
    }
  }

  // Regular theme colors with opacity for better text contrast
  switch (status) {
    case 'success': return `${theme.palette.greenLight}E6`; // 90% opacity
    case 'error': return `${theme.palette.redLight}E6`;
    case 'warning': return `${theme.palette.orangeLight}E6`;
    case 'info': return `${theme.palette.themeLighter}E6`;
    default: return theme.palette.themeLighter;
  }
}

// Main banner container with status-based styling
export const BannerContainer = styled.div<BannerContainerProps>`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: ${({ theme }) => theme.spacing.sm}px;
  border-radius: ${({ theme }) => theme.effects.roundedCorner4};
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
  min-height: 48px; // Minimum touch target size
  background-color: ${({ status, theme }) => getStatusColor(status, theme)};
  border: 1px solid ${({ status, theme }) => 
    theme === highContrastTheme ? theme.palette.neutralPrimary : 'transparent'
  };
  box-shadow: ${({ theme }) => theme.effects.elevation4};
  transition: all ${({ theme }) => theme.animation.duration.medium} ${({ theme }) => theme.animation.easing.easeInOut};
  direction: ${({ isRTL }) => isRTL ? 'rtl' : 'ltr'};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    flex-direction: column;
    align-items: stretch;
    padding: ${({ theme }) => theme.spacing.xs}px;
    min-height: 64px;
  }
`;

// Content wrapper for banner message
export const BannerContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  color: ${({ theme }) => theme.palette.neutralPrimary};
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  font-size: ${({ theme }) => theme.fonts.medium.fontSize};
  line-height: 1.5;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${({ theme }) => theme.spacing.xs}px;
  }
`;

// Message text container
export const BannerMessage = styled.div`
  flex: 1;
  padding: ${({ theme }) => `${theme.spacing.xs}px ${theme.spacing.sm}px`};
  color: ${({ theme }) => theme.semanticColors.bodyText};
  font-size: ${({ theme }) => 
    theme === highContrastTheme ? '16px' : theme.fonts.medium.fontSize
  };
  font-weight: ${({ theme }) => theme.fonts.medium.fontWeight};
`;

// Action buttons container
export const BannerActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  margin-left: ${({ theme }) => theme.spacing.md}px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    margin-left: 0;
    margin-top: ${({ theme }) => theme.spacing.xs}px;
    width: 100%;
    justify-content: flex-end;
  }
`;

// Status icon container
export const BannerIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 24px;
  margin-${({ theme }) => theme.isRTL ? 'left' : 'right'}: ${({ theme }) => theme.spacing.sm}px;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    margin-${({ theme }) => theme.isRTL ? 'left' : 'right'}: ${({ theme }) => theme.spacing.xs}px;
  }
`;