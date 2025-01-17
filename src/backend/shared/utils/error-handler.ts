/**
 * @fileoverview Enterprise-grade error handling utility with distributed tracing and circuit breaker patterns
 * @version 1.0.0
 */

import { ErrorCode, ErrorSeverity, ServiceError, errorCodeToHttpStatus, errorCodeToSeverity } from '../constants/error-codes';
import { HttpStatusCode } from '../constants/status-codes';
import { Logger } from './logger';
import CircuitBreaker from 'opossum'; // ^7.0.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { RedisClient } from 'redis'; // ^4.6.0
import { Counter, Registry } from 'prom-client'; // ^14.0.0

/**
 * Configuration interface for error handler
 */
interface ErrorHandlerConfig {
  serviceName: string;
  environment: string;
  appInsightsKey?: string;
  redisConfig?: {
    host: string;
    port: number;
    password?: string;
  };
  circuitBreaker?: {
    timeout: number;
    errorThreshold: number;
    resetTimeout: number;
  };
}

/**
 * Error cache interface for tracking error patterns
 */
interface ErrorCacheEntry {
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  correlationIds: string[];
}

/**
 * Enhanced error handler class with enterprise features
 */
export class ErrorHandler {
  private logger: Logger;
  private circuitBreaker: CircuitBreaker;
  private errorCache: RedisClient;
  private metricsRegistry: Registry;
  private errorCounter: Counter<string>;

  constructor(config: ErrorHandlerConfig) {
    // Initialize logger
    this.logger = new Logger({
      serviceName: config.serviceName,
      environment: config.environment,
      appInsightsKey: config.appInsightsKey
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(this.handleError.bind(this), {
      timeout: config.circuitBreaker?.timeout || 30000,
      errorThresholdPercentage: config.circuitBreaker?.errorThreshold || 50,
      resetTimeout: config.circuitBreaker?.resetTimeout || 30000
    });

    // Initialize Redis client for error caching
    if (config.redisConfig) {
      this.errorCache = new RedisClient(config.redisConfig);
    }

    // Initialize Prometheus metrics
    this.metricsRegistry = new Registry();
    this.errorCounter = new Counter({
      name: 'service_errors_total',
      help: 'Total number of service errors',
      labelNames: ['error_code', 'severity'],
      registers: [this.metricsRegistry]
    });

    // Set up circuit breaker event handlers
    this.setupCircuitBreakerEvents();
  }

  /**
   * Configure circuit breaker event handlers
   */
  private setupCircuitBreakerEvents(): void {
    this.circuitBreaker.on('open', () => {
      this.logger.error('Circuit breaker opened', null, {
        event: 'circuit_breaker_open'
      });
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info('Circuit breaker half-open', {
        event: 'circuit_breaker_half_open'
      });
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Circuit breaker closed', {
        event: 'circuit_breaker_closed'
      });
    });
  }

  /**
   * Update error metrics and cache
   */
  private async trackError(error: ServiceError): Promise<void> {
    // Increment Prometheus counter
    this.errorCounter.inc({
      error_code: error.code,
      severity: error.severity
    });

    // Update error cache if Redis is configured
    if (this.errorCache) {
      const cacheKey = `error:${error.code}`;
      const entry: ErrorCacheEntry = await this.errorCache.get(cacheKey)
        .then(JSON.parse)
        .catch(() => ({
          count: 0,
          firstOccurrence: new Date(),
          lastOccurrence: new Date(),
          correlationIds: []
        }));

      entry.count++;
      entry.lastOccurrence = new Date();
      entry.correlationIds.push(error.correlationId);

      // Keep last 100 correlation IDs
      if (entry.correlationIds.length > 100) {
        entry.correlationIds = entry.correlationIds.slice(-100);
      }

      await this.errorCache.setEx(
        cacheKey,
        86400, // 24 hours
        JSON.stringify(entry)
      );
    }
  }

  /**
   * Create a standardized service error
   */
  public createServiceError(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    correlationId?: string,
    severity?: ErrorSeverity
  ): ServiceError {
    return {
      code,
      message,
      details: this.sanitizeErrorDetails(details),
      correlationId: correlationId || uuidv4(),
      timestamp: new Date(),
      severity: severity || errorCodeToSeverity[code]
    };
  }

  /**
   * Sanitize error details to remove sensitive information
   */
  private sanitizeErrorDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!details) return undefined;

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details)) {
      // Remove potential sensitive fields
      if (!['password', 'token', 'secret', 'key'].includes(key.toLowerCase())) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Main error handling function with circuit breaker pattern
   */
  public async handleError(
    error: Error | ServiceError,
    metadata?: Record<string, unknown>,
    correlationId?: string
  ): Promise<ServiceError> {
    try {
      // Generate correlation ID if not provided
      const errorCorrelationId = correlationId || uuidv4();

      // Create service error if raw error provided
      const serviceError: ServiceError = 'code' in error
        ? error as ServiceError
        : this.createServiceError(
            ErrorCode.INTERNAL_SERVER_ERROR,
            error.message,
            {
              ...metadata,
              stack: error.stack
            },
            errorCorrelationId
          );

      // Log error with full context
      this.logger.error(serviceError.message, error, {
        correlationId: errorCorrelationId,
        errorCode: serviceError.code,
        severity: serviceError.severity,
        ...metadata
      });

      // Track error metrics and patterns
      await this.trackError(serviceError);

      return serviceError;
    } catch (handlingError) {
      // Fallback error handling
      const fallbackError = this.createServiceError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Error handling failed',
        { originalError: error.message, handlingError: handlingError.message },
        correlationId
      );

      this.logger.error('Error handler failed', handlingError, {
        correlationId,
        originalError: error
      });

      return fallbackError;
    }
  }

  /**
   * Handle API-specific errors with appropriate HTTP status codes
   */
  public async handleApiError(
    error: Error | ServiceError,
    correlationId?: string
  ): Promise<{
    error: ServiceError;
    statusCode: HttpStatusCode;
  }> {
    const serviceError = await this.handleError(error, undefined, correlationId);
    const statusCode = errorCodeToHttpStatus[serviceError.code] || HttpStatusCode.INTERNAL_SERVER_ERROR;

    return {
      error: serviceError,
      statusCode
    };
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler({
  serviceName: process.env.SERVICE_NAME || 'unknown-service',
  environment: process.env.NODE_ENV || 'development',
  appInsightsKey: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
});

// Export utility functions
export const handleError = errorHandler.handleError.bind(errorHandler);
export const handleApiError = errorHandler.handleApiError.bind(errorHandler);