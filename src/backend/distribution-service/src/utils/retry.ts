/**
 * @fileoverview Enterprise-grade retry utility with exponential backoff and monitoring
 * @version 1.0.0
 */

import { handleError } from '../../../shared/utils/error-handler';
import { logger } from '../../../shared/utils/logger';

// Global retry configuration constants
export const MAX_RETRIES = 3;
export const BASE_DELAY = 1000; // 1 second
export const MAX_DELAY = 5000; // 5 seconds
export const JITTER_RANGE = { min: 100, max: 300 }; // 100-300ms jitter
export const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Retry-specific error codes
export const RETRY_ERROR_CODES = {
  TRANSIENT_ERROR: 'RETRY_001',
  MAX_ATTEMPTS_EXCEEDED: 'RETRY_002',
  TIMEOUT_EXCEEDED: 'RETRY_003'
} as const;

/**
 * Retry operation configuration interface
 */
interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  timeout?: number;
  enableCircuitBreaker?: boolean;
}

/**
 * Retry context for operation execution
 */
interface RetryContext {
  correlationId?: string;
  operationName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Retry metrics interface for monitoring
 */
interface RetryMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  lastAttemptTimestamp: Date;
  averageDelayMs: number;
  successRate: number;
}

/**
 * Custom error class for retry operations
 */
export class RetryError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: RetryContext,
    public attempt?: number
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Calculate exponential backoff with jitter
 * @param attempt Current retry attempt number
 * @param baseDelay Base delay in milliseconds
 * @param maxDelay Maximum delay in milliseconds
 * @returns Calculated delay with jitter
 */
export function calculateBackoff(
  attempt: number,
  baseDelay: number = BASE_DELAY,
  maxDelay: number = MAX_DELAY
): number {
  // Calculate base exponential delay
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, attempt),
    maxDelay
  );

  // Add random jitter
  const jitter = Math.floor(
    Math.random() * (JITTER_RANGE.max - JITTER_RANGE.min + 1)
  ) + JITTER_RANGE.min;

  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Promise-based sleep function with timeout
 */
async function sleep(ms: number, timeout?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);

    if (timeout) {
      const timeoutTimer = setTimeout(() => {
        clearTimeout(timer);
        reject(new RetryError(
          RETRY_ERROR_CODES.TIMEOUT_EXCEEDED,
          `Operation timed out after ${timeout}ms`
        ));
      }, timeout);

      // Clean up timeout timer if sleep resolves
      timer.unref();
      timeoutTimer.unref();
    }
  });
}

/**
 * Enterprise-grade retry operation handler
 */
export class RetryOperation<T = unknown> {
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;
  private timeout: number;
  private metrics: RetryMetrics;

  constructor(config: RetryConfig = {}) {
    this.maxRetries = config.maxRetries ?? MAX_RETRIES;
    this.baseDelay = config.baseDelay ?? BASE_DELAY;
    this.maxDelay = config.maxDelay ?? MAX_DELAY;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;

    // Initialize metrics
    this.metrics = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      lastAttemptTimestamp: new Date(),
      averageDelayMs: 0,
      successRate: 0
    };
  }

  /**
   * Execute operation with retry logic
   * @param operation Operation to execute
   * @param context Retry context
   * @returns Operation result
   */
  public async execute(
    operation: () => Promise<T>,
    context: RetryContext = {}
  ): Promise<T> {
    let lastError: Error | undefined;
    let totalDelay = 0;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      this.metrics.totalAttempts++;
      this.metrics.lastAttemptTimestamp = new Date();

      try {
        // Execute operation with timeout
        const result = await Promise.race([
          operation(),
          sleep(this.timeout).then(() => {
            throw new RetryError(
              RETRY_ERROR_CODES.TIMEOUT_EXCEEDED,
              `Operation timed out after ${this.timeout}ms`,
              context,
              attempt
            );
          })
        ]);

        // Success - update metrics and return result
        this.metrics.successfulAttempts++;
        this.updateMetrics(totalDelay);
        
        logger.info('Operation completed successfully', {
          correlationId: context.correlationId,
          operationName: context.operationName,
          attempt,
          totalAttempts: attempt + 1
        });

        return result;

      } catch (error) {
        lastError = error;
        this.metrics.failedAttempts++;

        // Log retry attempt
        logger.warn('Operation failed, retrying', {
          correlationId: context.correlationId,
          operationName: context.operationName,
          attempt,
          error: error.message,
          remainingAttempts: this.maxRetries - attempt
        });

        // Check if we should retry
        if (attempt === this.maxRetries) {
          break;
        }

        // Calculate and apply backoff delay
        const delay = calculateBackoff(attempt, this.baseDelay, this.maxDelay);
        totalDelay += delay;

        logger.debug('Applying retry delay', {
          correlationId: context.correlationId,
          operationName: context.operationName,
          attempt,
          delayMs: delay
        });

        await sleep(delay);
      }
    }

    // All retries failed - throw enhanced error
    this.updateMetrics(totalDelay);
    
    const finalError = new RetryError(
      RETRY_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED,
      `Operation failed after ${this.maxRetries} attempts`,
      context,
      this.maxRetries
    );

    await handleError(finalError, {
      lastError,
      metrics: this.getMetrics(),
      ...context.metadata
    });

    throw finalError;
  }

  /**
   * Update retry metrics
   */
  private updateMetrics(totalDelay: number): void {
    this.metrics.averageDelayMs = totalDelay / this.metrics.totalAttempts;
    this.metrics.successRate = 
      (this.metrics.successfulAttempts / this.metrics.totalAttempts) * 100;
  }

  /**
   * Get current retry metrics
   */
  public getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }
}