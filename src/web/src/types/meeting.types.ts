/**
 * @fileoverview TypeScript type definitions for meeting-related data structures in web client
 * @version 1.0.0
 */

import type { ApiResponse } from './api.types';
import type { Meeting, MeetingStatus, ParticipantRole } from '../../../backend/shared/types/meeting.types';
import type { UUID } from 'crypto';

/**
 * Extended meeting interface for web client with UI-specific properties
 */
export interface WebMeeting extends Meeting {
  readonly id: UUID;
  readonly organizerId: string;
  readonly title: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly status: MeetingStatus;
  readonly participants: WebParticipant[];
  readonly metadata: WebMeetingMetadata;
  readonly uiState: MeetingUIState;
}

/**
 * Extended participant interface for web client with real-time status
 */
export interface WebParticipant {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: ParticipantRole;
  readonly joinTime: Date;
  readonly leaveTime: Date;
  readonly isActive: boolean;
  readonly isSpeaking: boolean;
}

/**
 * Extended metadata interface with processing status for UI updates
 */
export interface WebMeetingMetadata {
  readonly teamsId: string;
  readonly transcriptionEnabled: boolean;
  readonly recordingEnabled: boolean;
  readonly autoMinutesEnabled: boolean;
  readonly processingStatus: ProcessingStatus;
  readonly processingProgress: number;
}

/**
 * Interface for managing meeting UI state
 */
export interface MeetingUIState {
  readonly isControlsVisible: boolean;
  readonly isStatusOverlayVisible: boolean;
  readonly selectedTab: MeetingTabType;
  readonly errorMessage: string | null;
}

/**
 * Enum for tracking minutes generation processing status
 */
export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING_TRANSCRIPTION = 'PROCESSING_TRANSCRIPTION',
  GENERATING_MINUTES = 'GENERATING_MINUTES',
  DISTRIBUTING = 'DISTRIBUTING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

/**
 * Enum for meeting interface tab types
 */
export enum MeetingTabType {
  TRANSCRIPTION = 'TRANSCRIPTION',
  PARTICIPANTS = 'PARTICIPANTS',
  CONTROLS = 'CONTROLS'
}

/**
 * Type guard to check if a value is a valid ProcessingStatus
 */
export const isProcessingStatus = (value: unknown): value is ProcessingStatus => {
  return Object.values(ProcessingStatus).includes(value as ProcessingStatus);
};

/**
 * Type guard to check if a value is a valid MeetingTabType
 */
export const isMeetingTabType = (value: unknown): value is MeetingTabType => {
  return Object.values(MeetingTabType).includes(value as MeetingTabType);
};

/**
 * Type for web meeting API responses
 */
export type WebMeetingResponse = ApiResponse<WebMeeting>;

/**
 * Type for web meeting list API responses
 */
export type WebMeetingListResponse = ApiResponse<WebMeeting[]>;