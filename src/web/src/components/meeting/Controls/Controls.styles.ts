import styled from 'styled-components'; // ^5.3.0
import { lightTheme, darkTheme, highContrastTheme } from '../../../assets/styles/theme';

export const ControlsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.lg}px;
  background-color: ${({ theme }) => theme.palette.neutralLight};
  border-radius: ${({ theme }) => theme.effects.roundedCorner6};
  box-shadow: ${({ theme }) => theme.effects.elevation4};
  transform: translateZ(0);
  backface-visibility: hidden;
  width: 100%;
  position: relative;
  z-index: 1;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm}px;
    padding: ${({ theme }) => theme.spacing.md}px;
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.sm + 1}px) and 
         (max-width: ${({ theme }) => theme.breakpoints.md}px) {
    padding: ${({ theme }) => theme.spacing.sm}px;
  }
`;

export const ControlButton = styled.button<{ isActive?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xs}px;
  padding: ${({ theme }) => `${theme.spacing.sm}px ${theme.spacing.lg}px`};
  min-height: 44px;
  min-width: 44px;
  border: none;
  border-radius: ${({ theme }) => theme.effects.roundedCorner4};
  background-color: ${({ theme, isActive }) => 
    isActive ? theme.palette.themePrimary : theme.palette.neutralLight};
  color: ${({ theme, isActive }) => 
    isActive ? theme.palette.white : theme.palette.neutralPrimary};
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  font-size: ${({ theme }) => theme.fonts.medium.fontSize};
  font-weight: ${({ theme }) => theme.fonts.medium.fontWeight};
  cursor: pointer;
  transition: all ${({ theme }) => theme.animation.duration.fast} ${({ theme }) => theme.animation.easing.easeInOut};
  transform: translateZ(0);

  &:hover {
    background-color: ${({ theme, isActive }) => 
      isActive ? theme.palette.themeSecondary : theme.palette.neutralQuaternaryAlt};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.themePrimary};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    width: 100%;
    justify-content: center;
  }
`;

export const ControlGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm}px;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    width: 100%;
    justify-content: center;
    gap: ${({ theme }) => theme.spacing.xs}px;
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.sm + 1}px) and 
         (max-width: ${({ theme }) => theme.breakpoints.md}px) {
    gap: ${({ theme }) => theme.spacing.xs}px;
  }
`;

export const ControlLabel = styled.span`
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  font-size: ${({ theme }) => theme.fonts.medium.fontSize};
  color: ${({ theme }) => theme.palette.neutralPrimary};
  margin-left: ${({ theme }) => theme.spacing.xs}px;
  user-select: none;
  white-space: nowrap;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}px) {
    font-size: ${({ theme }) => theme.fonts.medium.fontSize};
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.sm + 1}px) and 
         (max-width: ${({ theme }) => theme.breakpoints.md}px) {
    display: none;
  }

  @media (prefers-contrast: more) {
    color: ${({ theme }) => theme.palette.neutralPrimary};
    font-weight: ${({ theme }) => theme.fonts.large.fontWeight};
  }
`;