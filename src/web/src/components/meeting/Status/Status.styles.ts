import styled from '@emotion/styled'; // @emotion/styled@11.0.0
import { css } from '@emotion/react'; // @emotion/react@11.0.0
import { lightTheme, darkTheme, highContrastTheme } from '../../../assets/styles/theme';

// Helper function to determine status color based on type and theme
const getStatusColor = (status: string) => ({ theme }: { theme: typeof lightTheme | typeof darkTheme | typeof highContrastTheme }) => {
  switch (status) {
    case 'error':
      return theme.palette.redDark;
    case 'warning':
      return theme.palette.orangeLight;
    case 'success':
      return theme.palette.greenDark;
    case 'info':
    default:
      return theme.palette.themePrimary;
  }
};

export const StatusContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.effects.roundedCorner4};
  background-color: ${({ theme }) => theme.palette.neutralLight};
  transition: all ${({ theme }) => theme.animation.duration.medium} ${({ theme }) => theme.animation.easing.easeInOut};
  position: relative;
  outline: none;

  &:focus-visible {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.palette.themePrimary};
  }

  /* Accessibility attributes */
  &[role="status"] {
    aria-live: polite;
  }
`;

export const StatusIndicator = styled.div<{ status: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${props => getStatusColor(props.status)};
  transition: background-color ${({ theme }) => theme.animation.duration.fast} ${({ theme }) => theme.animation.easing.easeInOut};
  flex-shrink: 0;
  box-shadow: ${({ theme }) => theme.effects.elevation4};

  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border: 1px solid currentColor;
  }
`;

export const StatusText = styled.span`
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  font-size: ${({ theme }) => theme.fonts.medium.fontSize};
  line-height: 1.5;
  color: ${({ theme }) => theme.palette.neutralPrimary};
  transition: color ${({ theme }) => theme.animation.duration.fast} ${({ theme }) => theme.animation.easing.easeInOut};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  font-weight: ${({ theme }) => theme.fonts.medium.fontWeight};

  /* High contrast mode adjustments */
  @media screen and (-ms-high-contrast: active) {
    color: currentColor;
  }
`;

export const ProgressBar = styled.div<{ progress: number }>`
  width: 100%;
  height: 4px;
  background-color: ${({ theme }) => theme.palette.neutralLighter};
  border-radius: ${({ theme }) => theme.effects.roundedCorner2};
  overflow: hidden;
  position: relative;

  /* Accessibility attributes */
  &[role="progressbar"] {
    aria-valuemin: 0;
    aria-valuemax: 100;
  }

  &::after {
    content: '';
    position: absolute;
    height: 100%;
    width: ${props => props.progress}%;
    background-color: ${({ theme }) => theme.palette.themePrimary};
    transition: width ${({ theme }) => theme.animation.duration.medium} ${({ theme }) => theme.animation.easing.easeInOut};
    transform: translateZ(0);
    will-change: width;
  }

  /* High contrast mode support */
  @media screen and (-ms-high-contrast: active) {
    border: 1px solid currentColor;
    &::after {
      background-color: currentColor;
    }
  }
`;