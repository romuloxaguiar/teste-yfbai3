/**
 * @fileoverview HTTP status code constants for consistent API response handling
 * @version 1.0.0
 */

/**
 * @readonly
 * Standard HTTP status codes used for API responses.
 * Grouped by response type (2xx success, 4xx client errors, 5xx server errors)
 */
export const enum HttpStatusCode {
  // 2xx Success
  /** Request succeeded (200) */
  OK = 200,
  /** Resource created successfully (201) */
  CREATED = 201,
  /** Request accepted for processing (202) */
  ACCEPTED = 202,
  /** Request succeeded with no content to return (204) */
  NO_CONTENT = 204,

  // 4xx Client Errors
  /** Invalid request format or parameters (400) */
  BAD_REQUEST = 400,
  /** Authentication required or failed (401) */
  UNAUTHORIZED = 401,
  /** Authenticated but insufficient permissions (403) */
  FORBIDDEN = 403,
  /** Requested resource not found (404) */
  NOT_FOUND = 404,
  /** Resource state conflict (409) */
  CONFLICT = 409,
  /** Valid request but failed semantic validation (422) */
  UNPROCESSABLE_ENTITY = 422,
  /** Rate limit exceeded (429) */
  TOO_MANY_REQUESTS = 429,

  // 5xx Server Errors
  /** Unexpected server error (500) */
  INTERNAL_SERVER_ERROR = 500,
  /** Service temporarily unavailable (503) */
  SERVICE_UNAVAILABLE = 503
}