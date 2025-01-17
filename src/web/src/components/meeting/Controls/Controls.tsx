import React, { useState, useCallback, useEffect } from 'react';
import { ErrorBoundary } from '@microsoft/error-boundary'; // ^1.0.0
import { ApplicationInsights } from '@microsoft/applicationinsights-web'; // ^2.8.0

import { 
  ControlsContainer, 
  ControlButton, 
  ControlGroup, 
  ControlLabel, 
  StatusIndicator 
} from './Controls.styles';
import { Button } from '../../common/Button/Button';
import { useMeeting } from '../../../hooks/useMeeting';
import { ProcessingStatus } from '../../../types/meeting.types';
import { ErrorCode, ErrorSeverity } from '../../../../backend/shared/constants/error-codes';
import { MeetingIcons } from '../../../assets/icons';

// Initialize Application Insights
const appInsights = new ApplicationInsights({
  config: {
    instrumentationKey: process.env.VITE_APPINSIGHTS_KEY,
    enableAutoRouteTracking: true
  }
});
appInsights.loadAppInsights();

interface ControlsProps {
  meetingId: string;
  className?: string;
  onError?: (error: Error) => void;
}

const Controls: React.FC<ControlsProps> = React.memo(({ 
  meetingId, 
  className,
  onError 
}) => {
  // State management
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  // Custom hook for meeting operations
  const { 
    meeting,
    error: meetingError,
    connectionStatus,
    startMeeting,
    endMeeting,
    toggleTranscription,
    retryConnection,
    clearError
  } = useMeeting(meetingId);

  // Track component mount for analytics
  useEffect(() => {
    appInsights.trackEvent({ name: 'ControlsComponentMounted' });
    return () => {
      appInsights.trackEvent({ name: 'ControlsComponentUnmounted' });
    };
  }, []);

  // Handle transcription toggle with error tracking
  const handleTranscriptionToggle = useCallback(async () => {
    try {
      setIsLoading(true);
      appInsights.trackEvent({ 
        name: 'TranscriptionToggleAttempt',
        properties: { meetingId }
      });

      await toggleTranscription();

      appInsights.trackEvent({ 
        name: 'TranscriptionToggleSuccess',
        properties: { meetingId }
      });
    } catch (error) {
      const errorDetails = {
        code: ErrorCode.TRANSCRIPTION_ERROR,
        message: 'Failed to toggle transcription',
        severity: ErrorSeverity.ERROR
      };
      onError?.(new Error(errorDetails.message));
      appInsights.trackException({ exception: error });
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, toggleTranscription, onError]);

  // Handle meeting end with confirmation
  const handleMeetingEnd = useCallback(async () => {
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    try {
      setIsLoading(true);
      appInsights.trackEvent({ 
        name: 'MeetingEndAttempt',
        properties: { meetingId }
      });

      await endMeeting();
      setShowConfirmation(false);

      appInsights.trackEvent({ 
        name: 'MeetingEndSuccess',
        properties: { meetingId }
      });
    } catch (error) {
      const errorDetails = {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to end meeting',
        severity: ErrorSeverity.ERROR
      };
      onError?.(new Error(errorDetails.message));
      appInsights.trackException({ exception: error });
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, endMeeting, showConfirmation, onError]);

  // Render error state
  if (meetingError) {
    return (
      <ControlsContainer className={className}>
        <ControlGroup>
          <Button
            variant="secondary"
            icon="refresh"
            onClick={retryConnection}
            disabled={isLoading}
            ariaLabel="Retry connection"
          >
            Retry Connection
          </Button>
        </ControlGroup>
      </ControlsContainer>
    );
  }

  return (
    <ErrorBoundary
      fallback={<div>Controls temporarily unavailable</div>}
      onError={(error) => {
        appInsights.trackException({ exception: error });
        onError?.(error);
      }}
    >
      <ControlsContainer className={className}>
        <ControlGroup>
          <ControlButton
            onClick={handleTranscriptionToggle}
            disabled={isLoading || !meeting}
            isActive={meeting?.metadata.transcriptionEnabled}
            aria-label="Toggle transcription"
            data-testid="transcription-toggle"
          >
            <MeetingIcons.transcription 
              size="md"
              ariaLabel="Transcription"
            />
            <ControlLabel>
              {meeting?.metadata.transcriptionEnabled ? 'Stop' : 'Start'} Transcription
            </ControlLabel>
          </ControlButton>

          <ControlButton
            onClick={handleMeetingEnd}
            disabled={isLoading || !meeting}
            aria-label="End meeting"
            data-testid="end-meeting"
          >
            <MeetingIcons.end 
              size="md"
              ariaLabel="End meeting"
            />
            <ControlLabel>
              {showConfirmation ? 'Confirm End' : 'End Meeting'}
            </ControlLabel>
          </ControlButton>
        </ControlGroup>

        {meeting?.metadata.processingStatus === ProcessingStatus.PROCESSING_TRANSCRIPTION && (
          <StatusIndicator>
            Processing Transcription...
          </StatusIndicator>
        )}

        {meeting?.metadata.processingStatus === ProcessingStatus.GENERATING_MINUTES && (
          <StatusIndicator>
            Generating Minutes...
          </StatusIndicator>
        )}
      </ControlsContainer>
    </ErrorBoundary>
  );
});

Controls.displayName = 'Controls';

export default Controls;