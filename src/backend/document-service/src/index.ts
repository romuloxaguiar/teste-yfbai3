/**
 * @fileoverview Entry point for the document service that handles meeting minutes generation
 * @version 1.0.0
 */

import { NestFactory } from '@nestjs/core'; // v9.0.0
import { ValidationPipe } from '@nestjs/common'; // v9.0.0
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // v6.0.0
import helmet from 'helmet'; // v6.0.0
import compression from 'compression'; // v1.7.4
import rateLimit from 'express-rate-limit'; // v6.0.0
import { HealthModule } from '@nestjs/terminus'; // v9.0.0
import { config } from './config';

// Global constants
const PORT = config.server.port || 3003;
const HOST = config.server.host || '0.0.0.0';
const SHUTDOWN_TIMEOUT = 5000;

/**
 * Bootstrap the NestJS application with security and performance configurations
 */
async function bootstrap(): Promise<void> {
  try {
    // Create NestJS application instance
    const app = await NestFactory.create(HealthModule, {
      logger: ['error', 'warn', 'log'],
      cors: config.server.cors,
      bodyParser: true
    });

    // Apply security middleware
    app.use(helmet({
      contentSecurityPolicy: config.server.security.headers.contentSecurityPolicy,
      xssFilter: config.server.security.headers.xssProtection,
      noSniff: config.server.security.headers.noSniff,
      frameguard: config.server.security.headers.frameOptions
    }));

    // Configure CORS
    app.enableCors({
      origin: config.server.cors.origin,
      methods: config.server.cors.methods,
      credentials: config.server.cors.credentials,
      maxAge: config.server.cors.maxAge
    });

    // Setup request validation
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false
      },
      validateCustomDecorators: true
    }));

    // Apply rate limiting
    app.use(rateLimit({
      windowMs: config.server.rateLimit.windowMs,
      max: config.server.rateLimit.max,
      message: 'Too many requests from this IP, please try again later'
    }));

    // Enable response compression
    app.use(compression({
      level: config.performance.compression.level,
      threshold: 0
    }));

    // Setup Swagger documentation
    setupSwagger(app);

    // Configure graceful shutdown
    setupGracefulShutdown(app);

    // Start the server
    await app.listen(PORT, HOST);
    console.log(`Document service running on http://${HOST}:${PORT}`);

  } catch (error) {
    console.error('Failed to start document service:', error);
    process.exit(1);
  }
}

/**
 * Configure Swagger documentation
 * @param app NestJS application instance
 */
function setupSwagger(app: any): void {
  const options = new DocumentBuilder()
    .setTitle('Document Service API')
    .setDescription('API for meeting minutes generation and document management')
    .setVersion('1.0.0')
    .addTag('minutes', 'Meeting minutes operations')
    .addTag('documents', 'Document management operations')
    .addBearerAuth()
    .addApiKey()
    .addServer(`http://${HOST}:${PORT}`, 'Local development')
    .addServer('https://api.production.com', 'Production environment')
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha'
    }
  });
}

/**
 * Configure graceful shutdown handling
 * @param app NestJS application instance
 */
function setupGracefulShutdown(app: any): void {
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, starting graceful shutdown...`);

      // Start graceful shutdown
      setTimeout(() => {
        console.error('Forcefully terminating after timeout');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT);

      try {
        // Close NestJS application
        await app.close();
        console.log('Application shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  });
}

// Start the application
bootstrap().catch(error => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});