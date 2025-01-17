/**
 * @fileoverview Central configuration for API Gateway with security, monitoring, and service settings
 * @version 1.0.0
 */

import { config as dotenvConfig } from 'dotenv'; // ^16.0.0
import { Configuration } from '@azure/msal-node'; // ^2.0.0
import { ErrorCode } from '../../shared/constants/error-codes';
import { HttpStatusCode } from '../../shared/constants/status-codes';
import { Logger } from '../../shared/utils/logger';

// Load environment variables
dotenvConfig();

// Initialize logger for configuration validation
const logger = new Logger({
  serviceName: 'api-gateway',
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  appInsightsKey: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
});

/**
 * Service endpoint configuration with health check and retry policies
 */
interface ServiceConfig {
  url: string;
  healthCheck: string;
  timeout: number;
  retryPolicy: {
    attempts: number;
    backoff: number;
  };
}

/**
 * Rate limiting configuration with burst allowance
 */
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  burstAllowance: number;
  clientIdentifier: string;
  headers: {
    remaining: string;
    reset: string;
    total: string;
  };
}

/**
 * Monitoring configuration with alert thresholds
 */
interface MonitoringConfig {
  metricsEnabled: boolean;
  alertThresholds: {
    errorRate: number;
    latency: number;
    requestRate: number;
  };
}

/**
 * Complete API Gateway configuration interface
 */
interface Config {
  env: string;
  port: number;
  logLevel: string;
  auth: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    authority: string;
    tokenValidation: {
      validIssuers: string[];
      validAudiences: string[];
      clockSkew: number;
    };
  };
  services: {
    transcription: ServiceConfig;
    aiEngine: ServiceConfig;
    document: ServiceConfig;
    distribution: ServiceConfig;
  };
  rateLimit: RateLimitConfig;
  monitoring: MonitoringConfig;
}

/**
 * Loads and validates the configuration with enhanced security and monitoring settings
 */
export function loadConfig(): Config {
  try {
    // Construct Azure AD authority URL
    const authority = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`;

    // Validate required authentication parameters
    if (!process.env.AZURE_CLIENT_ID || !process.env.AZURE_CLIENT_SECRET) {
      throw new Error('Missing required Azure AD credentials');
    }

    const config: Config = {
      env: process.env.NODE_ENV || 'development',
      port: Number(process.env.PORT) || 3000,
      logLevel: process.env.LOG_LEVEL || 'info',
      
      // Authentication configuration
      auth: {
        tenantId: process.env.AZURE_TENANT_ID!,
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
        authority,
        tokenValidation: {
          validIssuers: [authority],
          validAudiences: [process.env.AZURE_CLIENT_ID!],
          clockSkew: 300 // 5 minutes in seconds
        }
      },

      // Microservice endpoints configuration
      services: {
        transcription: {
          url: process.env.TRANSCRIPTION_SERVICE_URL || 'http://transcription-service:8080',
          healthCheck: '/health',
          timeout: 30000, // 30 seconds
          retryPolicy: {
            attempts: 3,
            backoff: 300 // 300ms
          }
        },
        aiEngine: {
          url: process.env.AI_ENGINE_SERVICE_URL || 'http://ai-engine-service:8081',
          healthCheck: '/health',
          timeout: 60000, // 60 seconds
          retryPolicy: {
            attempts: 3,
            backoff: 500 // 500ms
          }
        },
        document: {
          url: process.env.DOCUMENT_SERVICE_URL || 'http://document-service:8082',
          healthCheck: '/health',
          timeout: 45000, // 45 seconds
          retryPolicy: {
            attempts: 3,
            backoff: 300 // 300ms
          }
        },
        distribution: {
          url: process.env.DISTRIBUTION_SERVICE_URL || 'http://distribution-service:8083',
          healthCheck: '/health',
          timeout: 30000, // 30 seconds
          retryPolicy: {
            attempts: 3,
            backoff: 300 // 300ms
          }
        }
      },

      // Rate limiting configuration
      rateLimit: {
        windowMs: 60000, // 1 minute
        maxRequests: 1000, // 1000 requests per minute
        burstAllowance: 200, // 20% burst allowance
        clientIdentifier: 'client-id',
        headers: {
          remaining: 'X-RateLimit-Remaining',
          reset: 'X-RateLimit-Reset',
          total: 'X-RateLimit-Total'
        }
      },

      // Monitoring configuration
      monitoring: {
        metricsEnabled: true,
        alertThresholds: {
          errorRate: 5, // 5% error rate threshold
          latency: 1000, // 1 second latency threshold
          requestRate: 800 // 80% of rate limit
        }
      }
    };

    // Validate configuration
    validateConfig(config);
    
    logger.info('API Gateway configuration loaded successfully');
    return config;
  } catch (error) {
    logger.error('Failed to load API Gateway configuration', error as Error);
    throw error;
  }
}

/**
 * Validates the configuration object
 */
function validateConfig(config: Config): void {
  // Validate port number
  if (config.port <= 0 || config.port > 65535) {
    throw new Error('Invalid port number');
  }

  // Validate service URLs
  Object.entries(config.services).forEach(([service, config]) => {
    try {
      new URL(config.url);
    } catch {
      throw new Error(`Invalid URL for service: ${service}`);
    }
  });

  // Validate rate limit settings
  if (config.rateLimit.windowMs <= 0 || config.rateLimit.maxRequests <= 0) {
    throw new Error('Invalid rate limit configuration');
  }

  // Validate monitoring thresholds
  if (config.monitoring.alertThresholds.errorRate < 0 || 
      config.monitoring.alertThresholds.errorRate > 100) {
    throw new Error('Invalid error rate threshold');
  }
}

// Export the loaded configuration
export const config = loadConfig();