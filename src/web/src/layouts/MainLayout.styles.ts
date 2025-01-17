import styled from 'styled-components'; // ^5.3.0
import { Theme } from '@fluentui/theme'; // ^2.6.0
import { lightTheme, darkTheme, highContrastTheme } from '../assets/styles/theme';

export const Container = styled.div<{ theme: Theme }>`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${({ theme }) => theme.palette.white};
  color: ${({ theme }) => theme.palette.neutralPrimary};
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  font-size: ${({ theme }) => theme.fonts.medium.fontSize};
  line-height: 1.5;
  
  /* Accessibility - Respect reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  /* RTL Support */
  direction: ${({ theme }) => theme.rtl ? 'rtl' : 'ltr'};

  /* High Contrast Mode Support */
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
  }
`;

export const Header = styled.header<{ theme: Theme }>`
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.palette.themePrimary};
  color: ${({ theme }) => theme.palette.white};
  box-shadow: ${({ theme }) => theme.effects.elevation4};
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  
  /* Responsive Design */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    padding: ${({ theme }) => theme.spacing.md};
  }

  /* Accessibility Focus Styles */
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.themePrimary};
    outline-offset: 2px;
  }

  /* High Contrast Mode */
  @media (forced-colors: active) {
    border-bottom: 1px solid ButtonText;
    box-shadow: none;
  }
`;

export const Content = styled.main<{ theme: Theme }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.xl};
  max-width: ${({ theme }) => theme.breakpoints.lg}px;
  margin: 0 auto;
  width: 100%;
  
  /* Responsive Layout */
  @media (max-width: ${({ theme }) => theme.breakpoints.md}px) {
    max-width: 100%;
    padding: ${({ theme }) => theme.spacing.lg};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    padding: ${({ theme }) => theme.spacing.md};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.xs}px) {
    padding: ${({ theme }) => theme.spacing.sm};
  }

  /* Fluid Typography */
  font-size: clamp(
    ${({ theme }) => theme.fonts.medium.fontSize},
    1vw + 10px,
    ${({ theme }) => theme.fonts.mediumPlus.fontSize}
  );

  /* Accessibility */
  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.themePrimary};
    outline-offset: 2px;
  }

  /* High Contrast Mode */
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
  }
`;

export const Footer = styled.footer<{ theme: Theme }>`
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.palette.neutralLight};
  color: ${({ theme }) => theme.palette.neutralSecondary};
  text-align: center;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Responsive Design */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    padding: ${({ theme }) => theme.spacing.sm};
  }

  /* Accessibility - Respect reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  /* High Contrast Mode */
  @media (forced-colors: active) {
    border-top: 1px solid ButtonText;
  }

  /* Focus Styles */
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.themePrimary};
    outline-offset: 2px;
  }
`;