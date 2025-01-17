/**
 * @fileoverview Utility functions for data validation across backend microservices
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.0
import { isUUID } from 'validator'; // v13.11.0

import type { Meeting } from '../types/meeting.types';
import type { Minutes } from '../types/minutes.types';
import type { Transcription } from '../types/transcription.types';
import { ErrorCode } from '../constants/error-codes';

/**
 * Custom error class for validation failures with detailed error reporting
 */
export class ValidationError extends Error {
  public readonly code: ErrorCode;
  public readonly details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationError';
    this.code = ErrorCode.VALIDATION_ERROR;
    this.details = details;
    Error.captureStackTrace(this, ValidationError);
  }
}

// Schema definitions using Zod for robust validation
const MEETING_SCHEMA = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  startTime: z.date(),
  endTime: z.date().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'PROCESSING', 'ENDED', 'CANCELLED']),
  participants: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['ORGANIZER', 'PRESENTER', 'ATTENDEE']),
    joinTime: z.date(),
    leaveTime: z.date().optional()
  })).min(1).max(1000),
  metadata: z.object({
    teamsId: z.string(),
    transcriptionEnabled: z.boolean(),
    recordingEnabled: z.boolean(),
    autoMinutesEnabled: z.boolean(),
    aiProcessingMetadata: z.object({
      startTime: z.date(),
      endTime: z.date().optional(),
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']),
      processingDuration: z.number().optional(),
      confidence: z.number().min(0).max(1).optional()
    }).optional()
  })
});

const MINUTES_SCHEMA = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  summary: z.string().min(1),
  topics: z.array(z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    content: z.string(),
    confidence: z.number().min(0).max(1),
    startTime: z.date(),
    endTime: z.date(),
    subtopics: z.array(z.lazy(() => z.object({
      id: z.string().uuid(),
      title: z.string().min(1),
      content: z.string(),
      confidence: z.number().min(0).max(1),
      startTime: z.date(),
      endTime: z.date()
    })))
  })),
  actionItems: z.array(z.object({
    id: z.string().uuid(),
    description: z.string().min(1),
    assigneeId: z.string().uuid(),
    dueDate: z.date().nullable(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
    confidence: z.number().min(0).max(1),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW'])
  })),
  decisions: z.array(z.object({
    id: z.string().uuid(),
    description: z.string().min(1),
    madeBy: z.string().uuid(),
    timestamp: z.date(),
    confidence: z.number().min(0).max(1),
    impact: z.enum(['HIGH', 'MEDIUM', 'LOW'])
  })),
  status: z.enum(['GENERATING', 'GENERATED', 'DISTRIBUTED', 'FAILED']),
  generatedAt: z.date(),
  processingMetadata: z.object({
    processingStartTime: z.date(),
    processingEndTime: z.date(),
    processingDuration: z.number().min(0),
    modelVersion: z.string(),
    overallConfidence: z.number().min(0).max(1)
  })
});

const TRANSCRIPTION_SCHEMA = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  content: z.string().min(1),
  timestamp: z.date(),
  speakerData: z.array(z.object({
    speakerId: z.string().uuid(),
    participantId: z.string().uuid(),
    startTime: z.date(),
    endTime: z.date(),
    confidence: z.number().min(0).max(1)
  })),
  status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED', 'ARCHIVED']),
  metadata: z.object({
    language: z.string(),
    noiseLevel: z.number().min(0).max(100),
    processingDuration: z.number().min(0),
    wordCount: z.number().min(0),
    errorCode: z.enum([ErrorCode.AI_PROCESSING_ERROR]).optional(),
    retentionPeriod: z.number().min(0).optional(),
    qualityScore: z.number().min(0).max(100).optional()
  }),
  chunks: z.array(z.object({
    id: z.string().uuid(),
    transcriptionId: z.string().uuid(),
    content: z.string().min(1),
    sequence: z.number().min(0),
    speakerData: z.object({
      speakerId: z.string().uuid(),
      participantId: z.string().uuid(),
      startTime: z.date(),
      endTime: z.date(),
      confidence: z.number().min(0).max(1)
    }),
    timestamp: z.date(),
    isProcessed: z.boolean(),
    noiseReduction: z.object({
      originalContent: z.string(),
      noiseLevel: z.number().min(0).max(100),
      processingMethod: z.string()
    }).optional()
  })).optional()
});

