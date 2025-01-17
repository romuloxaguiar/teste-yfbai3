import React, { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; // ^12.0.0
import { ErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import { Spinner } from '@fluentui/react'; // ^8.0.0

import {
  SummaryContainer,
  SummaryTitle,
  SummaryContent,
  SummaryParagraph
} from './Summary.styles';
import type { WebMinutes } from '../../../types/minutes.types';
import { useMeeting } from '../../../hooks/useMeeting';

interface SummaryProps {
  minutes: WebMinutes;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

/**
 * Summary component displays AI-generated meeting minutes summary with Teams styling
 * and full accessibility support.
 */
const Summary: React.FC<SummaryProps> = memo(({ 
  minutes, 
  isLoading, 
  error, 
  onRetry 
}) => {
  const { t } = useTranslation();
  const { meeting } = useMeeting();

  /**
   * Handles keyboard navigation for interactive elements
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const target = event.target as HTMLElement;
      target.click();
    }
  }, []);

  /**
   * Error fallback component with retry functionality
   */
  const ErrorFallback = useCallback(({ error, resetErrorBoundary }: any) => (
    <SummaryContainer
      role="alert"
      aria-live="assertive"
      data-testid="summary-error"
    >
      <SummaryTitle>{t('minutes.summary.errorTitle')}</SummaryTitle>
      <SummaryContent>
        <SummaryParagraph>
          {error.message || t('minutes.summary.defaultError')}
        </SummaryParagraph>
        <button
          onClick={resetErrorBoundary}
          onKeyDown={handleKeyDown}
          aria-label={t('common.retry')}
        >
          {t('common.retry')}
        </button>
      </SummaryContent>
    </SummaryContainer>
  ), [t, handleKeyDown]);

  // Loading state
  if (isLoading) {
    return (
      <SummaryContainer
        role="status"
        aria-busy="true"
        data-testid="summary-loading"
      >
        <SummaryTitle>{t('minutes.summary.loading')}</SummaryTitle>
        <SummaryContent>
          <Spinner 
            label={t('minutes.summary.generatingText')}
            ariaLabel={t('minutes.summary.generatingText')}
          />
        </SummaryContent>
      </SummaryContainer>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={onRetry}
      resetKeys={[minutes?.id]}
    >
      <SummaryContainer
        role="region"
        aria-labelledby="summary-title"
        data-testid="summary-content"
      >
        <SummaryTitle 
          id="summary-title"
          tabIndex={0}
        >
          {t('minutes.summary.title')}
        </SummaryTitle>
        <SummaryContent>
          {minutes?.summary ? (
            <SummaryParagraph
              role="article"
              aria-label={t('minutes.summary.contentLabel')}
              dangerouslySetInnerHTML={{ 
                __html: minutes.summary.replace(/\n/g, '<br />') 
              }}
            />
          ) : (
            <SummaryParagraph>
              {t('minutes.summary.noContent')}
            </SummaryParagraph>
          )}
        </SummaryContent>
      </SummaryContainer>
    </ErrorBoundary>
  );
});

// Display name for debugging
Summary.displayName = 'Summary';

export default Summary;