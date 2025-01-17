/**
 * @fileoverview TypeScript type definitions for API-related data structures
 * @version 1.0.0
 */

import { ErrorCode, ErrorSeverity } from '../../../backend/shared/constants/error-codes';
import type { UUID } from 'crypto';

/**
 * Enhanced interface for API error details with severity and tracking
 */
export interface ApiError {
  /** Application-specific error code */
  code: ErrorCode;
  /** Human-readable error message */
  message: string;
  /** Additional error context and debugging information */
  details: Record<string, any>;
  /** Error severity level for monitoring */
  severity: ErrorSeverity;
  /** Error occurrence timestamp */
  timestamp: Date;
  /** Stack trace for debugging (only included in development) */
  stackTrace?: string;
}

/**
 * Enhanced interface for API response metadata with performance tracking
 */
export interface ApiMetadata {
  /** Response timestamp */
  timestamp: Date;
  /** Unique request identifier for tracing */
  requestId: UUID;
  /** Request processing time in milliseconds */
  processingTime: number;
  /** API version identifier */
  version: string;
}

/**
 * Generic interface for standardized API responses
 * @template T Type of the response data
 */
export interface ApiResponse<T> {
  /** Indicates if the request was successful */
  success: boolean;
  /** Response payload */
  data: T;
  /** Error information if request failed */
  error: ApiError | null;
  /** Response metadata */
  metadata: ApiMetadata;
}

/**
 * Generic interface for paginated API responses
 * @template T Type of the items in the response
 */
export interface PaginatedResponse<T> {
  /** Array of items for current page */
  items: T[];
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Indicates if more pages are available */
  hasMore: boolean;
}

/**
 * Retry strategy options for failed requests
 */
export enum RetryStrategy {
  /** No retry attempts */
  NONE = 'none',
  /** Linear backoff between attempts */
  LINEAR = 'linear',
  /** Exponential backoff between attempts */
  EXPONENTIAL = 'exponential'
}

/**
 * Enhanced interface for API request configuration
 */
export interface ApiRequestOptions {
  /** Custom request headers */
  headers: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retry attempts for failed requests */
  retryAttempts: number;
  /** Retry strategy for failed requests */
  retryStrategy: RetryStrategy;
  /** Custom status code validation function */
  validateStatus: (status: number) => boolean;
  /** AbortSignal for request cancellation */
  signal: AbortSignal;
}

/**
 * Type guard to check if an object is an ApiError
 * @param error Object to check
 * @returns True if object matches ApiError interface
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'severity' in error &&
    'timestamp' in error &&
    typeof (error as ApiError).message === 'string' &&
    Object.values(ErrorCode).includes((error as ApiError).code) &&
    Object.values(ErrorSeverity).includes((error as ApiError).severity)
  );
}