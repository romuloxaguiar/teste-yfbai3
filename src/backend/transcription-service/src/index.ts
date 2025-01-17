/**
 * @fileoverview Main entry point for the transcription service microservice
 * @version 1.0.0
 */

import express from 'express'; // ^4.18.0
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^6.0.0
import compression from 'compression'; // ^1.7.4
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { validationResult } from 'express-validator'; // ^7.0.0
import CircuitBreaker from 'opossum'; // ^7.1.0
import { Container } from 'inversify'; // ^6.0.1
import https from 'https';
import fs from 'fs';

import config from './config';
import { TranscriptionService } from './services/transcription.service';
import { Logger } from '../../shared/utils/logger';
import { ErrorHandler } from '../../shared/utils/error-handler';
import { ErrorCode, HttpStatusCode } from '../../shared/constants/error-codes';

// Initialize global instances
const container = new Container();
const logger = new Logger({ 
  serviceName: 'transcription-service', 
  environment: process.env.NODE_ENV || 'development',
  appInsightsKey: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
});
const errorHandler = new ErrorHandler({ 
  serviceName: 'transcription-service',
  environment: process.env.NODE_ENV || 'development',
  appInsightsKey: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
});

/**
 * Configure Express middleware with enhanced security
 */
function setupMiddleware(app: express.Application): void {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors({
    origin: config.server.cors.origin,
    methods: config.server.cors.methods,
    credentials: config.server.cors.credentials,
    maxAge: 86400 // 24 hours
  }));

  // Compression and parsing
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
  }));

  // Request logging
  app.use((req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID();
    res.setHeader('x-correlation-id', correlationId);
    
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      correlationId,
      ip: req.ip
    });
    next();
  });

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    errorHandler.handleApiError(err, req.headers['x-correlation-id'] as string)
      .then(({ error, statusCode }) => {
        res.status(statusCode).json({ error });
      })
      .catch(next);
  });
}

/**
 * Configure dependency injection container
 */
function setupContainer(): Container {
  container.bind<TranscriptionService>(TranscriptionService).toSelf();
  container.bind<Logger>(Logger).toConstantValue(logger);
  container.bind<ErrorHandler>(ErrorHandler).toConstantValue(errorHandler);
  container.bind<CircuitBreaker>('CircuitBreaker').toConstantValue(
    new CircuitBreaker(async () => {}, {
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    })
  );
  return container;
}

/**
 * Start server with proper error handling and monitoring
 */
async function startServer(): Promise<void> {
  try {
    const app = express();
    setupMiddleware(app);
    setupContainer();

    // Health check endpoint
    app.get('/health', (req, res) => {
      const transcriptionService = container.get<TranscriptionService>(TranscriptionService);
      transcriptionService.healthCheck()
        .then(() => res.status(HttpStatusCode.OK).json({ status: 'healthy' }))
        .catch(() => res.status(HttpStatusCode.SERVICE_UNAVAILABLE).json({ status: 'unhealthy' }));
    });

    // API routes
    app.post('/api/v1/transcription/start', async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw errorHandler.createServiceError(
            ErrorCode.VALIDATION_ERROR,
            'Invalid request parameters',
            { errors: errors.array() }
          );
        }

        const transcriptionService = container.get<TranscriptionService>(TranscriptionService);
        const result = await transcriptionService.startTranscription(
          req.body.meetingId,
          req.headers['x-correlation-id'] as string
        );
        res.status(HttpStatusCode.OK).json(result);
      } catch (error) {
        next(error);
      }
    });

    app.post('/api/v1/transcription/stop', async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw errorHandler.createServiceError(
            ErrorCode.VALIDATION_ERROR,
            'Invalid request parameters',
            { errors: errors.array() }
          );
        }

        const transcriptionService = container.get<TranscriptionService>(TranscriptionService);
        await transcriptionService.stopTranscription(
          req.body.meetingId,
          req.headers['x-correlation-id'] as string
        );
        res.status(HttpStatusCode.OK).json({ status: 'stopped' });
      } catch (error) {
        next(error);
      }
    });

    // Start HTTPS server
    let server;
    if (config.server.ssl.enabled) {
      const sslOptions = {
        key: fs.readFileSync(config.server.ssl.key!),
        cert: fs.readFileSync(config.server.ssl.cert!)
      };
      server = https.createServer(sslOptions, app);
    } else {
      server = app;
    }

    server.listen(config.server.port, config.server.host, () => {
      logger.info('Server started', {
        port: config.server.port,
        host: config.server.host,
        ssl: config.server.ssl.enabled
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

  } catch (error) {
    logger.error('Server startup failed', error as Error);
    process.exit(1);
  }
}

/**
 * Handle graceful server shutdown
 */
async function gracefulShutdown(server: https.Server | express.Application): Promise<void> {
  logger.info('Initiating graceful shutdown');

  try {
    if (server instanceof https.Server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    
    logger.info('Server shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
    process.exit(1);
  }
}

// Start the server
startServer();

export const app = express();