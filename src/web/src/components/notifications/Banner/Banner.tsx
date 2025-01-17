import React, { useCallback, useMemo } from 'react';
import { BannerContainer, BannerContent, BannerMessage, BannerActions, BannerIcon } from './Banner.styles';
import { Icon } from '../../common/Icon/Icon';
import { Button } from '../../common/Button/Button';

// Status to icon name mapping with fallbacks
const getStatusIcon = (status: string): string => {
  const iconMap = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };
  return iconMap[status] || 'info';
};

export interface BannerProps {
  /** Status type determining banner appearance and behavior */
  status?: 'success' | 'error' | 'warning' | 'info';
  /** Message text to display with i18n support */
  message: string;
  /** Optional action buttons configuration with loading state */
  actions?: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }>;
  /** Optional dismiss handler with cleanup */
  onDismiss?: () => void;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
  /** Text direction for RTL support */
  dir?: 'ltr' | 'rtl';
  /** Loading state for async operations */
  isLoading?: boolean;
}

/**
 * Banner component that displays status-based messages with actions
 * following Microsoft Teams design system
 */
export const Banner: React.FC<BannerProps> = React.memo(({
  status = 'info',
  message,
  actions = [],
  onDismiss,
  ariaLabel,
  dir = 'ltr',
  isLoading = false
}) => {
  // Get appropriate status icon with fallback
  const iconName = useMemo(() => getStatusIcon(status), [status]);

  // Handle dismiss action with loading state check
  const handleDismiss = useCallback(() => {
    if (!isLoading && onDismiss) {
      onDismiss();
    }
  }, [isLoading, onDismiss]);

  // Handle action click with loading state check
  const handleActionClick = useCallback((actionFn: () => void) => {
    if (!isLoading) {
      actionFn();
    }
  }, [isLoading]);

  return (
    <BannerContainer
      role="alert"
      aria-live="polite"
      aria-label={ariaLabel || `${status} notification`}
      status={status}
      dir={dir}
      isLoading={isLoading}
    >
      <BannerContent>
        <BannerIcon>
          <Icon
            name={iconName}
            size="md"
            variant={status}
            ariaLabel={`${status} icon`}
          />
        </BannerIcon>
        
        <BannerMessage>
          {message}
        </BannerMessage>

        {(actions.length > 0 || onDismiss) && (
          <BannerActions>
            {actions.map((action, index) => (
              <Button
                key={`banner-action-${index}`}
                variant="secondary"
                size="small"
                onClick={() => handleActionClick(action.onClick)}
                disabled={isLoading || action.disabled}
                ariaLabel={action.label}
              >
                {action.label}
              </Button>
            ))}
            
            {onDismiss && (
              <Button
                variant="text"
                size="small"
                icon="dismiss"
                onClick={handleDismiss}
                disabled={isLoading}
                ariaLabel="Dismiss notification"
              />
            )}
          </BannerActions>
        )}
      </BannerContent>
    </BannerContainer>
  );
});

// Display name for debugging
Banner.displayName = 'Banner';

export default Banner;