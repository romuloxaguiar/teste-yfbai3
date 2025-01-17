/**
 * @fileoverview Type definitions for transcription-related data structures
 * @version 1.0.0
 */

import type { UUID } from 'crypto'; // v20.0.0
import { ErrorCode } from '../constants/error-codes';
import type { Meeting } from './meeting.types';

/**
 * @readonly
 * Enumeration of possible transcription processing states
 */
export enum TranscriptionStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Interface for speaker identification and timing data
 * Includes confidence scoring and precise timing information
 */
export interface SpeakerData {
  readonly speakerId: string;
  readonly participantId: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly confidence: number;
}

/**
 * Interface for transcription processing metadata
 * Tracks performance metrics and quality indicators
 */
export interface TranscriptionMetadata {
  readonly language: string;
  readonly noiseLevel: number; // 0-100 scale
  readonly processingDuration: number; // milliseconds
  readonly wordCount: number;
  readonly errorCode?: ErrorCode.AI_PROCESSING_ERROR;
  readonly retentionPeriod?: number; // days
  readonly qualityScore?: number; // 0-100 scale
  readonly [key: string]: unknown; // Allow extension
}

/**
 * Core interface for transcription data structure
 * Provides comprehensive support for real-time processing and data retention
 */
export interface Transcription {
  readonly id: UUID;
  readonly meetingId: UUID;
  readonly content: string;
  readonly timestamp: Date;
  readonly speakerData: ReadonlyArray<SpeakerData>;
  readonly status: TranscriptionStatus;
  readonly metadata: Readonly<TranscriptionMetadata>;
  readonly chunks?: ReadonlyArray<TranscriptionChunk>;
  readonly [key: string]: unknown; // Allow extension
}

/**
 * Interface for real-time transcription chunks
 * Supports incremental processing with sequence tracking
 */
export interface TranscriptionChunk {
  readonly id: UUID;
  readonly transcriptionId: UUID;
  readonly content: string;
  readonly sequence: number;
  readonly speakerData: Readonly<SpeakerData>;
  readonly timestamp: Date;
  readonly isProcessed: boolean;
  readonly noiseReduction?: {
    readonly originalContent: string;
    readonly noiseLevel: number;
    readonly processingMethod: string;
  };
}

/**
 * Type guard to check if a value is a valid TranscriptionStatus
 */
export const isTranscriptionStatus = (value: unknown): value is TranscriptionStatus => {
  return Object.values(TranscriptionStatus).includes(value as TranscriptionStatus);
};

/**
 * Type for transcription update operations that maintains immutability
 */
export type TranscriptionUpdate = Partial<Omit<Transcription, 'id' | 'meetingId'>>;

/**
 * Type for transcription chunk update operations
 */
export type TranscriptionChunkUpdate = Partial<Omit<TranscriptionChunk, 'id' | 'transcriptionId' | 'sequence'>>;

/**
 * Interface for transcription processing options
 */
export interface TranscriptionProcessingOptions {
  readonly noiseReduction: boolean;
  readonly speakerIdentification: boolean;
  readonly confidenceThreshold: number;
  readonly retentionPeriod: number;
  readonly language: string;
  readonly [key: string]: unknown;
}

/**
 * Type for validated transcription data ready for processing
 */
export type ValidatedTranscription = Readonly<{
  content: string;
  meetingId: UUID;
  timestamp: Date;
  options: Readonly<TranscriptionProcessingOptions>;
}>;

/**
 * Type guard to validate transcription metadata
 */
export const isValidTranscriptionMetadata = (value: unknown): value is TranscriptionMetadata => {
  if (typeof value !== 'object' || value === null) return false;
  
  const metadata = value as TranscriptionMetadata;
  return (
    typeof metadata.language === 'string' &&
    typeof metadata.noiseLevel === 'number' &&
    typeof metadata.processingDuration === 'number' &&
    typeof metadata.wordCount === 'number' &&
    metadata.noiseLevel >= 0 &&
    metadata.noiseLevel <= 100
  );
};