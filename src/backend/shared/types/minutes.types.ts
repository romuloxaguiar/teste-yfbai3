/**
 * @fileoverview Type definitions for meeting minutes data structures
 * @version 1.0.0
 */

import type { UUID } from 'crypto'; // v20.0.0
import type { Meeting } from './meeting.types';
import type { Transcription } from './transcription.types';

/**
 * @readonly
 * Enumeration of possible minutes generation states
 */
export enum MinutesStatus {
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  DISTRIBUTED = 'DISTRIBUTED',
  FAILED = 'FAILED'
}

/**
 * @readonly
 * Enumeration of action item completion states
 */
export enum ActionItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

/**
 * @readonly
 * Enumeration of priority levels for action items
 */
export enum Priority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * @readonly
 * Enumeration of impact levels for decisions
 */
export enum Impact {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Interface for AI processing metadata and performance tracking
 */
export interface ProcessingMetadata {
  readonly processingStartTime: Date;
  readonly processingEndTime: Date;
  readonly processingDuration: number; // milliseconds
  readonly modelVersion: string;
  readonly overallConfidence: number; // 0-1 scale
}

/**
 * Interface for hierarchical topic structure with timing and confidence
 */
export interface Topic {
  readonly id: UUID;
  readonly title: string;
  readonly content: string;
  readonly confidence: number; // 0-1 scale
  readonly subtopics: ReadonlyArray<Topic>;
  readonly startTime: Date;
  readonly endTime: Date;
}

/**
 * Interface for action items with assignment and tracking
 */
export interface ActionItem {
  readonly id: UUID;
  readonly description: string;
  readonly assigneeId: string;
  readonly dueDate: Date | null;
  readonly status: ActionItemStatus;
  readonly confidence: number; // 0-1 scale
  readonly priority: Priority;
}

/**
 * Interface for decisions made during meeting
 */
export interface Decision {
  readonly id: UUID;
  readonly description: string;
  readonly madeBy: string;
  readonly timestamp: Date;
  readonly confidence: number; // 0-1 scale
  readonly impact: Impact;
}

/**
 * Core interface for meeting minutes data structure
 * Provides comprehensive support for AI-processed content with metadata
 */
export interface Minutes {
  readonly id: UUID;
  readonly meetingId: UUID;
  readonly summary: string;
  readonly topics: ReadonlyArray<Topic>;
  readonly actionItems: ReadonlyArray<ActionItem>;
  readonly decisions: ReadonlyArray<Decision>;
  readonly status: MinutesStatus;
  readonly generatedAt: Date;
  readonly processingMetadata: ProcessingMetadata;
  readonly [key: string]: unknown; // Allow extension
}

/**
 * Type guard to check if a value is a valid MinutesStatus
 */
export const isMinutesStatus = (value: unknown): value is MinutesStatus => {
  return Object.values(MinutesStatus).includes(value as MinutesStatus);
};

/**
 * Type guard to check if a value is a valid ActionItemStatus
 */
export const isActionItemStatus = (value: unknown): value is ActionItemStatus => {
  return Object.values(ActionItemStatus).includes(value as ActionItemStatus);
};

/**
 * Type guard to check if a value is a valid Priority
 */
export const isPriority = (value: unknown): value is Priority => {
  return Object.values(Priority).includes(value as Priority);
};

/**
 * Type guard to check if a value is a valid Impact
 */
export const isImpact = (value: unknown): value is Impact => {
  return Object.values(Impact).includes(value as Impact);
};

/**
 * Type for minutes update operations that maintains immutability
 */
export type MinutesUpdate = Partial<Omit<Minutes, 'id' | 'meetingId' | 'generatedAt'>>;

/**
 * Type for action item update operations
 */
export type ActionItemUpdate = Partial<Omit<ActionItem, 'id'>>;

/**
 * Type for decision update operations
 */
export type DecisionUpdate = Partial<Omit<Decision, 'id' | 'timestamp'>>;

/**
 * Type for topic update operations
 */
export type TopicUpdate = Partial<Omit<Topic, 'id'>>;