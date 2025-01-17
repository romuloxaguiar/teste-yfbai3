/**
 * @fileoverview Type definitions for meeting-related data structures
 * @version 1.0.0
 */

import { ErrorCode } from '../constants/error-codes';
import type { UUID } from 'crypto';

/**
 * @readonly
 * Possible states of a meeting throughout its lifecycle
 */
export enum MeetingStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  PROCESSING = 'PROCESSING',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED'
}

/**
 * @readonly
 * Roles that participants can have in a meeting
 */
export enum ParticipantRole {
  ORGANIZER = 'ORGANIZER',
  PRESENTER = 'PRESENTER',
  ATTENDEE = 'ATTENDEE'
}

/**
 * Immutable interface for AI processing metadata
 */
export interface AIProcessingMetadata {
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  readonly errorCode?: ErrorCode.AI_PROCESSING_ERROR | ErrorCode.TEAMS_API_ERROR;
  readonly processingDuration?: number;
  readonly confidence?: number;
  readonly [key: string]: unknown;
}

/**
 * Immutable interface for meeting metadata including Teams-specific data
 */
export interface MeetingMetadata {
  readonly teamsId: string;
  readonly transcriptionEnabled: boolean;
  readonly recordingEnabled: boolean;
  readonly autoMinutesEnabled: boolean;
  readonly aiProcessingMetadata?: Readonly<AIProcessingMetadata>;
  readonly [key: string]: unknown;
}

/**
 * Immutable interface for meeting participant data
 */
export interface Participant {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: ParticipantRole;
  readonly joinTime: Date;
  readonly leaveTime?: Date;
}

/**
 * Immutable interface for the core meeting data structure
 * Includes comprehensive type safety and extensibility
 */
export interface Meeting {
  readonly id: UUID;
  readonly organizerId: string;
  readonly title: string;
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly status: MeetingStatus;
  readonly participants: ReadonlyArray<Participant>;
  readonly metadata: Readonly<MeetingMetadata>;
  readonly [key: string]: unknown;
}

/**
 * Type guard to check if a value is a valid MeetingStatus
 */
export const isMeetingStatus = (value: unknown): value is MeetingStatus => {
  return Object.values(MeetingStatus).includes(value as MeetingStatus);
};

/**
 * Type guard to check if a value is a valid ParticipantRole
 */
export const isParticipantRole = (value: unknown): value is ParticipantRole => {
  return Object.values(ParticipantRole).includes(value as ParticipantRole);
};

/**
 * Type for meeting update operations that maintains immutability
 */
export type MeetingUpdate = Partial<Omit<Meeting, 'id' | 'organizerId'>>;

/**
 * Type for participant update operations that maintains immutability
 */
export type ParticipantUpdate = Partial<Omit<Participant, 'id' | 'email'>>;