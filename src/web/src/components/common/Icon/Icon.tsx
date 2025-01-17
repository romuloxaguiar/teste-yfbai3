import React, { useCallback, useMemo } from 'react';
import { ErrorBoundary } from '@microsoft/teams-error-boundary'; // ^1.0.0
import { Tooltip } from '@fluentui/react-components'; // ^9.0.0
import { IconWrapper } from './Icon.styles';
import { MeetingIcons, NotificationIcons, ActionIcons, MinutesIcons } from '../../../assets/icons';

// Icon component cache for performance optimization
const iconComponentCache: { [key: string]: React.ComponentType } = {};

interface IconProps {
  /** Name of the icon to display */
  name: string;
  /** Size variant of the icon */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Visual variant/color scheme of the icon */
  variant?: 'primary' | 'secondary' | 'error' | 'success' | 'warning';
  /** Whether the icon is in a disabled state */
  disabled?: boolean;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** Click handler for the icon */
  onClick?: (event: React.MouseEvent<HTMLSpanElement>) => void;
  /** Additional CSS classes */
  className?: string;
  /** Optional tooltip text */
  tooltip?: string;
  /** Loading state indicator */
  loading?: boolean;
  /** Custom tab index for keyboard navigation */
  tabIndex?: number;
}

/**
 * Retrieves the appropriate icon component based on name
 * @param name Icon name to retrieve
 * @returns React component for the icon or undefined if not found
 */
const getIconComponent = (name: string): React.ComponentType | undefined => {
  // Return cached component if available
  if (iconComponentCache[name]) {
    return iconComponentCache[name];
  }

  // Check each icon collection
  const iconCollections = [
    MeetingIcons,
    NotificationIcons,
    ActionIcons,
    MinutesIcons
  ];

  for (const collection of iconCollections) {
    if (name in collection) {
      iconComponentCache[name] = collection[name];
      return collection[name];
    }
  }

  // Log warning if icon not found
  console.warn(`Icon "${name}" not found in any collection`);
  return undefined;
};

/**
 * Icon component implementing Microsoft Teams design system standards
 * with accessibility and performance optimizations
 */
const Icon: React.FC<IconProps> = React.memo(({
  name,
  size = 'md',
  variant = 'primary',
  disabled = false,
  ariaLabel,
  onClick,
  className,
  tooltip,
  loading = false,
  tabIndex = 0
}) => {
  // Memoize icon component retrieval
  const IconComponent = useMemo(() => getIconComponent(name), [name]);

  // Click handler with disabled state check
  const handleClick = useCallback((event: React.MouseEvent<HTMLSpanElement>) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }, [disabled, loading, onClick]);

  // Keyboard interaction handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!disabled && !loading) {
        onClick?.(event as unknown as React.MouseEvent<HTMLSpanElement>);
      }
    }
  }, [disabled, loading, onClick]);

  // Base icon element with accessibility attributes
  const iconElement = (
    <IconWrapper
      className={className}
      size={size}
      variant={variant}
      disabled={disabled || loading}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled || loading ? -1 : tabIndex}
      role={onClick ? 'button' : 'img'}
      aria-label={ariaLabel || name}
      aria-disabled={disabled || loading}
      aria-busy={loading}
    >
      {IconComponent && <IconComponent />}
    </IconWrapper>
  );

  // Wrap with tooltip if provided
  if (tooltip) {
    return (
      <Tooltip content={tooltip} relationship="label">
        {iconElement}
      </Tooltip>
    );
  }

  return iconElement;
});

// Display name for debugging
Icon.displayName = 'Icon';

// Wrap with error boundary for resilience
const IconWithErrorBoundary = (props: IconProps) => (
  <ErrorBoundary
    fallback={<span role="img" aria-label="Icon failed to load">⚠️</span>}
    onError={(error) => {
      console.error('Icon failed to render:', error);
    }}
  >
    <Icon {...props} />
  </ErrorBoundary>
);

export default IconWithErrorBoundary;