import styled from 'styled-components'; // ^5.3.0
import { css } from '@emotion/react'; // ^11.0.0
import { lightTheme, darkTheme, highContrastTheme } from '../../assets/styles/theme';

export const MeetingContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.palette.neutralLighter};
  color: ${({ theme }) => theme.palette.neutralPrimary};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  transition: all ${({ theme }) => theme.animation.duration.medium} ${({ theme }) => theme.animation.easing.easeInOut};

  @media (max-width: ${({ theme }) => theme.breakpoints.xs}px) {
    padding: ${({ theme }) => theme.spacing.xs}px;
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.xs}px) and (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    padding: ${({ theme }) => theme.spacing.sm}px;
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.sm}px) and (max-width: ${({ theme }) => theme.breakpoints.md}px) {
    padding: ${({ theme }) => theme.spacing.md}px;
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.md}px) {
    padding: ${({ theme }) => theme.spacing.lg}px;
  }
`;

export const MeetingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.palette.white};
  border-bottom: 1px solid ${({ theme }) => theme.palette.neutralLight};
  box-shadow: ${({ theme }) => theme.effects.elevation4};
  transition: box-shadow ${({ theme }) => theme.animation.duration.fast} ${({ theme }) => theme.animation.easing.easeOut};
  z-index: 1;

  &:hover {
    box-shadow: ${({ theme }) => theme.effects.elevation8};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm}px;
    padding: ${({ theme }) => theme.spacing.sm}px;
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}px) {
    padding: ${({ theme }) => theme.spacing.lg}px ${({ theme }) => theme.spacing.xl}px;
  }
`;

export const MeetingContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md}px;
  padding: ${({ theme }) => theme.spacing.lg}px;
  background-color: ${({ theme }) => theme.palette.white};
  border-radius: ${({ theme }) => theme.effects.roundedCorner6};
  box-shadow: ${({ theme }) => theme.effects.elevation8};
  margin: ${({ theme }) => theme.spacing.md}px 0;
  transition: all ${({ theme }) => theme.animation.duration.medium} ${({ theme }) => theme.animation.easing.easeInOut};

  &:focus-within {
    box-shadow: ${({ theme }) => theme.effects.elevation16};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    padding: ${({ theme }) => theme.spacing.sm}px;
    margin: ${({ theme }) => theme.spacing.sm}px 0;
    gap: ${({ theme }) => theme.spacing.sm}px;
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}px) {
    max-width: 1200px;
    margin: ${({ theme }) => theme.spacing.lg}px auto;
    padding: ${({ theme }) => theme.spacing.xl}px;
  }
`;

export const MeetingFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.palette.white};
  border-top: 1px solid ${({ theme }) => theme.palette.neutralLight};
  box-shadow: ${({ theme }) => theme.effects.elevation4};
  gap: ${({ theme }) => theme.spacing.md}px;
  transition: box-shadow ${({ theme }) => theme.animation.duration.fast} ${({ theme }) => theme.animation.easing.easeOut};

  &:hover {
    box-shadow: ${({ theme }) => theme.effects.elevation8};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    flex-direction: column-reverse;
    gap: ${({ theme }) => theme.spacing.sm}px;
    padding: ${({ theme }) => theme.spacing.sm}px;
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}px) {
    padding: ${({ theme }) => theme.spacing.lg}px ${({ theme }) => theme.spacing.xl}px;
  }
`;