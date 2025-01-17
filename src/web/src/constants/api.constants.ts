/**
 * @fileoverview API-related constants for web client communication with backend services
 * @version 1.0.0
 */

import { HttpStatusCode } from '../../backend/shared/constants/status-codes';
import { ErrorCode } from '../../backend/shared/constants/error-codes';

/**
 * Current API version
 * @constant
 */
export const API_VERSION = 'v1';

/**
 * API endpoint paths
 * @readonly
 */
export enum API_ENDPOINTS {
  MEETINGS = '/api/v1/meetings',
  TRANSCRIPTIONS = '/api/v1/transcriptions',
  MINUTES = '/api/v1/minutes',
  DISTRIBUTION = '/api/v1/distribution'
}

/**
 * WebSocket endpoint paths for real-time updates
 * @readonly
 */
export enum WS_ENDPOINTS {
  MEETING_UPDATES = '/ws/meetings',
  TRANSCRIPTION_STREAM = '/ws/transcriptions',
  MINUTES_PROGRESS = '/ws/minutes'
}

/**
 * Request timeout configurations (in milliseconds)
 * @constant
 */
export const REQUEST_TIMEOUT = 30000;
export const LONG_RUNNING_TIMEOUT = 300000;
export const UPLOAD_TIMEOUT = 120000;

/**
 * Retry policy configurations
 * @constant
 */
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY = 1000;

/**
 * Rate limiting configurations (requests per minute)
 * @constant
 */
export const RATE_LIMIT_WINDOW = 60000;
export const RATE_LIMIT_MAX_REQUESTS = 1000;

/**
 * WebSocket connection configurations
 * @constant
 */
export const WS_RETRY_ATTEMPTS = 5;
export const WS_RECONNECT_DELAY = 2000;

/**
 * Default request headers
 * @constant
 */
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-API-Version': API_VERSION
};

/**
 * Security headers for requests
 * @constant
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
};

/**
 * Authentication header configurations
 * @constant
 */
export const AUTH_HEADER_PREFIX = 'Bearer ';
export const CORRELATION_HEADER = 'X-Correlation-ID';

/**
 * Success response status codes
 * @constant
 */
export const SUCCESS_STATUS_CODES = [
  HttpStatusCode.OK,
  HttpStatusCode.CREATED,
  HttpStatusCode.ACCEPTED
];

/**
 * Retryable error codes
 * @constant
 */
export const RETRYABLE_ERROR_CODES = [
  ErrorCode.SERVICE_UNAVAILABLE,
  ErrorCode.TEAMS_API_ERROR,
  ErrorCode.DATABASE_ERROR
];

/**
 * Circuit breaker configurations
 * @constant
 */
export const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 0.5, // 50% failure rate
  resetTimeout: 30000, // 30 seconds
  minimumRequests: 10
};

/**
 * API response cache configurations
 * @constant
 */
export const CACHE_CONFIG = {
  defaultTTL: 300000, // 5 minutes
  maxEntries: 1000,
  staleWhileRevalidate: 30000 // 30 seconds
};