import React from 'react'; // ^18.0.0
import { LoadingContainer, Spinner, LoadingText } from './Loading.styles';

/**
 * Props interface for the Loading component
 * @property {('small' | 'medium' | 'large')} [size='medium'] - Size variant of the loading spinner
 * @property {string} [text='Loading...'] - Accessible text for screen readers
 */
interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

/**
 * A reusable loading spinner component implementing Microsoft Fluent UI design patterns
 * with Teams theme integration, accessibility features, and performance optimizations.
 * 
 * @component
 * @example
 * <Loading size="medium" text="Loading content..." />
 */
export const Loading: React.FC<LoadingProps> = React.memo(({ 
  size = 'medium',
  text = 'Loading...'
}) => {
  // Validate size prop against allowed values
  if (!['small', 'medium', 'large'].includes(size)) {
    console.warn(`Invalid size prop "${size}" provided to Loading component. Defaulting to "medium".`);
    size = 'medium';
  }

  // Check for reduced motion preference using media query
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <LoadingContainer
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="loading-spinner"
    >
      <Spinner
        size={size}
        aria-hidden="true"
        tabIndex={-1}
        style={{
          // Apply reduced motion if preferred
          animationDuration: prefersReducedMotion ? '1.5s' : '0.8s',
          // Enable hardware acceleration for better performance
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      />
      <LoadingText
        aria-hidden="false"
        role="alert"
      >
        {text}
      </LoadingText>
    </LoadingContainer>
  );
});

// Display name for debugging and dev tools
Loading.displayName = 'Loading';

// Default export for convenient importing
export default Loading;