/**
 * @fileoverview Standardized error codes and types for backend microservices
 * @version 1.0.0
 */

import { HttpStatusCode } from './status-codes';

// Global error code prefixes for categorization
export const ERROR_PREFIX = 'ERR';
export const VALIDATION_ERROR_PREFIX = 'VAL';
export const AUTH_ERROR_PREFIX = 'AUTH';
export const SYSTEM_ERROR_PREFIX = 'SYS';
export const TEAMS_ERROR_PREFIX = 'TEAMS';
export const AI_ERROR_PREFIX = 'AI';
export const DB_ERROR_PREFIX = 'DB';

/**
 * @readonly
 * Application-specific error codes for all system components
 */
export enum ErrorCode {
  VALIDATION_ERROR = `${VALIDATION_ERROR_PREFIX}_001`,
  UNAUTHORIZED = `${AUTH_ERROR_PREFIX}_001`,
  FORBIDDEN = `${AUTH_ERROR_PREFIX}_002`,
  NOT_FOUND = `${ERROR_PREFIX}_001`,
  RATE_LIMIT_EXCEEDED = `${ERROR_PREFIX}_002`,
  INTERNAL_SERVER_ERROR = `${SYSTEM_ERROR_PREFIX}_001`,
  SERVICE_UNAVAILABLE = `${SYSTEM_ERROR_PREFIX}_002`,
  DATABASE_ERROR = `${DB_ERROR_PREFIX}_001`,
  TEAMS_API_ERROR = `${TEAMS_ERROR_PREFIX}_001`,
  AI_PROCESSING_ERROR = `${AI_ERROR_PREFIX}_001`,
  TRANSCRIPTION_ERROR = `${TEAMS_ERROR_PREFIX}_002`,
  DISTRIBUTION_ERROR = `${SYSTEM_ERROR_PREFIX}_003`
}

/**
 * @readonly
 * Error severity levels for monitoring and alerting
 */
export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * @readonly
 * Detailed descriptions for all error codes with monitoring context
 */
export enum ErrorCodeDescription {
  VALIDATION_ERROR_DESCRIPTION = 'Request validation failed due to invalid parameters or format',
  UNAUTHORIZED_DESCRIPTION = 'Authentication required or credentials invalid',
  FORBIDDEN_DESCRIPTION = 'Insufficient permissions to access the requested resource',
  NOT_FOUND_DESCRIPTION = 'The requested resource could not be found',
  RATE_LIMIT_EXCEEDED_DESCRIPTION = 'API rate limit exceeded, please try again later',
  INTERNAL_SERVER_ERROR_DESCRIPTION = 'An unexpected error occurred while processing the request',
  SERVICE_UNAVAILABLE_DESCRIPTION = 'Service is temporarily unavailable, please try again later',
  DATABASE_ERROR_DESCRIPTION = 'Database operation failed',
  TEAMS_API_ERROR_DESCRIPTION = 'Microsoft Teams API request failed',
  AI_PROCESSING_ERROR_DESCRIPTION = 'AI processing of meeting content failed',
  TRANSCRIPTION_ERROR_DESCRIPTION = 'Meeting transcription processing failed',
  DISTRIBUTION_ERROR_DESCRIPTION = 'Meeting minutes distribution failed'
}

/**
 * Maps error codes to corresponding HTTP status codes
 */
export const errorCodeToHttpStatus: Record<ErrorCode, HttpStatusCode> = {
  [ErrorCode.VALIDATION_ERROR]: HttpStatusCode.BAD_REQUEST,
  [ErrorCode.UNAUTHORIZED]: HttpStatusCode.UNAUTHORIZED,
  [ErrorCode.FORBIDDEN]: HttpStatusCode.FORBIDDEN,
  [ErrorCode.NOT_FOUND]: HttpStatusCode.NOT_FOUND,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: HttpStatusCode.TOO_MANY_REQUESTS,
  [ErrorCode.INTERNAL_SERVER_ERROR]: HttpStatusCode.INTERNAL_SERVER_ERROR,
  [ErrorCode.SERVICE_UNAVAILABLE]: HttpStatusCode.SERVICE_UNAVAILABLE,
  [ErrorCode.DATABASE_ERROR]: HttpStatusCode.INTERNAL_SERVER_ERROR,
  [ErrorCode.TEAMS_API_ERROR]: HttpStatusCode.SERVICE_UNAVAILABLE,
  [ErrorCode.AI_PROCESSING_ERROR]: HttpStatusCode.INTERNAL_SERVER_ERROR,
  [ErrorCode.TRANSCRIPTION_ERROR]: HttpStatusCode.INTERNAL_SERVER_ERROR,
  [ErrorCode.DISTRIBUTION_ERROR]: HttpStatusCode.INTERNAL_SERVER_ERROR
};

/**
 * Enhanced interface for structured error objects with monitoring and debugging support
 */
export interface ServiceError {
  /** Application-specific error code */
  code: ErrorCode;
  /** Human-readable error message */
  message: string;
  /** Additional error context and debugging information */
  details?: Record<string, unknown>;
  /** Unique identifier for error tracking across services */
  correlationId: string;
  /** Error occurrence timestamp */
  timestamp: Date;
  /** Error severity level for monitoring */
  severity: ErrorSeverity;
}

/**
 * Maps error codes to default severity levels
 */
export const errorCodeToSeverity: Record<ErrorCode, ErrorSeverity> = {
  [ErrorCode.VALIDATION_ERROR]: ErrorSeverity.WARNING,
  [ErrorCode.UNAUTHORIZED]: ErrorSeverity.WARNING,
  [ErrorCode.FORBIDDEN]: ErrorSeverity.WARNING,
  [ErrorCode.NOT_FOUND]: ErrorSeverity.INFO,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: ErrorSeverity.WARNING,
  [ErrorCode.INTERNAL_SERVER_ERROR]: ErrorSeverity.ERROR,
  [ErrorCode.SERVICE_UNAVAILABLE]: ErrorSeverity.ERROR,
  [ErrorCode.DATABASE_ERROR]: ErrorSeverity.CRITICAL,
  [ErrorCode.TEAMS_API_ERROR]: ErrorSeverity.ERROR,
  [ErrorCode.AI_PROCESSING_ERROR]: ErrorSeverity.ERROR,
  [ErrorCode.TRANSCRIPTION_ERROR]: ErrorSeverity.ERROR,
  [ErrorCode.DISTRIBUTION_ERROR]: ErrorSeverity.ERROR
};