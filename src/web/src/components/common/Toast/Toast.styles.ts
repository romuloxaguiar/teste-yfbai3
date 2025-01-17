import styled, { keyframes } from 'styled-components'; // ^5.3.0
import { lightTheme, darkTheme } from '../../../assets/styles/theme';

// Animation duration in milliseconds
const ANIMATION_DURATION = 250;

// Z-index for toast container to ensure visibility
const Z_INDEX_TOAST = 1000;

// Slide in animation from right
const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

// Slide out animation to right
const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

// Helper function to get status-based colors
const getStatusColor = (status: 'success' | 'error' | 'warning' | 'info', theme = lightTheme) => {
  switch (status) {
    case 'success':
      return theme.palette.greenDark;
    case 'error':
      return theme.palette.redDark;
    case 'warning':
      return theme.palette.orangeLight;
    case 'info':
    default:
      return theme.palette.themePrimary;
  }
};

export const ToastContainer = styled.div`
  position: fixed;
  top: ${({ theme }) => theme.spacing.lg}px;
  right: ${({ theme }) => theme.spacing.lg}px;
  z-index: ${Z_INDEX_TOAST};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm}px;
  max-width: 400px;
  width: calc(100% - ${({ theme }) => theme.spacing.lg * 2}px);
`;

export const ToastWrapper = styled.div<{ isExiting?: boolean; status: 'success' | 'error' | 'warning' | 'info' }>`
  animation: ${({ isExiting }) => isExiting ? slideOut : slideIn} ${ANIMATION_DURATION}ms ${({ theme }) => theme.animation.easing.easeInOut};
  background: ${({ theme }) => theme.palette.white};
  border-left: 4px solid ${({ status, theme }) => getStatusColor(status, theme)};
  border-radius: ${({ theme }) => theme.effects.roundedCorner4};
  box-shadow: ${({ theme }) => theme.effects.elevation8};
  overflow: hidden;
  
  @media (prefers-color-scheme: dark) {
    background: ${({ theme }) => darkTheme.palette.neutralLighter};
  }
`;

export const ToastContent = styled.div`
  display: flex;
  align-items: flex-start;
  padding: ${({ theme }) => theme.spacing.md}px;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

export const ToastIcon = styled.div<{ status: 'success' | 'error' | 'warning' | 'info' }>`
  color: ${({ status, theme }) => getStatusColor(status, theme)};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
`;

export const ToastMessage = styled.p`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  font-size: ${({ theme }) => theme.fonts.medium.fontSize};
  line-height: 1.5;
  color: ${({ theme }) => theme.palette.neutralPrimary};
  
  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) => darkTheme.palette.neutralPrimary};
  }
`;