/**
 * Validates meeting data structure against defined schema
 * @param meeting Meeting object to validate
 * @returns true if valid, throws ValidationError with details if invalid
 */
export const validateMeeting = (meeting: Meeting): boolean => {
  try {
    // Validate basic structure using Zod schema
    MEETING_SCHEMA.parse(meeting);

    // Additional validation rules
    if (meeting.startTime > (meeting.endTime ?? new Date())) {
      throw new ValidationError('Meeting start time must be before end time', {
        startTime: meeting.startTime,
        endTime: meeting.endTime
      });
    }

    // Validate UUID formats
    if (!isUUID(meeting.id)) {
      throw new ValidationError('Invalid meeting ID format', { id: meeting.id });
    }

    meeting.participants.forEach(participant => {
      if (!isUUID(participant.id)) {
        throw new ValidationError('Invalid participant ID format', { participantId: participant.id });
      }
    });

    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new ValidationError('Meeting validation failed', {
        errors: error.errors,
        meeting
      });
    }
    throw new ValidationError('Unexpected validation error', { error });
  }
};

/**
 * Validates minutes data structure against defined schema
 * @param minutes Minutes object to validate
 * @returns true if valid, throws ValidationError with details if invalid
 */
export const validateMinutes = (minutes: Minutes): boolean => {
  try {
    // Validate basic structure using Zod schema
    MINUTES_SCHEMA.parse(minutes);

    // Additional validation rules
    if (!isUUID(minutes.id) || !isUUID(minutes.meetingId)) {
      throw new ValidationError('Invalid UUID format', {
        minutesId: minutes.id,
        meetingId: minutes.meetingId
      });
    }

    // Validate processing metadata timing
    const { processingStartTime, processingEndTime, processingDuration } = minutes.processingMetadata;
    if (processingStartTime > processingEndTime) {
      throw new ValidationError('Invalid processing time range', {
        start: processingStartTime,
        end: processingEndTime
      });
    }

    if (processingDuration !== processingEndTime.getTime() - processingStartTime.getTime()) {
      throw new ValidationError('Processing duration mismatch', {
        calculated: processingEndTime.getTime() - processingStartTime.getTime(),
        provided: processingDuration
      });
    }

    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new ValidationError('Minutes validation failed', {
        errors: error.errors,
        minutes
      });
    }
    throw new ValidationError('Unexpected validation error', { error });
  }
};

/**
 * Validates transcription data structure against defined schema
 * @param transcription Transcription object to validate
 * @returns true if valid, throws ValidationError with details if invalid
 */
export const validateTranscription = (transcription: Transcription): boolean => {
  try {
    // Validate basic structure using Zod schema
    TRANSCRIPTION_SCHEMA.parse(transcription);

    // Additional validation rules
    if (!isUUID(transcription.id) || !isUUID(transcription.meetingId)) {
      throw new ValidationError('Invalid UUID format', {
        transcriptionId: transcription.id,
        meetingId: transcription.meetingId
      });
    }

    // Validate speaker data timing
    transcription.speakerData.forEach((speaker, index) => {
      if (speaker.startTime > speaker.endTime) {
        throw new ValidationError('Invalid speaker time range', {
          speakerIndex: index,
          startTime: speaker.startTime,
          endTime: speaker.endTime
        });
      }
    });

    // Validate chunks if present
    if (transcription.chunks) {
      let lastSequence = -1;
      transcription.chunks.forEach((chunk, index) => {
        if (chunk.sequence <= lastSequence) {
          throw new ValidationError('Invalid chunk sequence', {
            chunkIndex: index,
            sequence: chunk.sequence,
            lastSequence
          });
        }
        lastSequence = chunk.sequence;
      });
    }

    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new ValidationError('Transcription validation failed', {
        errors: error.errors,
        transcription
      });
    }
    throw new ValidationError('Unexpected validation error', { error });
  }
};