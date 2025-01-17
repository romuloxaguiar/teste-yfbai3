import styled from 'styled-components'; // ^5.3.0
import { lightTheme, darkTheme } from '../../../assets/styles/theme';

export const SummaryContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.lg}px;
  background-color: ${({ theme }) => theme.palette.white};
  border-radius: ${({ theme }) => theme.effects.roundedCorner4};
  box-shadow: ${({ theme }) => theme.effects.elevation4};
  margin-bottom: ${({ theme }) => theme.spacing.lg}px;
  transition: background-color ${({ theme }) => theme.animation.duration.medium} ${({ theme }) => theme.animation.easing.easeInOut};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    padding: ${({ theme }) => theme.spacing.md}px;
  }

  @media print {
    box-shadow: none;
    border: 1px solid ${({ theme }) => theme.palette.neutralTertiary};
  }

  [dir='rtl'] & {
    text-align: right;
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) => theme.palette.neutralLighterAlt};
  }
`;

export const SummaryTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.xLarge.fontFamily};
  font-size: ${({ theme }) => theme.fonts.xLarge.fontSize};
  font-weight: ${({ theme }) => theme.fonts.xLarge.fontWeight};
  color: ${({ theme }) => theme.palette.neutralPrimary};
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
  line-height: 1.2;
  letter-spacing: -0.02em;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    font-size: ${({ theme }) => theme.fonts.large.fontSize};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (prefers-contrast: high) {
    color: ${({ theme }) => theme.palette.black};
  }
`;

export const SummaryContent = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md}px;
  padding: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.palette.neutralLighter};
  border-radius: ${({ theme }) => theme.effects.roundedCorner2};
  border: 1px solid ${({ theme }) => theme.palette.neutralLight};
  transition: background-color ${({ theme }) => theme.animation.duration.medium} ${({ theme }) => theme.animation.easing.easeInOut};

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.palette.themePrimary};
    outline-offset: 2px;
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) => theme.palette.neutralQuaternary};
    border-color: ${({ theme }) => theme.palette.neutralTertiaryAlt};
  }

  @media print {
    background-color: transparent;
    border: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const SummaryParagraph = styled.p`
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  font-size: ${({ theme }) => theme.fonts.medium.fontSize};
  color: ${({ theme }) => theme.palette.neutralPrimary};
  line-height: 1.5;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
  white-space: pre-wrap;
  max-width: 75ch;

  &:last-child {
    margin-bottom: 0;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    font-size: ${({ theme }) => theme.fonts.medium.fontSize};
  }

  @media (prefers-contrast: high) {
    color: ${({ theme }) => theme.palette.black};
  }

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) => theme.palette.neutralPrimary};
  }
`;