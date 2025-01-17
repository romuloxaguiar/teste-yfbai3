import styled from 'styled-components'; // ^5.3.0

/**
 * Maps size variant to Teams-compliant pixel dimensions
 * @param size Icon size variant
 * @returns CSS pixel value
 */
const getIconSize = (size?: 'sm' | 'md' | 'lg' | 'xl'): string => {
  switch (size) {
    case 'sm':
      return '16px';
    case 'lg':
      return '24px';
    case 'xl':
      return '32px';
    case 'md':
    default:
      return '20px';
  }
};

/**
 * Determines theme-aware icon color with WCAG 2.1 AA compliance
 * @param variant Icon color variant
 * @param theme Current theme object
 * @returns Theme-aware CSS color value
 */
const getIconColor = (
  variant?: 'primary' | 'secondary' | 'error' | 'success' | 'warning',
  theme?: any
): string => {
  if (!theme || !variant) {
    return theme?.palette?.neutralPrimary || '#323130';
  }

  switch (variant) {
    case 'primary':
      return theme.palette.themePrimary;
    case 'secondary':
      return theme.palette.neutralSecondary;
    case 'error':
      return theme.semanticColors.errorText;
    case 'success':
      return theme.semanticColors.successText;
    case 'warning':
      return theme.semanticColors.warningText;
    default:
      return theme.palette.neutralPrimary;
  }
};

interface IconWrapperProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'error' | 'success' | 'warning';
  disabled?: boolean;
}

export const IconWrapper = styled.span<IconWrapperProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${props => getIconSize(props.size)};
  height: ${props => getIconSize(props.size)};
  color: ${props => getIconColor(props.variant, props.theme)};
  opacity: ${props => props.disabled ? 0.5 : 1};
  transition: ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  user-select: none;
  position: relative;
  outline: none;
  border: none;
  background: transparent;

  /* Accessibility focus styles */
  &:focus-visible {
    outline: 2px solid ${props => props.theme.semanticColors.focusBorder};
    outline-offset: 2px;
  }

  /* Interactive states */
  &:hover:not(:disabled) {
    color: ${props => {
      if (props.disabled) return;
      const baseColor = getIconColor(props.variant, props.theme);
      return props.theme.palette.themeDarker;
    }};
  }

  &:active:not(:disabled) {
    color: ${props => {
      if (props.disabled) return;
      const baseColor = getIconColor(props.variant, props.theme);
      return props.theme.palette.themeDark;
    }};
  }

  /* High Contrast Mode support */
  @media screen and (-ms-high-contrast: active) {
    color: ${props => props.disabled ? 'GrayText' : 'ButtonText'};
    forced-color-adjust: none;

    &:hover:not(:disabled) {
      color: Highlight;
    }

    &:focus-visible {
      outline-color: Highlight;
    }
  }
`;