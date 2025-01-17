/**
 * @fileoverview Entry point for the distribution service that handles meeting minutes delivery
 * @version 1.0.0
 */

import express from 'express'; // ^4.18.0
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^6.0.0
import morgan from 'morgan'; // ^1.10.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import pino from 'pino'; // ^8.11.0
import CircuitBreaker from 'opossum'; // ^7.1.0
import { HealthCheck } from '@healthcheck/core'; // ^1.0.0
import { config } from './config';
import { EmailService } from './services/email.service';
import { TeamsNotificationService } from './services/teams.notification.service';
import { handleError } from '../../shared/utils/error-handler';
import { ErrorCode } from '../../shared/constants/error-codes';
import { MinutesStatus } from '../../shared/types/minutes.types';

// Initialize logger
const logger = pino({ 
  level: config.logLevel,
  name: 'distribution-service'
});

// Initialize services with circuit breakers
const emailCircuitBreaker = new CircuitBreaker(async (...args) => {
  const emailService = new EmailService(config.email);
  return emailService.sendMinutesEmail(...args);
}, {
  timeout: 30000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

const teamsCircuitBreaker = new CircuitBreaker(async (...args) => {
  const teamsService = new TeamsNotificationService(logger);
  return teamsService.sendMinutesGeneratedNotification(...args);
}, {
  timeout: 20000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

// Initialize Express app
const app = express();

/**
 * Initialize server with enterprise-grade middleware and security features
 */
function initializeServer(): express.Application {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // CORS configuration
  app.use(cors({
    origin: config.security.cors.allowedOrigins,
    methods: config.security.cors.allowedMethods,
    maxAge: config.security.cors.maxAge,
    credentials: true
  }));

  // Request logging
  app.use(morgan('combined'));

  // JSON body parsing
  app.use(express.json({ limit: '1mb' }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: config.security.rateLimiting.windowMs,
    max: config.security.rateLimiting.max,
    message: 'Too many requests, please try again later'
  }));

  // Health check endpoint
  const healthCheck = new HealthCheck();
  app.get('/health', (req, res) => {
    const status = healthCheck.getStatus();
    res.status(status.healthy ? 200 : 503).json(status);
  });

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    handleError(err, {
      path: req.path,
      method: req.method,
      correlationId: req.headers['x-correlation-id']
    }).then(error => {
      res.status(error.code || 500).json({ error });
    });
  });

  return app;
}

/**
 * Start server with graceful shutdown support
 */
async function startServer(app: express.Application): Promise<void> {
  const server = app.listen(config.port, () => {
    logger.info(`Distribution service listening on port ${config.port}`);
  });

  // Circuit breaker event handlers
  emailCircuitBreaker.on('open', () => {
    logger.warn('Email circuit breaker opened');
  });

  teamsCircuitBreaker.on('open', () => {
    logger.warn('Teams notification circuit breaker opened');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown`);

    // Stop accepting new connections
    server.close(async () => {
      try {
        // Wait for ongoing requests to complete (30s max)
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Close circuit breakers
        await emailCircuitBreaker.shutdown();
        await teamsCircuitBreaker.shutdown();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
      }
    });
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the service
(async () => {
  try {
    const app = initializeServer();
    await startServer(app);
  } catch (error) {
    logger.error('Failed to start service', error);
    process.exit(1);
  }
})();

// Export for testing
export { app, initializeServer, startServer };