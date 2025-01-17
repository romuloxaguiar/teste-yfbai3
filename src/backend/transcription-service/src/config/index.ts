/**
 * @fileoverview Configuration management for the transcription service
 * @version 1.0.0
 */

import { config as dotenvConfig } from 'dotenv'; // ^16.0.0
import { join } from 'path';
import { TranscriptionStatus } from '../../shared/types/transcription.types';
import { ErrorCode } from '../../shared/constants/error-codes';

// Load environment variables from .env file
dotenvConfig({ path: join(__dirname, '../../../.env') });

/**
 * Server configuration interface
 */
interface ServerConfig {
  readonly port: number;
  readonly host: string;
  readonly cors: {
    readonly origin: string[];
    readonly methods: string[];
    readonly credentials: boolean;
  };
  readonly ssl: {
    readonly enabled: boolean;
    readonly key?: string;
    readonly cert?: string;
  };
}

/**
 * Database configuration interface
 */
interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly name: string;
  readonly user: string;
  readonly password: string;
  readonly poolSize: number;
  readonly retentionDays: number;
  readonly partitioningStrategy: 'time-based' | 'hash';
  readonly ssl: boolean;
  readonly connectionTimeout: number;
}

/**
 * Teams API configuration interface
 */
interface TeamsConfig {
  readonly apiEndpoint: string;
  readonly apiVersion: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly tenantId: string;
  readonly scope: string[];
  readonly webhookEndpoint: string;
  readonly retryStrategy: {
    readonly maxRetries: number;
    readonly baseDelay: number;
    readonly maxDelay: number;
  };
}

/**
 * Processing configuration interface
 */
interface ProcessingConfig {
  readonly chunkSize: number;
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly timeout: number;
  readonly noiseReductionLevel: number;
  readonly confidenceThreshold: number;
  readonly maxConcurrentProcessing: number;
  readonly retentionPeriod: number;
  readonly processingStatuses: readonly TranscriptionStatus[];
  readonly errorCodes: readonly ErrorCode[];
}

/**
 * Monitoring configuration interface
 */
interface MonitoringConfig {
  readonly metricsEnabled: boolean;
  readonly logLevel: 'error' | 'warn' | 'info' | 'debug';
  readonly tracingEnabled: boolean;
  readonly alertThresholds: {
    readonly errorRate: number;
    readonly processingTime: number;
    readonly queueSize: number;
  };
}

/**
 * Complete configuration interface
 */
interface Config {
  readonly server: ServerConfig;
  readonly database: DatabaseConfig;
  readonly teams: TeamsConfig;
  readonly processing: ProcessingConfig;
  readonly monitoring: MonitoringConfig;
}

/**
 * Configuration validation error
 */
class ConfigValidationError extends Error {
  constructor(message: string) {
    super(`Configuration validation failed: ${message}`);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validates the configuration object
 */
function validateConfig(config: Record<string, any>): boolean {
  if (!config.server?.port || !config.server?.host) {
    throw new ConfigValidationError('Server configuration is incomplete');
  }

  if (!config.database?.host || !config.database?.name) {
    throw new ConfigValidationError('Database configuration is incomplete');
  }

  if (!config.teams?.clientId || !config.teams?.clientSecret) {
    throw new ConfigValidationError('Teams API configuration is incomplete');
  }

  if (!config.processing?.chunkSize || !config.processing?.maxRetries) {
    throw new ConfigValidationError('Processing configuration is incomplete');
  }

  return true;
}

/**
 * Configuration object with default values and environment variable overrides
 */
export const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    },
    ssl: {
      enabled: process.env.SSL_ENABLED === 'true',
      key: process.env.SSL_KEY_PATH,
      cert: process.env.SSL_CERT_PATH
    }
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'transcription_service',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    retentionDays: parseInt(process.env.DB_RETENTION_DAYS || '90', 10),
    partitioningStrategy: (process.env.DB_PARTITIONING_STRATEGY || 'time-based') as 'time-based' | 'hash',
    ssl: process.env.DB_SSL === 'true',
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10)
  },
  teams: {
    apiEndpoint: process.env.TEAMS_API_ENDPOINT || 'https://graph.microsoft.com',
    apiVersion: process.env.TEAMS_API_VERSION || 'v1.0',
    clientId: process.env.TEAMS_CLIENT_ID || '',
    clientSecret: process.env.TEAMS_CLIENT_SECRET || '',
    tenantId: process.env.TEAMS_TENANT_ID || '',
    scope: process.env.TEAMS_SCOPE?.split(',') || ['https://graph.microsoft.com/.default'],
    webhookEndpoint: process.env.TEAMS_WEBHOOK_ENDPOINT || '',
    retryStrategy: {
      maxRetries: parseInt(process.env.TEAMS_MAX_RETRIES || '3', 10),
      baseDelay: parseInt(process.env.TEAMS_RETRY_BASE_DELAY || '1000', 10),
      maxDelay: parseInt(process.env.TEAMS_RETRY_MAX_DELAY || '5000', 10)
    }
  },
  processing: {
    chunkSize: parseInt(process.env.PROCESSING_CHUNK_SIZE || '4096', 10),
    maxRetries: parseInt(process.env.PROCESSING_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.PROCESSING_RETRY_DELAY || '1000', 10),
    timeout: parseInt(process.env.PROCESSING_TIMEOUT || '30000', 10),
    noiseReductionLevel: parseInt(process.env.NOISE_REDUCTION_LEVEL || '50', 10),
    confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.8'),
    maxConcurrentProcessing: parseInt(process.env.MAX_CONCURRENT_PROCESSING || '5', 10),
    retentionPeriod: parseInt(process.env.RETENTION_PERIOD || '90', 10),
    processingStatuses: [TranscriptionStatus.PROCESSING, TranscriptionStatus.COMPLETED],
    errorCodes: [ErrorCode.TEAMS_API_ERROR, ErrorCode.AI_PROCESSING_ERROR]
  },
  monitoring: {
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    logLevel: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug',
    tracingEnabled: process.env.TRACING_ENABLED === 'true',
    alertThresholds: {
      errorRate: parseFloat(process.env.ALERT_ERROR_RATE || '0.05'),
      processingTime: parseInt(process.env.ALERT_PROCESSING_TIME || '30000', 10),
      queueSize: parseInt(process.env.ALERT_QUEUE_SIZE || '100', 10)
    }
  }
};

// Validate configuration on load
validateConfig(config);

export default config;