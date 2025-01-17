/**
 * @fileoverview Microsoft Teams integration configuration and initialization
 * @version 1.0.0
 * Implements Teams integration requirements from Technical Specifications Section 1.2
 */

import { TeamsClientSDK } from '@microsoft/teams-js'; // v2.0.0
import { MEETING_STATUS } from '../constants/meeting.constants';
import { ProcessingStatus } from '../types/meeting.types';

/**
 * Teams application configuration interface
 */
interface TeamsConfig {
  microsoftTeams: typeof TeamsClientSDK;
  appName: string;
  capabilities: string[];
  version: string;
  authentication: {
    retryAttempts: number;
    retryDelay: number;
    tokenRefreshBuffer: number;
  };
  meeting: {
    transcriptionSettings: {
      autoStart: boolean;
      languageCode: string;
      profanityFilter: boolean;
    };
    statusUpdateInterval: number;
    participantTrackingEnabled: boolean;
  };
}

/**
 * Teams initialization result interface
 */
interface TeamsInitializationResult {
  success: boolean;
  error?: Error;
  context?: any;
}

/**
 * Teams application ID from environment variables
 */
export const TEAMS_APP_ID = process.env.VITE_TEAMS_APP_ID;

/**
 * Required OAuth scopes for Teams integration
 */
export const TEAMS_CONFIG_SCOPE = [
  'User.Read',
  'OnlineMeetings.ReadWrite',
  'Meetings.ReadWrite'
] as const;

/**
 * Default Teams configuration with enterprise-grade settings
 */
export const DEFAULT_TEAMS_CONFIG: TeamsConfig = {
  microsoftTeams: TeamsClientSDK,
  appName: 'Automated Meeting Minutes',
  capabilities: [
    'transcription',
    'meeting.notes',
    'meeting.transcriptLanguage'
  ],
  version: '2.0.0',
  authentication: {
    retryAttempts: 3,
    retryDelay: 1000,
    tokenRefreshBuffer: 300
  },
  meeting: {
    transcriptionSettings: {
      autoStart: true,
      languageCode: 'en-US',
      profanityFilter: true
    },
    statusUpdateInterval: 5000,
    participantTrackingEnabled: true
  }
};

/**
 * Initializes Microsoft Teams client SDK with enhanced error handling
 * @param config Teams configuration object
 * @returns Promise resolving to initialization result
 */
export async function initializeTeamsSDK(
  config: TeamsConfig = DEFAULT_TEAMS_CONFIG
): Promise<TeamsInitializationResult> {
  try {
    if (!TEAMS_APP_ID) {
      throw new Error('Teams App ID not configured');
    }

    await config.microsoftTeams.initialize();
    await config.microsoftTeams.appInitialization.notifySuccess();

    const context = await config.microsoftTeams.getContext();
    await config.microsoftTeams.authentication.initialize();

    return {
      success: true,
      context
    };
  } catch (error) {
    console.error('Teams SDK initialization failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown initialization error')
    };
  }
}

/**
 * Retrieves and validates current Teams context with caching
 * @returns Promise resolving to Teams context
 */
export async function getTeamsContext(): Promise<any> {
  try {
    const context = await TeamsClientSDK.getContext();
    if (!context || !context.meeting) {
      throw new Error('Invalid Teams context');
    }
    return context;
  } catch (error) {
    console.error('Failed to get Teams context:', error);
    throw error;
  }
}

/**
 * Interface for Teams event handlers
 */
interface TeamsEventHandlers {
  onTranscriptionUpdate?: (data: any) => void;
  onMeetingStateChange?: (status: MEETING_STATUS) => void;
  onProcessingStatusChange?: (status: ProcessingStatus) => void;
  onError?: (error: Error) => void;
}

/**
 * Registers enhanced event handlers for Teams meeting events
 * @param handlers Event handler functions
 */
export async function registerTeamsHandlers(handlers: TeamsEventHandlers): Promise<void> {
  try {
    // Register transcription events handler
    if (handlers.onTranscriptionUpdate) {
      TeamsClientSDK.meeting.onTranscriptUpdated((data) => {
        try {
          handlers.onTranscriptionUpdate?.(data);
        } catch (error) {
          handlers.onError?.(error instanceof Error ? error : new Error('Transcription update error'));
        }
      });
    }

    // Register meeting state changes handler
    if (handlers.onMeetingStateChange) {
      TeamsClientSDK.meeting.onMeetingStateChanged((state) => {
        try {
          const status = state.isInMeeting ? MEETING_STATUS.IN_PROGRESS : MEETING_STATUS.NOT_STARTED;
          handlers.onMeetingStateChange?.(status);
        } catch (error) {
          handlers.onError?.(error instanceof Error ? error : new Error('Meeting state change error'));
        }
      });
    }

    // Register processing status handler
    if (handlers.onProcessingStatusChange) {
      TeamsClientSDK.meeting.onAppContentStageSizeChanged(() => {
        try {
          handlers.onProcessingStatusChange?.(ProcessingStatus.PROCESSING_TRANSCRIPTION);
        } catch (error) {
          handlers.onError?.(error instanceof Error ? error : new Error('Processing status change error'));
        }
      });
    }
  } catch (error) {
    console.error('Failed to register Teams handlers:', error);
    throw error;
  }
}

/**
 * Export configuration object with enhanced settings
 */
export const teamsConfig = {
  appId: TEAMS_APP_ID,
  scopes: TEAMS_CONFIG_SCOPE,
  defaultConfig: DEFAULT_TEAMS_CONFIG
};