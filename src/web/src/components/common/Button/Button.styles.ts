import styled, { css } from 'styled-components'; // ^5.3.0
import { Theme } from '../../assets/styles/theme';

// Helper function to generate variant-specific styles
const getVariantStyles = (theme: Theme, variant: string) => {
  switch (variant) {
    case 'primary':
      return css`
        background: ${theme.palette.themePrimary};
        color: ${theme.palette.white};
        border: none;

        &:hover:not(:disabled) {
          background: ${theme.palette.themeDarkAlt};
        }

        @media screen and (-ms-high-contrast: active) {
          background: ${theme.palette.white};
          color: ${theme.palette.black};
          border: 1px solid ${theme.palette.white};
        }
      `;

    case 'secondary':
      return css`
        background: ${theme.palette.neutralLight};
        color: ${theme.palette.neutralPrimary};
        border: 1px solid ${theme.palette.neutralSecondary};

        &:hover:not(:disabled) {
          background: ${theme.palette.neutralQuaternaryAlt};
        }

        @media screen and (-ms-high-contrast: active) {
          background: transparent;
          border: 1px solid ${theme.palette.white};
        }
      `;

    case 'text':
      return css`
        background: transparent;
        color: ${theme.palette.themePrimary};
        padding: ${theme.spacing.xs}px ${theme.spacing.sm}px;

        &:hover:not(:disabled) {
          background: ${theme.palette.neutralLighter};
          color: ${theme.palette.themeDarker};
        }

        @media screen and (-ms-high-contrast: active) {
          color: ${theme.palette.white};
        }
      `;

    case 'icon':
      return css`
        background: transparent;
        color: ${theme.palette.neutralPrimary};
        padding: ${theme.spacing.xs}px;
        border-radius: 50%;
        min-width: 32px;
        min-height: 32px;

        &:hover:not(:disabled) {
          background: ${theme.palette.neutralLighter};
        }

        @media screen and (-ms-high-contrast: active) {
          color: ${theme.palette.white};
          border: 1px solid currentColor;
        }
      `;

    case 'link':
      return css`
        background: transparent;
        color: ${theme.palette.themePrimary};
        padding: 0;
        text-decoration: underline;
        height: auto;
        min-height: 0;

        &:hover:not(:disabled) {
          color: ${theme.palette.themeDarker};
        }

        @media screen and (-ms-high-contrast: active) {
          color: ${theme.palette.white};
        }
      `;

    default:
      return css``;
  }
};

// Helper function to generate size-specific styles
const getSizeStyles = (theme: Theme, size: string) => {
  switch (size) {
    case 'small':
      return css`
        height: 24px;
        padding: 0 ${theme.spacing.sm}px;
        font-size: ${theme.fonts.medium.fontSize};
        min-width: 60px;
      `;

    case 'large':
      return css`
        height: 40px;
        padding: 0 ${theme.spacing.lg}px;
        font-size: ${theme.fonts.mediumPlus.fontSize};
        min-width: 96px;
      `;

    default: // medium
      return css`
        height: 32px;
        padding: 0 ${theme.spacing.md}px;
        font-size: ${theme.fonts.medium.fontSize};
        min-width: 80px;
      `;
  }
};

interface StyledButtonProps {
  variant?: 'primary' | 'secondary' | 'text' | 'icon' | 'link';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  iconPosition?: 'start' | 'end';
}

export const StyledButton = styled.button<StyledButtonProps>`
  // Base styles
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-sizing: border-box;
  margin: 0;
  border: none;
  cursor: pointer;
  font-family: ${({ theme }) => theme.fonts.medium.fontFamily};
  font-weight: ${({ theme }) => theme.fonts.medium.fontWeight};
  transition: all ${({ theme }) => theme.animation.duration.medium} ${({ theme }) => theme.animation.easing.easeInOut};
  border-radius: ${({ theme }) => theme.effects.roundedCorner2};
  outline: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  width: ${({ fullWidth }) => fullWidth ? '100%' : 'auto'};

  // Variant styles
  ${({ theme, variant = 'primary' }) => getVariantStyles(theme, variant)}

  // Size styles
  ${({ theme, size = 'medium' }) => getSizeStyles(theme, size)}

  // Focus styles
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.palette.white},
                0 0 0 4px ${({ theme }) => theme.palette.themePrimary};

    @media screen and (-ms-high-contrast: active) {
      outline: 2px solid ${({ theme }) => theme.palette.white};
      outline-offset: 2px;
    }
  }

  // Disabled styles
  &:disabled {
    cursor: not-allowed;
    pointer-events: none;
    opacity: 0.4;
  }

  // Loading state
  ${({ loading }) => loading && css`
    pointer-events: none;
    opacity: 0.7;
    cursor: wait;
  `}

  // Icon positioning
  ${({ iconPosition }) => iconPosition === 'end' && css`
    flex-direction: row-reverse;

    & > *:first-child {
      margin-left: ${({ theme }) => theme.spacing.xs}px;
      margin-right: 0;
    }
  `}

  // Icon spacing when not icon-only button
  ${({ variant }) => variant !== 'icon' && css`
    & > *:first-child {
      margin-right: ${({ theme }) => theme.spacing.xs}px;
    }
  `}

  // RTL support
  [dir='rtl'] & {
    ${({ iconPosition }) => iconPosition === 'end' ? css`
      flex-direction: row;
    ` : css`
      flex-direction: row-reverse;
    `}
  }

  // High contrast mode support
  @media screen and (-ms-high-contrast: active) {
    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.palette.white};
      outline-offset: 2px;
    }
  }
`;