/**
 * @fileoverview TypeScript type definitions for meeting minutes data structures in web client
 * @version 1.0.0
 */

import type { UUID } from 'crypto'; // v20.0.0
import type { ApiResponse } from './api.types';
import type { WebMeeting } from './meeting.types';
import type { Minutes, MinutesStatus, ActionItemStatus } from '../../../backend/shared/types/minutes.types';

/**
 * Extended minutes interface for web client with UI-specific properties
 */
export interface WebMinutes extends Minutes {
  readonly id: UUID;
  readonly meetingId: UUID;
  readonly summary: string;
  readonly topics: ReadonlyArray<WebTopic>;
  readonly actionItems: ReadonlyArray<WebActionItem>;
  readonly decisions: ReadonlyArray<WebDecision>;
  readonly status: MinutesStatus;
  readonly generatedAt: Date;
  readonly uiState: MinutesUIState;
}

/**
 * Extended topic interface with UI state for expandable/collapsible view
 */
export interface WebTopic {
  readonly id: UUID;
  readonly title: string;
  readonly content: string;
  readonly confidence: number;
  readonly subtopics: ReadonlyArray<WebTopic>;
  readonly isExpanded: boolean;
  readonly isHighlighted: boolean;
}

/**
 * Extended action item interface with UI state for editing and selection
 */
export interface WebActionItem {
  readonly id: UUID;
  readonly description: string;
  readonly assigneeId: string;
  readonly dueDate: Date | null;
  readonly status: ActionItemStatus;
  readonly confidence: number;
  readonly isEditing: boolean;
  readonly isSelected: boolean;
}

/**
 * Extended decision interface with UI state for highlighting
 */
export interface WebDecision {
  readonly id: UUID;
  readonly description: string;
  readonly madeBy: string;
  readonly timestamp: Date;
  readonly confidence: number;
  readonly isHighlighted: boolean;
}

/**
 * Interface for managing minutes UI state
 */
export interface MinutesUIState {
  readonly selectedTab: MinutesTabType;
  readonly isExportModalOpen: boolean;
  readonly isShareModalOpen: boolean;
  readonly errorMessage: string | null;
}

/**
 * Enum for minutes interface tab types
 */
export enum MinutesTabType {
  SUMMARY = 'SUMMARY',
  TOPICS = 'TOPICS',
  ACTION_ITEMS = 'ACTION_ITEMS',
  DECISIONS = 'DECISIONS'
}

/**
 * Type guard to check if a value is a valid MinutesTabType
 */
export const isMinutesTabType = (value: unknown): value is MinutesTabType => {
  return Object.values(MinutesTabType).includes(value as MinutesTabType);
};

/**
 * Type for web minutes API responses
 */
export type WebMinutesResponse = ApiResponse<WebMinutes>;

/**
 * Type for web minutes list API responses
 */
export type WebMinutesListResponse = ApiResponse<WebMinutes[]>;

/**
 * Type for minutes UI state update operations
 */
export type MinutesUIStateUpdate = Partial<MinutesUIState>;

/**
 * Type for web topic update operations
 */
export type WebTopicUpdate = Partial<Omit<WebTopic, 'id'>>;

/**
 * Type for web action item update operations
 */
export type WebActionItemUpdate = Partial<Omit<WebActionItem, 'id'>>;

/**
 * Type for web decision update operations
 */
export type WebDecisionUpdate = Partial<Omit<WebDecision, 'id' | 'timestamp'>>;