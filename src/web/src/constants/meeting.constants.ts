/**
 * @fileoverview Constants for meeting management, processing states, and validation rules
 * @version 1.0.0
 */

import { ProcessingStatus, MeetingTabType } from '../types/meeting.types';

/**
 * Meeting lifecycle status constants
 */
export enum MEETING_STATUS {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED'
}

/**
 * Processing state constants for minutes generation pipeline
 * Maps to stages defined in Technical Specifications Section 9.1
 */
export const PROCESSING_STATES = {
  INITIAL: ProcessingStatus.IDLE,
  TRANSCRIBING: ProcessingStatus.PROCESSING_TRANSCRIPTION,
  ANALYZING: ProcessingStatus.GENERATING_MINUTES,
  TOPIC_DETECTION: ProcessingStatus.GENERATING_MINUTES,
  ACTION_ITEM_EXTRACTION: ProcessingStatus.GENERATING_MINUTES,
  SUMMARY_GENERATION: ProcessingStatus.GENERATING_MINUTES,
  DOCUMENT_FORMATTING: ProcessingStatus.GENERATING_MINUTES,
  COMPLETED: ProcessingStatus.COMPLETED,
  ERROR: ProcessingStatus.ERROR
} as const;

/**
 * Meeting interface tab configuration constants
 * Based on UI specifications in Section 6.1
 */
export const MEETING_TABS = {
  DEFAULT: MeetingTabType.TRANSCRIPTION,
  AVAILABLE_TABS: [
    MeetingTabType.TRANSCRIPTION,
    MeetingTabType.PARTICIPANTS,
    MeetingTabType.CONTROLS
  ]
} as const;

/**
 * Meeting validation rule constants
 * Derived from Technical Specifications Section 3.1.1
 */
export const MEETING_VALIDATION = {
  MIN_DURATION_MS: 300000, // 5 minutes
  MAX_DURATION_MS: 14400000, // 4 hours
  MIN_PARTICIPANTS: 2,
  MAX_PARTICIPANTS: 250,
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 100,
  MAX_RETRY_ATTEMPTS: 3
} as const;

/**
 * Global timeout and interval constants for meeting processing
 */
export const PROCESSING_TIMEOUT_MS = 300000; // 5 minutes
export const MIN_MEETING_DURATION_MS = 300000; // 5 minutes
export const MAX_MEETING_DURATION_MS = 14400000; // 4 hours
export const MIN_REQUIRED_PARTICIPANTS = 2;
export const MAX_ALLOWED_PARTICIPANTS = 250;
export const PROCESSING_PROGRESS_INTERVAL_MS = 5000; // 5 seconds
export const RETRY_INTERVAL_MS = 10000; // 10 seconds
export const MAX_RETRY_COUNT = 3;
export const MIN_TITLE_LENGTH = 3;
export const MAX_TITLE_LENGTH = 100;