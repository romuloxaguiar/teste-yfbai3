import styled from 'styled-components'; // ^5.3.0

/**
 * Calculates responsive width based on viewport size
 * following Teams design system breakpoints
 */
const getResponsiveWidth = ({ theme }) => {
  const { breakpoints } = theme;
  
  if (typeof window !== 'undefined') {
    const width = window.innerWidth;
    
    if (width < breakpoints.sm) { // Mobile (<768px)
      return 'min(90%, calc(100vw - 32px))';
    } else if (width < breakpoints.md) { // Tablet (768px-1024px)
      return 'min(80%, 720px)';
    } else if (width < breakpoints.lg) { // Desktop (1024px-1440px)
      return 'min(70%, 960px)';
    }
    // Large Desktop (>1440px)
    return 'min(60%, 1200px)';
  }
  
  return 'min(90%, 1200px)'; // SSR fallback
};

export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: ${({ theme }) => `${theme.palette.neutralDark}CC`};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  will-change: opacity;
  contain: layout paint size;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  animation: fadeIn ${({ theme }) => theme.animation.duration.medium} ${({ theme }) => theme.animation.easing.easeOut};
`;

export const ModalContainer = styled.div`
  background: ${({ theme }) => theme.palette.white};
  border-radius: ${({ theme }) => theme.effects.roundedCorner4};
  box-shadow: ${({ theme }) => theme.effects.elevation16};
  width: ${getResponsiveWidth};
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
  will-change: transform;
  contain: content;
  overflow: hidden;
  margin: ${({ theme }) => theme.spacing.lg}px;
  outline: none; /* Focus will be handled by inner elements */

  @keyframes scaleIn {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  animation: scaleIn ${({ theme }) => theme.animation.duration.medium} ${({ theme }) => theme.animation.easing.easeOut};

  @media (forced-colors: active) {
    border: 2px solid ${({ theme }) => theme.palette.neutralPrimary};
  }
`;

export const ModalHeader = styled.header`
  padding: ${({ theme }) => `${theme.spacing.lg}px ${theme.spacing.xl}px`};
  border-bottom: 1px solid ${({ theme }) => theme.palette.neutralLight};
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 60px;
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.large.fontFamily};
    font-size: ${({ theme }) => theme.fonts.large.fontSize};
    font-weight: ${({ theme }) => theme.fonts.large.fontWeight};
    color: ${({ theme }) => theme.palette.neutralPrimary};
  }
`;

export const ModalContent = styled.div`
  padding: ${({ theme }) => `${theme.spacing.xl}px`};
  overflow-y: auto;
  flex-grow: 1;
  color: ${({ theme }) => theme.palette.neutralPrimary};
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  font-size: ${({ theme }) => theme.fonts.medium.fontSize};
  line-height: 1.5;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.palette.neutralLighter};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.palette.neutralTertiary};
    border-radius: 3px;
  }
`;

export const ModalFooter = styled.footer`
  padding: ${({ theme }) => `${theme.spacing.lg}px ${theme.spacing.xl}px`};
  border-top: 1px solid ${({ theme }) => theme.palette.neutralLight};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.md}px;
  flex-shrink: 0;
  
  /* Responsive button layout */
  @media (max-width: ${({ theme }) => theme.breakpoints.xs}px) {
    flex-direction: column-reverse;
    gap: ${({ theme }) => theme.spacing.sm}px;
    
    button {
      width: 100%;
    }
  }
`;

export const CloseButton = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md}px;
  right: ${({ theme }) => theme.spacing.md}px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: ${({ theme }) => theme.effects.roundedCorner2};
  color: ${({ theme }) => theme.palette.neutralSecondary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.animation.duration.fast} ${({ theme }) => theme.animation.easing.easeInOut};

  &:hover {
    background: ${({ theme }) => theme.palette.neutralLighter};
    color: ${({ theme }) => theme.palette.neutralPrimary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.themePrimary};
    outline-offset: 1px;
  }

  &:active {
    background: ${({ theme }) => theme.palette.neutralLight};
    color: ${({ theme }) => theme.palette.neutralPrimary};
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
    
    &:hover, &:focus-visible {
      forced-color-adjust: none;
      background: Highlight;
      color: HighlightText;
    }
  }
`;