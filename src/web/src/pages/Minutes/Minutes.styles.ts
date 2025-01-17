import styled from 'styled-components'; // ^5.3.0
import { lightTheme, darkTheme } from '../../../assets/styles/theme';

export const MinutesContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl}px;
  background-color: ${({ theme }) => theme.palette.neutralLighter};
  color: ${({ theme }) => theme.palette.neutralPrimary};
  min-height: 100vh;
  
  /* Responsive breakpoints */
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}px) {
    max-width: 1024px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}px) {
    max-width: 768px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    padding: ${({ theme }) => theme.spacing.md}px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.xs}px) {
    padding: ${({ theme }) => theme.spacing.sm}px;
  }

  /* Theme transition */
  transition: background-color ${({ theme }) => theme.animation.duration.medium} ${({ theme }) => theme.animation.easing.easeInOut};
  
  /* Accessibility */
  role: region;
  aria-label: "Meeting Minutes";
`;

export const MinutesContent = styled.main`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg}px;
  width: 100%;
  
  /* Semantic HTML and accessibility */
  role: main;
  aria-label: "Meeting Minutes Content";
  
  /* Fluid typography */
  font-size: clamp(14px, 1vw + 10px, 16px);
  line-height: 1.5;
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  color: ${({ theme }) => theme.palette.neutralPrimary};
  
  /* Reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const MinutesSection = styled.section`
  background-color: ${({ theme }) => theme.palette.white};
  border-radius: ${({ theme }) => theme.effects.roundedCorner4};
  box-shadow: ${({ theme }) => theme.effects.elevation4};
  padding: ${({ theme }) => theme.spacing.lg}px;
  margin-bottom: ${({ theme }) => theme.spacing.lg}px;
  
  /* Interactive elevation */
  transition: box-shadow ${({ theme }) => theme.animation.duration.medium} ${({ theme }) => theme.animation.easing.easeInOut};
  &:hover {
    box-shadow: ${({ theme }) => theme.effects.elevation8};
  }
  
  /* Teams design system integration */
  border: 1px solid ${({ theme }) => theme.palette.neutralLight};
  
  /* Reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
  
  /* Accessibility */
  role: region;
`;

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  width: 100%;
  color: ${({ theme }) => theme.palette.neutralPrimary};
  
  /* Accessibility */
  role: alert;
  aria-busy: true;
  aria-label: "Loading meeting minutes";
  
  /* Teams design system integration */
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  font-size: ${({ theme }) => theme.fonts.medium.fontSize};
`;

export const ErrorContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.lg}px;
  background-color: ${({ theme }) => theme.semanticColors.errorText};
  color: ${({ theme }) => theme.palette.white};
  border-radius: ${({ theme }) => theme.effects.roundedCorner4};
  margin: ${({ theme }) => theme.spacing.lg}px 0;
  text-align: center;
  
  /* Accessibility */
  role: alert;
  aria-live: assertive;
  
  /* Teams design system integration */
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  font-weight: 600;
  box-shadow: ${({ theme }) => theme.effects.elevation4};
  
  /* High contrast support */
  @media screen and (-ms-high-contrast: active) {
    background-color: ${({ theme }) => theme.semanticColors.errorText};
    border: 1px solid ${({ theme }) => theme.semanticColors.errorText};
  }
`;