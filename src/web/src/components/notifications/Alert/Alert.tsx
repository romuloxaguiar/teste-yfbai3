import React, { useCallback, useEffect, useRef } from 'react';
import {
  AlertContainer,
  AlertContent,
  AlertIcon,
  AlertMessage,
  CloseButton
} from './Alert.styles';
import { Icon } from '../../common/Icon/Icon';

// Alert component props interface with enhanced accessibility support
export interface AlertProps {
  /** Type of alert that determines styling and icon */
  type: 'success' | 'error' | 'warning' | 'info';
  /** Alert message content */
  message: string;
  /** Whether alert can be dismissed */
  dismissible?: boolean;
  /** Callback function when alert is dismissed */
  onDismiss?: () => void;
  /** Optional callback for retry action on error alerts */
  onRetry?: () => void;
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Text direction for RTL support */
  dir?: 'ltr' | 'rtl';
}

// Helper function to get appropriate icon name based on alert type
const getAlertIcon = (type: AlertProps['type']): string => {
  const iconMap = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };
  return iconMap[type];
};

// Helper function to get appropriate ARIA role based on alert type
const getAriaRole = (type: AlertProps['type']): string => {
  return type === 'error' ? 'alert' : 'status';
};

/**
 * Alert component implementing Microsoft Teams design system
 * with enhanced accessibility and error handling support
 */
export const Alert: React.FC<AlertProps> = React.memo(({
  type,
  message,
  dismissible = true,
  onDismiss,
  onRetry,
  className,
  dir = 'ltr'
}) => {
  const alertRef = useRef<HTMLDivElement>(null);
  const iconName = getAlertIcon(type);
  const ariaRole = getAriaRole(type);

  // Handle keyboard interactions for dismissal
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (dismissible && (event.key === 'Escape' || event.key === 'Delete')) {
      onDismiss?.();
    }
    if (type === 'error' && event.key === 'Enter' && onRetry) {
      onRetry();
    }
  }, [dismissible, onDismiss, type, onRetry]);

  // Handle dismiss button click
  const handleDismiss = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    onDismiss?.();
  }, [onDismiss]);

  // Handle retry action for error alerts
  const handleRetry = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    onRetry?.();
  }, [onRetry]);

  // Focus management for accessibility
  useEffect(() => {
    if (type === 'error' && alertRef.current) {
      alertRef.current.focus();
    }
  }, [type]);

  return (
    <AlertContainer
      ref={alertRef}
      type={type}
      className={className}
      role={ariaRole}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      dir={dir}
      tabIndex={type === 'error' ? 0 : -1}
      onKeyDown={handleKeyDown}
      data-testid={`alert-${type}`}
    >
      <AlertContent>
        <AlertIcon>
          <Icon
            name={iconName}
            size="md"
            variant={type}
            aria-hidden="true"
          />
        </AlertIcon>
        <AlertMessage>
          {message}
        </AlertMessage>
      </AlertContent>

      {type === 'error' && onRetry && (
        <CloseButton
          onClick={handleRetry}
          aria-label="Retry action"
          type="button"
        >
          <Icon
            name="refresh"
            size="sm"
            variant={type}
            aria-hidden="true"
          />
        </CloseButton>
      )}

      {dismissible && (
        <CloseButton
          onClick={handleDismiss}
          aria-label="Close alert"
          type="button"
        >
          <Icon
            name="dismiss"
            size="sm"
            variant={type}
            aria-hidden="true"
          />
        </CloseButton>
      )}
    </AlertContainer>
  );
});

// Display name for debugging
Alert.displayName = 'Alert';

export default Alert;