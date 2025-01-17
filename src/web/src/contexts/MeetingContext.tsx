/**
 * @fileoverview React Context provider for managing meeting state and operations
 * @version 1.0.0
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'; // ^18.0.0
import { TeamsService } from '../services/teams.service';
import { WebSocketService } from '../services/websocket.service';
import type { WebMeeting } from '../types/meeting.types';
import { ProcessingStatus } from '../types/meeting.types';
import { ErrorCode, ErrorSeverity } from '../../backend/shared/constants/error-codes';
import { MEETING_STATUS, PROCESSING_STATES } from '../constants/meeting.constants';
import { WS_ENDPOINTS } from '../constants/api.constants';

// Constants for context configuration
const ERROR_RETRY_LIMIT = 3;
const WEBSOCKET_HEALTH_CHECK_INTERVAL = 30000;

// Interface for meeting error state
interface MeetingError {
  code: ErrorCode;
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
}

// Interface for meeting context state
interface MeetingContextState {
  meeting: WebMeeting | null;
  error: MeetingError | null;
  isInitialized: boolean;
  startMeeting: (meetingId: string) => Promise<void>;
  stopMeeting: (meetingId: string) => Promise<void>;
  updateMeetingState: (updates: Partial<WebMeeting>) => void;
  retryOperation: () => Promise<void>;
}

// Create context with type safety
const MeetingContext = createContext<MeetingContextState | undefined>(undefined);

// Default context state
const DEFAULT_MEETING_STATE: Partial<MeetingContextState> = {
  meeting: null,
  error: null,
  isInitialized: false
};

/**
 * Meeting context provider component with enhanced error handling and real-time updates
 */
export const MeetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize services
  const teamsService = useMemo(() => new TeamsService(), []);
  const wsService = useMemo(() => new WebSocketService(), []);

  // State management
  const [meeting, setMeeting] = useState<WebMeeting | null>(null);
  const [error, setError] = useState<MeetingError | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Initializes Teams SDK and WebSocket connection
   */
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await teamsService.initialize();
        await wsService.connect();
        setIsInitialized(true);
      } catch (error) {
        handleError('Service initialization failed', error);
      }
    };

    initializeServices();

    return () => {
      wsService.disconnect();
    };
  }, []);

  /**
   * Sets up WebSocket subscriptions for real-time updates
   */
  useEffect(() => {
    if (isInitialized && meeting) {
      wsService.subscribe(WS_ENDPOINTS.MEETING_UPDATES, handleMeetingUpdate);
      wsService.subscribe(WS_ENDPOINTS.TRANSCRIPTION_STREAM, handleTranscriptionUpdate);
      wsService.subscribe(WS_ENDPOINTS.MINUTES_PROGRESS, handleMinutesProgress);

      // Health check interval
      const healthCheck = setInterval(() => {
        wsService.checkHealth();
      }, WEBSOCKET_HEALTH_CHECK_INTERVAL);

      return () => {
        wsService.unsubscribe(WS_ENDPOINTS.MEETING_UPDATES, handleMeetingUpdate);
        wsService.unsubscribe(WS_ENDPOINTS.TRANSCRIPTION_STREAM, handleTranscriptionUpdate);
        wsService.unsubscribe(WS_ENDPOINTS.MINUTES_PROGRESS, handleMinutesProgress);
        clearInterval(healthCheck);
      };
    }
  }, [isInitialized, meeting?.id]);

  /**
   * Handles meeting state updates from WebSocket
   */
  const handleMeetingUpdate = useCallback((update: Partial<WebMeeting>) => {
    setMeeting(current => current ? { ...current, ...update } : null);
  }, []);

  /**
   * Handles transcription updates from WebSocket
   */
  const handleTranscriptionUpdate = useCallback((data: any) => {
    setMeeting(current => {
      if (!current) return null;
      return {
        ...current,
        metadata: {
          ...current.metadata,
          processingStatus: ProcessingStatus.PROCESSING_TRANSCRIPTION
        }
      };
    });
  }, []);

  /**
   * Handles minutes generation progress updates
   */
  const handleMinutesProgress = useCallback((progress: any) => {
    setMeeting(current => {
      if (!current) return null;
      return {
        ...current,
        metadata: {
          ...current.metadata,
          processingStatus: progress.status,
          processingProgress: progress.progress
        }
      };
    });
  }, []);

  /**
   * Starts meeting capture with enhanced error handling
   */
  const startMeeting = useCallback(async (meetingId: string) => {
    try {
      await teamsService.startMeetingCapture(meetingId);
      setMeeting(current => current ? {
        ...current,
        status: MEETING_STATUS.IN_PROGRESS,
        metadata: {
          ...current.metadata,
          processingStatus: ProcessingStatus.PROCESSING_TRANSCRIPTION
        }
      } : null);
    } catch (error) {
      handleError('Failed to start meeting', error);
    }
  }, []);

  /**
   * Stops meeting capture with cleanup
   */
  const stopMeeting = useCallback(async (meetingId: string) => {
    try {
      await teamsService.stopMeetingCapture(meetingId);
      setMeeting(current => current ? {
        ...current,
        status: MEETING_STATUS.ENDED,
        metadata: {
          ...current.metadata,
          processingStatus: ProcessingStatus.GENERATING_MINUTES
        }
      } : null);
    } catch (error) {
      handleError('Failed to stop meeting', error);
    }
  }, []);

  /**
   * Updates meeting state with validation
   */
  const updateMeetingState = useCallback((updates: Partial<WebMeeting>) => {
    setMeeting(current => current ? { ...current, ...updates } : null);
  }, []);

  /**
   * Enhanced error handling with retry logic
   */
  const handleError = useCallback((message: string, error: any) => {
    const errorState: MeetingError = {
      code: error.code || ErrorCode.INTERNAL_SERVER_ERROR,
      message: message,
      severity: error.severity || ErrorSeverity.ERROR,
      timestamp: new Date()
    };
    setError(errorState);

    if (retryCount < ERROR_RETRY_LIMIT) {
      setRetryCount(count => count + 1);
    }
  }, [retryCount]);

  /**
   * Retries failed operations with exponential backoff
   */
  const retryOperation = useCallback(async () => {
    if (error && retryCount < ERROR_RETRY_LIMIT) {
      try {
        if (meeting) {
          await teamsService.initialize();
          setError(null);
          setRetryCount(0);
        }
      } catch (retryError) {
        handleError('Retry operation failed', retryError);
      }
    }
  }, [error, retryCount, meeting]);

  // Memoized context value
  const contextValue = useMemo(() => ({
    meeting,
    error,
    isInitialized,
    startMeeting,
    stopMeeting,
    updateMeetingState,
    retryOperation
  }), [meeting, error, isInitialized, startMeeting, stopMeeting, updateMeetingState, retryOperation]);

  return (
    <MeetingContext.Provider value={contextValue}>
      {children}
    </MeetingContext.Provider>
  );
};

/**
 * Custom hook for accessing meeting context with type safety
 */
export const useMeetingContext = () => {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error('useMeetingContext must be used within a MeetingProvider');
  }
  return context;
};

export default MeetingContext;