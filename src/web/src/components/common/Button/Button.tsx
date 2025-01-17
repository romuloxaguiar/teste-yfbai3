import React, { useCallback, useMemo } from 'react';
import { ErrorBoundary } from '@microsoft/teams-error-boundary'; // ^1.0.0
import { StyledButton } from './Button.styles';
import Icon from '../Icon/Icon';

export interface ButtonProps {
  /** Visual variant of the button */
  variant?: 'primary' | 'secondary' | 'text';
  /** Size variant of the button */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state of the button */
  disabled?: boolean;
  /** Whether button should take full width */
  fullWidth?: boolean;
  /** Optional icon name to display */
  icon?: string;
  /** Position of the icon if provided */
  iconPosition?: 'left' | 'right';
  /** Loading state of the button */
  loading?: boolean;
  /** Accessibility label for icon */
  iconAriaLabel?: string;
  /** Test ID for automated testing */
  testId?: string;
  /** Button content */
  children: React.ReactNode;
  /** Click handler function */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Accessibility label */
  ariaLabel?: string;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Button component implementing Microsoft Fluent UI design system
 * with Teams integration and accessibility support
 */
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  loading = false,
  iconAriaLabel,
  testId,
  children,
  onClick,
  ariaLabel,
  className
}) => {
  // Handle click events with loading state check
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading && onClick) {
        onClick(event);
      }
    },
    [disabled, loading, onClick]
  );

  // Determine if we're in RTL mode
  const isRTL = useMemo(() => {
    return document.dir === 'rtl';
  }, []);

  // Adjust icon position for RTL
  const adjustedIconPosition = useMemo(() => {
    return isRTL ? (iconPosition === 'left' ? 'right' : 'left') : iconPosition;
  }, [isRTL, iconPosition]);

  // Loading spinner icon configuration
  const loadingIcon = useMemo(() => {
    return loading ? (
      <Icon
        name="spinner"
        size={size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'md'}
        variant="secondary"
        ariaLabel="Loading"
      />
    ) : null;
  }, [loading, size]);

  // Main icon configuration
  const buttonIcon = useMemo(() => {
    if (!icon || loading) return null;
    return (
      <Icon
        name={icon}
        size={size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'md'}
        variant={variant === 'primary' ? 'secondary' : 'primary'}
        ariaLabel={iconAriaLabel || `${icon} icon`}
        disabled={disabled}
      />
    );
  }, [icon, loading, size, variant, iconAriaLabel, disabled]);

  const buttonContent = (
    <>
      {adjustedIconPosition === 'left' && (loadingIcon || buttonIcon)}
      <span>{children}</span>
      {adjustedIconPosition === 'right' && (loadingIcon || buttonIcon)}
    </>
  );

  return (
    <ErrorBoundary
      fallback={<button disabled>{children}</button>}
      onError={(error) => {
        console.error('Button render error:', error);
      }}
    >
      <StyledButton
        type="button"
        variant={variant}
        size={size}
        disabled={disabled || loading}
        fullWidth={fullWidth}
        onClick={handleClick}
        aria-label={ariaLabel}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        data-testid={testId}
        className={className}
        iconPosition={adjustedIconPosition}
        loading={loading}
      >
        {buttonContent}
      </StyledButton>
    </ErrorBoundary>
  );
};

// Display name for debugging
Button.displayName = 'Button';

export default Button;