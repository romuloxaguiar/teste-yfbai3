import React, { useEffect, useState, useCallback, memo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useParams } from 'react-router-dom';
import { useTheme } from '@fluentui/react';
import { 
  MeetingContainer, 
  MeetingContent, 
  MeetingHeader, 
  MeetingFooter 
} from './Meeting.styles';
import { useMeeting } from '../../hooks/useMeeting';
import { useWebSocket } from '../../hooks/useWebSocket';
import { MeetingControls } from '../../components/MeetingControls';
import { TranscriptionDisplay } from '../../components/TranscriptionDisplay';
import { StatusIndicator } from '../../components/StatusIndicator';
import { ErrorFallback } from '../../components/ErrorFallback';
import { useHighContrast } from '../../hooks/useHighContrast';
import { logError } from '../../utils/logger';
import { WEBSOCKET_HEALTH_CHECK_INTERVAL } from '../../constants';

interface MeetingPageParams {
  meetingId: string;
}

interface WebSocketStatus {
  isConnected: boolean;
  lastPing: number;
}

const Meeting: React.FC = memo(() => {
  const { meetingId } = useParams<MeetingPageParams>();
  const theme = useTheme();
  const { isHighContrast } = useHighContrast();
  
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>({
    isConnected: false,
    lastPing: Date.now()
  });

  const { 
    meeting, 
    isLoading, 
    error, 
    startTranscription, 
    stopTranscription 
  } = useMeeting(meetingId);

  const handleWebSocketError = useCallback((error: Error) => {
    logError('WebSocket connection error:', error);
    setWsStatus(prev => ({ ...prev, isConnected: false }));
  }, []);

  const handleReconnect = useCallback(() => {
    setWsStatus(prev => ({ ...prev, isConnected: true, lastPing: Date.now() }));
  }, []);

  const { sendMessage } = useWebSocket({
    url: `${process.env.REACT_APP_WS_URL}/meetings/${meetingId}`,
    onError: handleWebSocketError,
    onReconnect: handleReconnect
  });

  // Monitor WebSocket health
  useEffect(() => {
    const healthCheck = setInterval(() => {
      const now = Date.now();
      if (wsStatus.isConnected && now - wsStatus.lastPing > WEBSOCKET_HEALTH_CHECK_INTERVAL) {
        setWsStatus(prev => ({ ...prev, isConnected: false }));
      }
    }, WEBSOCKET_HEALTH_CHECK_INTERVAL);

    return () => clearInterval(healthCheck);
  }, [wsStatus.isConnected, wsStatus.lastPing]);

  // Set up ARIA live region for status updates
  useEffect(() => {
    const statusRegion = document.createElement('div');
    statusRegion.setAttribute('role', 'status');
    statusRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(statusRegion);

    return () => {
      document.body.removeChild(statusRegion);
    };
  }, []);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  if (isLoading) {
    return (
      <MeetingContainer>
        <StatusIndicator 
          status="loading" 
          aria-label="Loading meeting data"
        />
      </MeetingContainer>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={handleRetry}
      onError={(error) => logError('Meeting component error:', error)}
    >
      <MeetingContainer
        role="main"
        aria-live="polite"
        theme={isHighContrast ? theme.highContrast : theme}
      >
        <MeetingHeader>
          <h1 className="visually-hidden">Meeting: {meeting?.title}</h1>
          <StatusIndicator
            status={wsStatus.isConnected ? 'connected' : 'disconnected'}
            aria-label={`Connection status: ${wsStatus.isConnected ? 'connected' : 'disconnected'}`}
          />
          <MeetingControls
            isTranscribing={meeting?.isTranscribing}
            onStartTranscription={startTranscription}
            onStopTranscription={stopTranscription}
            disabled={!wsStatus.isConnected}
            aria-controls="transcription-content"
          />
        </MeetingHeader>

        <MeetingContent
          id="transcription-content"
          role="region"
          aria-label="Meeting transcription"
        >
          <TranscriptionDisplay
            transcription={meeting?.transcription}
            speakers={meeting?.participants}
            isLive={meeting?.isTranscribing}
            highContrast={isHighContrast}
          />
        </MeetingContent>

        <MeetingFooter>
          <div role="status" aria-live="polite">
            {error && (
              <span className="error-message" role="alert">
                Error: {error.message}
              </span>
            )}
          </div>
          <div aria-label="Meeting participants">
            {meeting?.participants.length} participants
          </div>
        </MeetingFooter>
      </MeetingContainer>
    </ErrorBoundary>
  );
});

Meeting.displayName = 'Meeting';

export default Meeting;