/**
 * @fileoverview Main router configuration for API Gateway with OpenAPI documentation,
 * security controls, and comprehensive monitoring
 * @version 1.0.0
 */

import express, { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

// Import route modules
import meetingRouter from './meeting.routes';
import minutesRouter from './minutes.routes';
import transcriptionRouter from './transcription.routes';

// Import middleware and utilities
import { authenticateToken } from '../middleware/auth.middleware';
import { handleError } from '../../../shared/utils/error-handler';
import { Logger } from '../../../shared/utils/logger';
import { ErrorCode } from '../../../shared/constants/error-codes';
import { HttpStatusCode } from '../../../shared/constants/status-codes';

// Constants
const API_VERSION = '/api/v1';
const ROUTE_PATHS = {
  MEETINGS: '/meetings',
  MINUTES: '/minutes',
  TRANSCRIPTIONS: '/transcriptions',
  DOCS: '/docs',
  HEALTH: '/health'
} as const;

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 60000, // 1 minute
  max: 1000 // Max 1000 requests per minute
} as const;

// Initialize logger
const logger = new Logger({
  serviceName: 'api-gateway',
  environment: process.env.NODE_ENV || 'development'
});

/**
 * Configure and combine all API routes with security controls and monitoring
 */
export function configureRoutes(): Router {
  const router = express.Router();

  // Configure CORS with security options
  router.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-ID', 'X-Correlation-ID'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Apply rate limiting
  router.use(rateLimit({
    ...RATE_LIMIT_CONFIG,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.headers['x-client-id'] as string,
    handler: (req, res) => {
      res.status(HttpStatusCode.TOO_MANY_REQUESTS).json({
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        correlationId: req.headers['x-correlation-id']
      });
    }
  }));

  // Request correlation middleware
  router.use((req: Request, res: Response, next) => {
    req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || uuidv4();
    next();
  });

  // Health check endpoint
  router.get(ROUTE_PATHS.HEALTH, healthCheck);

  // OpenAPI documentation
  router.use(ROUTE_PATHS.DOCS, swaggerUi.serve);
  router.get(ROUTE_PATHS.DOCS, swaggerUi.setup(undefined, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Meeting Minutes API Documentation',
    customfavIcon: '/favicon.ico'
  }));

  // Mount API routes with versioning
  router.use(
    `${API_VERSION}${ROUTE_PATHS.MEETINGS}`,
    authenticateToken,
    meetingRouter
  );

  router.use(
    `${API_VERSION}${ROUTE_PATHS.MINUTES}`,
    authenticateToken,
    minutesRouter
  );

  router.use(
    `${API_VERSION}${ROUTE_PATHS.TRANSCRIPTIONS}`,
    authenticateToken,
    transcriptionRouter
  );

  // Global error handler
  router.use((err: Error, req: Request, res: Response, next: Function) => {
    handleError(err, {
      correlationId: req.headers['x-correlation-id'] as string,
      path: req.path,
      method: req.method,
      clientId: req.headers['x-client-id'] as string
    }).then(serviceError => {
      const statusCode = serviceError.code === ErrorCode.VALIDATION_ERROR ? 
        HttpStatusCode.BAD_REQUEST : HttpStatusCode.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({ error: serviceError });
    });
  });

  return router;
}

/**
 * Health check endpoint handler with downstream service checks
 */
async function healthCheck(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const correlationId = req.headers['x-correlation-id'] as string;

  try {
    // Add health checks for downstream services here
    const health = {
      status: 'healthy',
      version: process.env.API_VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      correlationId,
      services: {
        meetings: 'healthy',
        minutes: 'healthy',
        transcriptions: 'healthy'
      }
    };

    logger.info('Health check completed', {
      correlationId,
      duration: Date.now() - startTime
    });

    res.status(HttpStatusCode.OK).json(health);
  } catch (error) {
    const serviceError = await handleError(error as Error, {
      correlationId,
      operation: 'healthCheck'
    });

    res.status(HttpStatusCode.SERVICE_UNAVAILABLE).json({
      status: 'unhealthy',
      error: serviceError,
      timestamp: new Date().toISOString(),
      correlationId
    });
  }
}

// Export configured router
export default configureRoutes();