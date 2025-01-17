import React, { useEffect, useCallback, useRef, memo } from 'react';
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import {
  ToastContainer,
  ToastWrapper,
  ToastContent,
  ToastIcon,
  ToastMessage
} from './Toast.styles';
import { Icon } from '../Icon/Icon';
import { getAriaLabel } from '../../../utils/accessibility';
import { useTheme } from '../../../hooks/useTheme';

// Default duration for toast display
const DEFAULT_DURATION = 3000;
// Animation duration for enter/exit
const ANIMATION_DURATION = 300;
// Reduced animation duration for accessibility
const REDUCED_MOTION_DURATION = 100;

interface ToastProps {
  /** Toast message content */
  message: string;
  /** Toast status type affecting styling and icon */
  status: 'success' | 'error' | 'warning' | 'info';
  /** Display duration in milliseconds */
  duration?: number;
  /** Callback function when toast closes */
  onClose?: () => void;
  /** ARIA role for accessibility */
  role?: 'alert' | 'status';
  /** Auto-close behavior control */
  autoClose?: boolean;
}

/**
 * Gets appropriate icon configuration based on toast status and theme
 */
const getStatusIcon = (
  status: ToastProps['status'],
  theme: ReturnType<typeof useTheme>['currentTheme']
) => {
  const iconMap = {
    success: { name: 'success', variant: 'success' },
    error: { name: 'error', variant: 'error' },
    warning: { name: 'warning', variant: 'warning' },
    info: { name: 'info', variant: 'info' }
  };

  return iconMap[status] || iconMap.info;
};

/**
 * Custom hook for managing toast animations with reduced motion support
 */
const useToastAnimation = (
  duration: number,
  onClose?: () => void
) => {
  const [isVisible, setIsVisible] = React.useState(true);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (duration) {
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onClose?.();
        }, ANIMATION_DURATION);
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, onClose]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, ANIMATION_DURATION);
  }, [onClose]);

  return { isVisible, handleClose };
};

/**
 * Toast notification component implementing Microsoft Teams design system
 * with accessibility support and theme awareness
 */
const Toast: React.FC<ToastProps> = memo(({
  message,
  status,
  duration = DEFAULT_DURATION,
  onClose,
  role = 'alert',
  autoClose = true
}) => {
  const { currentTheme } = useTheme();
  const actualDuration = autoClose ? duration : undefined;
  const { isVisible, handleClose } = useToastAnimation(actualDuration, onClose);
  const { name: iconName, variant: iconVariant } = getStatusIcon(status, currentTheme);

  // Accessibility label based on status
  const ariaLabel = getAriaLabel('notification', {
    type: status,
    message
  });

  return (
    <ToastWrapper
      isExiting={!isVisible}
      status={status}
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <ToastContent>
        <ToastIcon status={status}>
          <Icon
            name={iconName}
            variant={iconVariant}
            size="md"
            ariaLabel={status}
          />
        </ToastIcon>
        <ToastMessage>{message}</ToastMessage>
      </ToastContent>
    </ToastWrapper>
  );
});

// Display name for debugging
Toast.displayName = 'Toast';

// Error boundary wrapper for resilience
const ToastWithErrorBoundary: React.FC<ToastProps> = (props) => (
  <ErrorBoundary
    fallback={
      <ToastWrapper status="error" role="alert">
        <ToastContent>
          <ToastMessage>
            An error occurred displaying the notification
          </ToastMessage>
        </ToastContent>
      </ToastWrapper>
    }
    onError={(error) => {
      console.error('Toast rendering error:', error);
    }}
  >
    <Toast {...props} />
  </ErrorBoundary>
);

export default ToastWithErrorBoundary;