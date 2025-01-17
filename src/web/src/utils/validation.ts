/**
 * @fileoverview Utility functions for validating meeting, minutes, and API data structures
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.0
import type { WebMeeting } from '../types/meeting.types';
import type { WebMinutes } from '../types/minutes.types';
import type { ApiResponse } from '../types/api.types';
import { ErrorCode, ErrorSeverity } from '../../../backend/shared/constants/error-codes';

// Validation timeout in milliseconds
const VALIDATION_TIMEOUT = 5000;

/**
 * Interface for validation results with detailed error information
 */
interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Interface for structured validation errors
 */
interface ValidationError {
  code: ErrorCode;
  field?: string;
  message: string;
  severity: ErrorSeverity;
}

// Cached schema for UUID validation
const uuidSchema = z.string().uuid();

// Cached schema for WebMeeting validation
const meetingSchema = z.object({
  id: z.string().uuid(),
  organizerId: z.string(),
  title: z.string().min(1).max(200),
  startTime: z.date(),
  endTime: z.date().optional(),
  status: z.string(),
  participants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.string(),
    joinTime: z.date(),
    leaveTime: z.date().optional(),
    isActive: z.boolean(),
    isSpeaking: z.boolean()
  })),
  metadata: z.object({
    teamsId: z.string(),
    transcriptionEnabled: z.boolean(),
    recordingEnabled: z.boolean(),
    autoMinutesEnabled: z.boolean(),
    processingStatus: z.string(),
    processingProgress: z.number().min(0).max(100)
  }),
  uiState: z.object({
    isControlsVisible: z.boolean(),
    isStatusOverlayVisible: z.boolean(),
    selectedTab: z.string(),
    errorMessage: z.string().nullable()
  })
}).strict();

// Cached schema for WebMinutes validation
const minutesSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  summary: z.string(),
  topics: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    content: z.string(),
    confidence: z.number().min(0).max(1),
    subtopics: z.array(z.lazy(() => z.object({
      id: z.string().uuid(),
      title: z.string(),
      content: z.string(),
      confidence: z.number().min(0).max(1),
      isExpanded: z.boolean(),
      isHighlighted: z.boolean()
    }))),
    isExpanded: z.boolean(),
    isHighlighted: z.boolean()
  })),
  actionItems: z.array(z.object({
    id: z.string().uuid(),
    description: z.string(),
    assigneeId: z.string(),
    dueDate: z.date().nullable(),
    status: z.string(),
    confidence: z.number().min(0).max(1),
    isEditing: z.boolean(),
    isSelected: z.boolean()
  })),
  decisions: z.array(z.object({
    id: z.string().uuid(),
    description: z.string(),
    madeBy: z.string(),
    timestamp: z.date(),
    confidence: z.number().min(0).max(1),
    isHighlighted: z.boolean()
  })),
  status: z.string(),
  generatedAt: z.date(),
  uiState: z.object({
    selectedTab: z.string(),
    isExportModalOpen: z.boolean(),
    isShareModalOpen: z.boolean(),
    errorMessage: z.string().nullable()
  })
}).strict();

// Cached schema for API response validation
const apiResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  success: z.boolean(),
  data: dataSchema,
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()),
    severity: z.string(),
    timestamp: z.date(),
    stackTrace: z.string().optional()
  }).nullable(),
  metadata: z.object({
    timestamp: z.date(),
    requestId: z.string().uuid(),
    processingTime: z.number(),
    version: z.string()
  })
}).strict();

/**
 * Validates meeting data against defined schema
 * @param meeting Partial meeting data to validate
 * @returns Validation result with detailed error information
 */
export function validateMeeting(meeting: Partial<WebMeeting>): ValidationResult<WebMeeting> {
  try {
    const result = meetingSchema.safeParse(meeting);
    
    if (!result.success) {
      return {
        isValid: false,
        errors: result.error.issues.map(issue => ({
          code: ErrorCode.VALIDATION_ERROR,
          field: issue.path.join('.'),
          message: issue.message,
          severity: ErrorSeverity.WARNING
        }))
      };
    }

    return {
      isValid: true,
      data: result.data
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Meeting validation failed unexpectedly',
        severity: ErrorSeverity.ERROR
      }]
    };
  }
}

/**
 * Validates minutes data against defined schema
 * @param minutes Partial minutes data to validate
 * @returns Validation result with detailed error information
 */
export function validateMinutes(minutes: Partial<WebMinutes>): ValidationResult<WebMinutes> {
  try {
    const result = minutesSchema.safeParse(minutes);
    
    if (!result.success) {
      return {
        isValid: false,
        errors: result.error.issues.map(issue => ({
          code: ErrorCode.VALIDATION_ERROR,
          field: issue.path.join('.'),
          message: issue.message,
          severity: ErrorSeverity.WARNING
        }))
      };
    }

    return {
      isValid: true,
      data: result.data
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Minutes validation failed unexpectedly',
        severity: ErrorSeverity.ERROR
      }]
    };
  }
}

/**
 * Validates API response structure and data
 * @param response Unknown response data to validate
 * @returns Validation result with detailed error information
 */
export function validateApiResponse<T>(
  response: unknown,
  dataSchema: z.ZodType<T>
): ValidationResult<ApiResponse<T>> {
  try {
    const schema = apiResponseSchema(dataSchema);
    const result = schema.safeParse(response);
    
    if (!result.success) {
      return {
        isValid: false,
        errors: result.error.issues.map(issue => ({
          code: ErrorCode.VALIDATION_ERROR,
          field: issue.path.join('.'),
          message: issue.message,
          severity: ErrorSeverity.WARNING
        }))
      };
    }

    return {
      isValid: true,
      data: result.data
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        code: ErrorCode.VALIDATION_ERROR,
        message: 'API response validation failed unexpectedly',
        severity: ErrorSeverity.ERROR
      }]
    };
  }
}

/**
 * Validates UUID string format
 * @param uuid String to validate as UUID
 * @returns True if string matches UUID format
 */
export function isValidUUID(uuid: string): boolean {
  try {
    return uuidSchema.safeParse(uuid).success;
  } catch {
    return false;
  }
}