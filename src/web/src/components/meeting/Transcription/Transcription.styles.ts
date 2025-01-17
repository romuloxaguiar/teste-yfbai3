import styled from 'styled-components'; // styled-components@5.3.0
import { lightTheme, darkTheme, highContrastTheme } from '../../../assets/styles/theme';

// Global constants for layout and styling
const CONTAINER_MAX_HEIGHT = 'calc(100vh - 200px)';
const SCROLLBAR_WIDTH = '8px';
const MOBILE_SCROLLBAR_WIDTH = '12px';
const SCROLL_BEHAVIOR = 'smooth';

// Helper function to generate theme-aware scrollbar styles
const getScrollbarStyles = (theme: typeof lightTheme | typeof darkTheme | typeof highContrastTheme) => `
  &::-webkit-scrollbar {
    width: ${theme.breakpoints.xs ? MOBILE_SCROLLBAR_WIDTH : SCROLLBAR_WIDTH};
    height: ${theme.breakpoints.xs ? MOBILE_SCROLLBAR_WIDTH : SCROLLBAR_WIDTH};
  }

  &::-webkit-scrollbar-track {
    background: ${theme.palette.neutralLighter};
    border-radius: ${theme.effects.roundedCorner4};
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.palette.neutralTertiary};
    border-radius: ${theme.effects.roundedCorner4};
    border: 2px solid transparent;
    background-clip: padding-box;
    transition: background-color ${theme.animation.duration.medium} ${theme.animation.easing.easeInOut};

    &:hover {
      background: ${theme.palette.neutralSecondary};
    }
  }

  @media (hover: none) and (pointer: coarse) {
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }
`;

export const TranscriptionContainer = styled.div`
  display: flex;
  flex-direction: column;
  max-height: ${CONTAINER_MAX_HEIGHT};
  width: 100%;
  background: ${({ theme }) => theme.palette.white};
  border: 1px solid ${({ theme }) => theme.palette.neutralLight};
  border-radius: ${({ theme }) => theme.effects.roundedCorner6};
  box-shadow: ${({ theme }) => theme.effects.elevation4};
  padding: ${({ theme }) => theme.spacing.lg}px;
  margin: ${({ theme }) => theme.spacing.md}px 0;
  position: relative;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    padding: ${({ theme }) => theme.spacing.md}px;
    margin: ${({ theme }) => theme.spacing.sm}px 0;
  }

  /* High Contrast Mode Support */
  @media screen and (-ms-high-contrast: active) {
    border: 2px solid ${({ theme }) => theme.semanticColors.focusBorder};
    background: ${({ theme }) => theme.semanticColors.bodyBackground};
  }
`;

export const TranscriptionScroll = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: ${SCROLL_BEHAVIOR};
  padding-right: ${({ theme }) => theme.spacing.md}px;
  
  ${({ theme }) => getScrollbarStyles(theme)}

  &:focus {
    outline: 2px solid ${({ theme }) => theme.semanticColors.focusBorder};
    outline-offset: -2px;
  }

  /* Ensure smooth scrolling only on non-reduced-motion preference */
  @media (prefers-reduced-motion: reduce) {
    scroll-behavior: auto;
  }
`;

export const TranscriptionText = styled.p`
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  font-size: ${({ theme }) => theme.fonts.medium.fontSize};
  line-height: 1.5;
  color: ${({ theme }) => theme.semanticColors.bodyText};
  margin: ${({ theme }) => theme.spacing.xs}px 0;
  white-space: pre-wrap;
  word-break: break-word;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.semanticColors.focusBorder};
    outline-offset: 2px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    font-size: ${({ theme }) => theme.fonts.medium.fontSize};
    line-height: 1.4;
  }
`;

export const SpeakerLabel = styled.span`
  font-family: ${({ theme }) => theme.fonts.mediumPlus.fontFamily};
  font-weight: 600;
  color: ${({ theme }) => theme.palette.themePrimary};
  margin-right: ${({ theme }) => theme.spacing.sm}px;
  user-select: none;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.semanticColors.focusBorder};
    outline-offset: 2px;
  }

  /* High Contrast Mode Support */
  @media screen and (-ms-high-contrast: active) {
    color: ${({ theme }) => theme.semanticColors.buttonText};
    background: ${({ theme }) => theme.semanticColors.buttonBackground};
    padding: ${({ theme }) => `${theme.spacing.xxs}px ${theme.spacing.xs}px`};
    border-radius: ${({ theme }) => theme.effects.roundedCorner2};
  }
`;