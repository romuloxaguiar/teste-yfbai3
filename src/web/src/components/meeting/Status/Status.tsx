import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next'; // ^12.0.0
import {
  StatusContainer,
  StatusIndicator,
  StatusText,
  ProgressBar
} from './Status.styles';
import {
  WebMeeting,
  ProcessingStatus,
  WebSocketHealth
} from '../../../types/meeting.types';
import { useMeeting } from '../../../hooks/useMeeting';
import { ErrorCode } from '../../../../backend/shared/constants/error-codes';

interface StatusProps {
  meetingId: string;
  className?: string;
  highContrast?: boolean;
}

/**
 * Status component for displaying meeting minutes processing state
 * with enhanced accessibility and error handling
 */
const Status: React.FC<StatusProps> = ({
  meetingId,
  className,
  highContrast = false
}) => {
  const { t } = useTranslation();
  const { meeting, error, retryProcessing } = useMeeting(meetingId);

  /**
   * Determines status variant for styling based on processing state
   */
  const getStatusVariant = useCallback((
    status: ProcessingStatus,
    socketHealth?: WebSocketHealth
  ): 'info' | 'success' | 'error' | 'warning' => {
    if (error?.code === ErrorCode.TEAMS_API_ERROR) return 'error';
    if (socketHealth === 'DISCONNECTED') return 'warning';

    switch (status) {
      case ProcessingStatus.COMPLETED:
        return 'success';
      case ProcessingStatus.ERROR:
        return 'error';
      default:
        return 'info';
    }
  }, [error]);

  /**
   * Generates localized status message with error context
   */
  const getStatusMessage = useCallback((
    status: ProcessingStatus,
    error?: Error | null
  ): string => {
    if (error) {
      return t('status.error', { 
        context: error.message,
        defaultValue: 'Processing error occurred'
      });
    }

    switch (status) {
      case ProcessingStatus.IDLE:
        return t('status.idle', 'Waiting to start');
      case ProcessingStatus.PROCESSING_TRANSCRIPTION:
        return t('status.transcribing', 'Processing meeting transcription');
      case ProcessingStatus.GENERATING_MINUTES:
        return t('status.generating', 'Generating meeting minutes');
      case ProcessingStatus.DISTRIBUTING:
        return t('status.distributing', 'Distributing meeting minutes');
      case ProcessingStatus.COMPLETED:
        return t('status.completed', 'Minutes generation completed');
      case ProcessingStatus.ERROR:
        return t('status.error', 'Error processing meeting minutes');
      default:
        return t('status.unknown', 'Unknown status');
    }
  }, [t]);

  /**
   * Calculates progress percentage for determinate states
   */
  const getProgress = useCallback((meeting: WebMeeting | null): number => {
    if (!meeting) return 0;
    
    switch (meeting.metadata.processingStatus) {
      case ProcessingStatus.PROCESSING_TRANSCRIPTION:
        return 25;
      case ProcessingStatus.GENERATING_MINUTES:
        return 75;
      case ProcessingStatus.DISTRIBUTING:
        return 90;
      case ProcessingStatus.COMPLETED:
        return 100;
      default:
        return 0;
    }
  }, []);

  /**
   * Memoized status variant and message
   */
  const { variant, message, progress } = useMemo(() => ({
    variant: getStatusVariant(
      meeting?.metadata.processingStatus || ProcessingStatus.IDLE,
      meeting?.metadata.socketHealth
    ),
    message: getStatusMessage(
      meeting?.metadata.processingStatus || ProcessingStatus.IDLE,
      error
    ),
    progress: getProgress(meeting)
  }), [meeting, error, getStatusVariant, getStatusMessage, getProgress]);

  /**
   * Handles retry attempts for failed processing
   */
  const handleRetry = useCallback(async () => {
    if (error && retryProcessing) {
      await retryProcessing();
    }
  }, [error, retryProcessing]);

  /**
   * Effect for announcing status changes to screen readers
   */
  useEffect(() => {
    if (meeting?.metadata.processingStatus) {
      const announcement = getStatusMessage(meeting.metadata.processingStatus, error);
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('aria-live', 'polite');
      ariaLive.textContent = announcement;
      document.body.appendChild(ariaLive);
      
      setTimeout(() => {
        document.body.removeChild(ariaLive);
      }, 1000);
    }
  }, [meeting?.metadata.processingStatus, error, getStatusMessage]);

  return (
    <StatusContainer
      className={className}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="meeting-status"
      highContrast={highContrast}
    >
      <div className="status-header">
        <StatusIndicator
          status={variant}
          aria-hidden="true"
        />
        <StatusText>
          {message}
        </StatusText>
        {error && (
          <button
            onClick={handleRetry}
            className="retry-button"
            aria-label={t('status.retry', 'Retry processing')}
          >
            {t('status.retry', 'Retry')}
          </button>
        )}
      </div>
      <ProgressBar
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        progress={progress}
      />
    </StatusContainer>
  );
};

export default React.memo(Status);