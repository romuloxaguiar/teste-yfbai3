import React, { useRef, useEffect, useCallback, memo } from 'react';
import { useTheme } from 'styled-components';
import { useVirtualizer } from 'react-virtual';
import { ErrorBoundary } from 'react-error-boundary';

import {
  TranscriptionContainer,
  TranscriptionText,
  SpeakerLabel,
  TranscriptionScroll,
  TranscriptionError,
  TranscriptionLoading
} from './Transcription.styles';
import { WebMeeting, WebParticipant, ProcessingStatus } from '../../../types/meeting.types';
import { useMeeting } from '../../../hooks/useMeeting';

// Constants for component configuration
const VIRTUALIZATION_OVERSCAN = 5;
const SCROLL_THRESHOLD = 100;
const AUTO_SCROLL_BEHAVIOR: ScrollBehavior = 'smooth';
const ARIA_LIVE_MODE: 'off' | 'polite' | 'assertive' = 'polite';

interface TranscriptionProps {
  meetingId: string;
  autoScroll?: boolean;
  highContrast?: boolean;
}

/**
 * Enhanced error fallback component with retry capability
 */
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = memo(
  ({ error, resetErrorBoundary }) => (
    <TranscriptionError role="alert" aria-live="assertive">
      <h3>Transcription Error</h3>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>Retry</button>
    </TranscriptionError>
  )
);

/**
 * Enhanced Transcription component with Teams integration, virtualization,
 * and accessibility features
 */
const Transcription: React.FC<TranscriptionProps> = memo(({ 
  meetingId, 
  autoScroll = true, 
  highContrast = false 
}) => {
  // Hooks and refs
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const { meeting, isLoading, error } = useMeeting(meetingId);

  // Virtual list configuration for performance optimization
  const virtualizer = useVirtualizer({
    count: meeting?.transcription?.length ?? 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 50,
    overscan: VIRTUALIZATION_OVERSCAN
  });

  /**
   * Handles automatic scrolling to latest content
   */
  const scrollToBottom = useCallback(() => {
    if (!containerRef.current || !autoScroll || isScrollingRef.current) return;

    const container = containerRef.current;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const currentScroll = container.scrollTop;

    if (scrollHeight - currentScroll - clientHeight < SCROLL_THRESHOLD) {
      container.scrollTo({
        top: scrollHeight,
        behavior: AUTO_SCROLL_BEHAVIOR
      });
    }
  }, [autoScroll]);

  /**
   * Handles keyboard navigation through transcription
   */
  const handleKeyboardNavigation = useCallback((event: React.KeyboardEvent) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollAmount = container.clientHeight * 0.8;

    switch (event.key) {
      case 'ArrowUp':
        container.scrollBy({ top: -scrollAmount, behavior: AUTO_SCROLL_BEHAVIOR });
        event.preventDefault();
        break;
      case 'ArrowDown':
        container.scrollBy({ top: scrollAmount, behavior: AUTO_SCROLL_BEHAVIOR });
        event.preventDefault();
        break;
      case 'Home':
        container.scrollTo({ top: 0, behavior: AUTO_SCROLL_BEHAVIOR });
        event.preventDefault();
        break;
      case 'End':
        container.scrollTo({ 
          top: container.scrollHeight, 
          behavior: AUTO_SCROLL_BEHAVIOR 
        });
        event.preventDefault();
        break;
    }
  }, []);

  /**
   * Effect for handling auto-scroll on new content
   */
  useEffect(() => {
    if (meeting?.transcription?.length) {
      scrollToBottom();
    }
  }, [meeting?.transcription, scrollToBottom]);

  /**
   * Effect for handling scroll state tracking
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      isScrollingRef.current = true;
      clearTimeout(isScrollingRef.current as unknown as number);
      isScrollingRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150) as unknown as boolean;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <TranscriptionLoading 
        role="status" 
        aria-label="Loading transcription"
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <TranscriptionError role="alert" aria-live="assertive">
          <h3>Transcription Error</h3>
          <p>{error.message}</p>
        </TranscriptionError>
      </ErrorBoundary>
    );
  }

  return (
    <TranscriptionContainer
      role="log"
      aria-live={ARIA_LIVE_MODE}
      aria-label="Meeting transcription"
      data-high-contrast={highContrast}
    >
      <TranscriptionScroll
        ref={containerRef}
        onKeyDown={handleKeyboardNavigation}
        tabIndex={0}
        aria-label="Transcription content"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const transcription = meeting?.transcription[virtualRow.index];
            if (!transcription) return null;

            const speaker = meeting?.participants.find(
              (p: WebParticipant) => p.id === transcription.speakerId
            );

            return (
              <div
                key={virtualRow.index}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                <TranscriptionText>
                  <SpeakerLabel
                    aria-label={`Speaker: ${speaker?.name}`}
                    tabIndex={0}
                  >
                    {speaker?.name}
                  </SpeakerLabel>
                  {transcription.content}
                </TranscriptionText>
              </div>
            );
          })}
        </div>
      </TranscriptionScroll>
    </TranscriptionContainer>
  );
});

Transcription.displayName = 'Transcription';

export default Transcription;