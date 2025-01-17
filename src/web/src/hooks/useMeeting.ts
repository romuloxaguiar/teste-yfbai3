/**
 * @fileoverview Custom React hook for managing meeting state and operations
 * @version 1.0.0
 */

import { useState, useCallback, useEffect } from 'react'; // ^18.2.0
import { WebMeeting, ProcessingStatus } from '../types/meeting.types';
import { TeamsService } from '../services/teams.service';
import { ApiService } from '../services/api.service';
import { useMeetingContext } from '../contexts/MeetingContext';
import { ErrorCode, ErrorSeverity } from '../../backend/shared/constants/error-codes';

// Constants for hook configuration
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000;
const CONNECTION_CHECK_INTERVAL = 30000;

/**
 * Enhanced error interface for meeting operations
 */
interface MeetingError {
  code: ErrorCode;
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  details?: Record<string, unknown>;
}

/**
 * WebSocket connection status enum
 */
enum WebSocketStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/**
 * Interface for hook return value with enhanced error handling
 */
interface UseMeetingResult {
  meeting: WebMeeting | null;
  isLoading: boolean;
  error: MeetingError | null;
  connectionStatus: WebSocketStatus;
  startMeeting: () => Promise<void>;
  endMeeting: () => Promise<void>;
  toggleTranscription: () => Promise<void>;
  retryConnection: () => Promise<void>;
  clearError: () => void;
}

/**
 * Enhanced custom hook for managing meeting state and operations
 * @param meetingId - Meeting identifier
 * @returns Meeting state and operations with comprehensive error handling
 */
export const useMeeting = (meetingId: string): UseMeetingResult => {
  // Initialize context and services
  const meetingContext = useMeetingContext();
  const teamsService = new TeamsService(ApiService, window.appInsights);

  // State management with strict typing
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<MeetingError | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<WebSocketStatus>(
    WebSocketStatus.DISCONNECTED
  );

  /**
   * Enhanced error handling with retry mechanism
   */
  const handleError = useCallback((message: string, error: any) => {
    const errorState: MeetingError = {
      code: error.code || ErrorCode.INTERNAL_SERVER_ERROR,
      message: message,
      severity: error.severity || ErrorSeverity.ERROR,
      timestamp: new Date(),
      details: error.details
    };

    setError(errorState);
    setIsLoading(false);

    if (retryCount < RETRY_ATTEMPTS) {
      setRetryCount(prev => prev + 1);
      setTimeout(() => {
        retryConnection();
      }, RETRY_DELAY * Math.pow(2, retryCount));
    }
  }, [retryCount]);

  /**
   * Starts meeting capture with enhanced error handling
   */
  const startMeeting = useCallback(async () => {
    try {
      setIsLoading(true);
      await teamsService.startMeetingCapture(meetingId);
      setError(null);
      setConnectionStatus(WebSocketStatus.CONNECTED);
    } catch (error) {
      handleError('Failed to start meeting', error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, handleError]);

  /**
   * Ends meeting with cleanup and error handling
   */
  const endMeeting = useCallback(async () => {
    try {
      setIsLoading(true);
      await teamsService.stopMeetingCapture(meetingId);
      setError(null);
    } catch (error) {
      handleError('Failed to end meeting', error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, handleError]);

  /**
   * Toggles transcription with connection health check
   */
  const toggleTranscription = useCallback(async () => {
    try {
      setIsLoading(true);
      if (meetingContext.meeting?.metadata.transcriptionEnabled) {
        await teamsService.stopMeetingCapture(meetingId);
      } else {
        await teamsService.startMeetingCapture(meetingId);
      }
      setError(null);
    } catch (error) {
      handleError('Failed to toggle transcription', error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, meetingContext.meeting, handleError]);

  /**
   * Retries connection with exponential backoff
   */
  const retryConnection = useCallback(async () => {
    try {
      setConnectionStatus(WebSocketStatus.RECONNECTING);
      await teamsService.initialize();
      setConnectionStatus(WebSocketStatus.CONNECTED);
      setError(null);
      setRetryCount(0);
    } catch (error) {
      setConnectionStatus(WebSocketStatus.ERROR);
      handleError('Connection retry failed', error);
    }
  }, [handleError]);

  /**
   * Clears current error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  /**
   * Effect for fetching initial meeting data
   */
  useEffect(() => {
    const initializeMeeting = async () => {
      try {
        setIsLoading(true);
        await teamsService.initialize();
        setConnectionStatus(WebSocketStatus.CONNECTED);
        setError(null);
      } catch (error) {
        handleError('Failed to initialize meeting', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMeeting();
  }, [meetingId]);

  /**
   * Effect for monitoring connection health
   */
  useEffect(() => {
    const healthCheck = setInterval(() => {
      if (connectionStatus === WebSocketStatus.CONNECTED) {
        // Implement connection health check
      }
    }, CONNECTION_CHECK_INTERVAL);

    return () => {
      clearInterval(healthCheck);
    };
  }, [connectionStatus]);

  return {
    meeting: meetingContext.meeting,
    isLoading,
    error,
    connectionStatus,
    startMeeting,
    endMeeting,
    toggleTranscription,
    retryConnection,
    clearError
  };
};

export default useMeeting;