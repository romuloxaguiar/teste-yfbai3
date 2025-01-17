/**
 * @fileoverview Main entry point for the API Gateway service with comprehensive security,
 * monitoring, and WebSocket support for real-time updates
 * @version 1.0.0
 */

import express from 'express'; // ^4.18.2
import helmet from 'helmet'; // ^7.0.0
import cors from 'cors'; // ^2.8.5
import compression from 'compression'; // ^1.7.4
import { WebSocketServer } from 'ws'; // ^8.13.0
import * as applicationInsights from 'applicationinsights'; // ^2.7.0
import { Server } from 'http';

// Import routes and middleware
import router from './routes';
import { authenticateToken } from './middleware/auth.middleware';
import rateLimitMiddleware from './middleware/ratelimit.middleware';
import { config } from './config';
import { logger } from '../../shared/utils/logger';
import { ErrorCode } from '../../shared/constants/error-codes';
import { HttpStatusCode } from '../../shared/constants/status-codes';

// Initialize Express app
const app = express();

// Initialize Application Insights
if (config.env === 'production') {
  applicationInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true)
    .start();
}

/**
 * Configure comprehensive middleware stack with security and monitoring
 */
function configureMiddleware(app: express.Application): void {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-site' },
    dnsPrefetchControl: { allow: false },
    expectCt: { enforce: true, maxAge: 30 },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors({
    origin: config.env === 'production' ? 'https://api.meetingminutes.com' : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-ID', 'X-Correlation-ID'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 86400
  }));

  // Compression and parsing
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Authentication and rate limiting
  app.use(authenticateToken);
  app.use(rateLimitMiddleware(config.rateLimit));

  // Request tracking
  app.use((req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info('Request processed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        correlationId: req.headers['x-correlation-id']
      });
    });
    next();
  });

  // API routes
  app.use('/api/v1', router);

  // Error handling
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', err, {
      correlationId: req.headers['x-correlation-id'],
      path: req.path,
      method: req.method
    });

    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      correlationId: req.headers['x-correlation-id']
    });
  });
}

/**
 * Initialize and start the server with WebSocket support
 */
async function startServer(): Promise<void> {
  try {
    // Configure middleware
    configureMiddleware(app);

    // Create HTTP server
    const server = new Server(app);

    // Initialize WebSocket server
    const wss = new WebSocketServer({ server });

    // Configure WebSocket server
    wss.on('connection', (ws, req) => {
      const clientId = req.headers['x-client-id'];
      
      logger.info('WebSocket connection established', {
        clientId,
        correlationId: req.headers['x-correlation-id']
      });

      // Set up heartbeat
      const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.ping();
        }
      }, 30000);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        clearInterval(pingInterval);
        logger.info('WebSocket connection closed', { clientId });
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', error, { clientId });
        ws.terminate();
      });
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(HttpStatusCode.OK).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0'
      });
    });

    // Start server
    server.listen(config.port, () => {
      logger.info('API Gateway started', {
        port: config.port,
        environment: config.env,
        version: process.env.API_VERSION || '1.0.0'
      });
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down API Gateway...');
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Close all WebSocket connections
      wss.clients.forEach((client) => {
        client.close();
      });

      // Wait for cleanup
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start API Gateway', error as Error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  logger.error('Fatal error starting API Gateway', error as Error);
  process.exit(1);
});

export default app;