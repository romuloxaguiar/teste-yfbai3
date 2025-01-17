/**
 * @fileoverview Enterprise-grade rate limiting middleware implementing token bucket algorithm
 * with distributed rate tracking, high availability, monitoring, and security features
 * @version 1.0.0
 */

import Redis from 'ioredis'; // ^5.0.0
import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { Counter, Gauge } from 'prom-client'; // ^14.0.0
import { ErrorCode } from '../../../shared/constants/error-codes';
import { createServiceError } from '../../../shared/utils/error-handler';
import { logger } from '../../../shared/utils/logger';

// Configuration constants
const DEFAULT_RATE_LIMIT = 1000; // requests per window
const DEFAULT_WINDOW_MS = 60000; // 1 minute window
const BURST_ALLOWANCE_PERCENT = 20; // 20% burst allowance
const REDIS_KEY_PREFIX = 'ratelimit:';
const REDIS_RETRY_ATTEMPTS = 3;
const REDIS_RETRY_DELAY = 1000; // ms
const CLEANUP_INTERVAL_MS = 300000; // 5 minutes

// Prometheus metrics
const rateMetrics = {
  requests: new Counter({
    name: 'rate_limit_requests_total',
    help: 'Total number of rate limited requests',
    labelNames: ['client_id', 'status']
  }),
  remaining: new Gauge({
    name: 'rate_limit_remaining',
    help: 'Remaining requests within window',
    labelNames: ['client_id']
  })
};

interface RateLimitOptions {
  rateLimit?: number;
  windowMs?: number;
  burstAllowance?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

interface RateLimitResult {
  isAllowed: boolean;
  remaining: number;
  resetTime: number;
  headers: {
    'X-RateLimit-Limit': number;
    'X-RateLimit-Remaining': number;
    'X-RateLimit-Reset': number;
  };
}

/**
 * Generates a secure, unique Redis key for rate limiting with client validation
 */
function getRateLimitKey(clientId: string, correlationId: string): string {
  if (!clientId || clientId.length < 8) {
    throw new Error('Invalid client ID format');
  }
  
  const key = `${REDIS_KEY_PREFIX}${clientId}`;
  const timestamp = Math.floor(Date.now() / DEFAULT_WINDOW_MS);
  return `${key}:${timestamp}:${correlationId}`;
}

/**
 * Enterprise-grade rate limiter implementing token bucket algorithm with HA support
 */
export class RateLimiter {
  private redisClient: Redis;
  private rateLimit: number;
  private windowMs: number;
  private burstAllowance: number;
  private retryAttempts: number;
  private retryDelay: number;
  private cleanupInterval: NodeJS.Timer;

  constructor(redisClient: Redis, options: RateLimitOptions = {}) {
    this.redisClient = redisClient;
    this.rateLimit = options.rateLimit || DEFAULT_RATE_LIMIT;
    this.windowMs = options.windowMs || DEFAULT_WINDOW_MS;
    this.burstAllowance = Math.floor(this.rateLimit * (BURST_ALLOWANCE_PERCENT / 100));
    this.retryAttempts = options.retryAttempts || REDIS_RETRY_ATTEMPTS;
    this.retryDelay = options.retryDelay || REDIS_RETRY_DELAY;

    // Validate Redis connection
    this.redisClient.on('error', (error) => {
      logger.error('Redis connection error', error, { component: 'RateLimiter' });
    });

    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredKeys().catch(error => {
        logger.error('Rate limit cleanup failed', error, { component: 'RateLimiter' });
      });
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Checks if request is within rate limit with HA and monitoring
   */
  public async checkRateLimit(clientId: string, correlationId: string): Promise<RateLimitResult> {
    const startTime = Date.now();
    const key = getRateLimitKey(clientId, correlationId);
    let retries = 0;

    while (retries < this.retryAttempts) {
      try {
        const multi = this.redisClient.multi();
        
        // Atomic rate limit check and update
        multi.incr(key);
        multi.pttl(key);
        
        const [count, ttl] = await multi.exec();
        const currentCount = count?.[1] as number;
        
        // Set expiration on first request
        if (currentCount === 1) {
          await this.redisClient.pexpire(key, this.windowMs);
        }

        const remaining = Math.max(0, this.rateLimit + this.burstAllowance - currentCount);
        const resetTime = Date.now() + (ttl?.[1] as number || this.windowMs);
        const isAllowed = currentCount <= (this.rateLimit + this.burstAllowance);

        // Update metrics
        rateMetrics.requests.inc({ client_id: clientId, status: isAllowed ? 'allowed' : 'blocked' });
        rateMetrics.remaining.set({ client_id: clientId }, remaining);

        // Log rate limit status
        logger.info('Rate limit check', {
          clientId,
          correlationId,
          remaining,
          isAllowed,
          latencyMs: Date.now() - startTime
        });

        return {
          isAllowed,
          remaining,
          resetTime,
          headers: {
            'X-RateLimit-Limit': this.rateLimit,
            'X-RateLimit-Remaining': remaining,
            'X-RateLimit-Reset': Math.ceil(resetTime / 1000)
          }
        };

      } catch (error) {
        retries++;
        logger.warn('Rate limit check retry', {
          clientId,
          correlationId,
          retryCount: retries,
          error: error.message
        });

        if (retries < this.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        } else {
          throw error;
        }
      }
    }

    throw new Error('Rate limit check failed after retries');
  }

  /**
   * Removes expired rate limit entries with monitoring
   */
  private async cleanupExpiredKeys(): Promise<void> {
    const pattern = `${REDIS_KEY_PREFIX}*`;
    let cursor = '0';
    const deletedKeys: string[] = [];

    do {
      const [nextCursor, keys] = await this.redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        const pipeline = this.redisClient.pipeline();
        keys.forEach(key => pipeline.pttl(key));
        const ttls = await pipeline.exec();

        const expiredKeys = keys.filter((_, index) => {
          const ttl = ttls?.[index]?.[1] as number;
          return ttl <= 0;
        });

        if (expiredKeys.length > 0) {
          await this.redisClient.del(...expiredKeys);
          deletedKeys.push(...expiredKeys);
        }
      }
    } while (cursor !== '0');

    logger.info('Rate limit cleanup completed', {
      keysDeleted: deletedKeys.length,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Express middleware for enterprise-grade rate limiting
 */
export default function rateLimitMiddleware(
  redisClient: Redis,
  options: RateLimitOptions = {}
) {
  const limiter = new RateLimiter(redisClient, options);

  return async (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.headers['x-client-id'] as string;
    const correlationId = req.headers['x-correlation-id'] as string;

    if (!clientId) {
      return next(createServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Missing client ID header',
        { correlationId }
      ));
    }

    try {
      const result = await limiter.checkRateLimit(clientId, correlationId);

      // Set rate limit headers
      Object.entries(result.headers).forEach(([header, value]) => {
        res.setHeader(header, value);
      });

      if (!result.isAllowed) {
        return next(createServiceError(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded',
          {
            clientId,
            correlationId,
            resetTime: result.resetTime
          }
        ));
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error', error, {
        clientId,
        correlationId
      });

      next(createServiceError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Rate limit check failed',
        {
          clientId,
          correlationId,
          error: error.message
        }
      ));
    }
  };
}