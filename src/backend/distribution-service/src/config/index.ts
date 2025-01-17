/**
 * @fileoverview Configuration module for the distribution service
 * @version 1.0.0
 */

import { createLogger } from '../../shared/utils/logger';
import { MinutesStatus } from '../../shared/types/minutes.types';
import * as dotenv from 'dotenv'; // ^16.0.0
import * as Joi from 'joi'; // ^17.6.0

// Load environment variables with security checks
dotenv.config();

// Global constants
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = 'distribution-service';

/**
 * Configuration validation schema with comprehensive security rules
 */
const configSchema = Joi.object({
  env: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .required(),
  
  serviceName: Joi.string().required(),
  
  port: Joi.number()
    .port()
    .default(3000),
  
  logLevel: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),

  email: Joi.object({
    graphApi: Joi.object({
      clientId: Joi.string().required(),
      clientSecret: Joi.string().required(),
      tenantId: Joi.string().required(),
      scope: Joi.string().required(),
      endpoint: Joi.string().uri().required()
    }),
    smtp: Joi.object({
      host: Joi.string().required(),
      port: Joi.number().port().required(),
      secure: Joi.boolean().default(true),
      auth: Joi.object({
        user: Joi.string().required(),
        pass: Joi.string().required()
      }),
      tls: Joi.object({
        minVersion: Joi.string().valid('TLSv1.2', 'TLSv1.3').default('TLSv1.2'),
        ciphers: Joi.string()
      })
    }),
    templates: Joi.object({
      minutesEmail: Joi.string().required(),
      reminderEmail: Joi.string().required()
    }),
    retryConfig: Joi.object({
      maxAttempts: Joi.number().min(1).max(5).default(3),
      initialDelay: Joi.number().min(1000).max(10000).default(2000),
      maxDelay: Joi.number().min(5000).max(30000).default(10000)
    })
  }).required(),

  teams: Joi.object({
    notificationEndpoint: Joi.string().uri().required(),
    apiVersion: Joi.string().required(),
    webhookUrl: Joi.string().uri().required(),
    retryConfig: Joi.object({
      maxAttempts: Joi.number().min(1).max(5).default(3),
      initialDelay: Joi.number().min(1000).max(10000).default(2000)
    })
  }).required(),

  redis: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().port().required(),
    password: Joi.string().required(),
    tls: Joi.boolean().default(true),
    db: Joi.number().min(0).max(15).default(0),
    keyPrefix: Joi.string().default('dist:'),
    connectTimeout: Joi.number().default(5000)
  }).required(),

  azure: Joi.object({
    appInsights: Joi.object({
      instrumentationKey: Joi.string().required(),
      cloudRole: Joi.string().default(SERVICE_NAME)
    }),
    keyVault: Joi.object({
      name: Joi.string().required(),
      tenantId: Joi.string().required(),
      clientId: Joi.string().required(),
      clientSecret: Joi.string().required()
    })
  }).required(),

  retry: Joi.object({
    distribution: Joi.object({
      maxAttempts: Joi.number().min(1).max(10).default(3),
      backoff: Joi.object({
        type: Joi.string().valid('exponential', 'linear').default('exponential'),
        initialDelay: Joi.number().min(1000).max(10000).default(2000)
      })
    }),
    notification: Joi.object({
      maxAttempts: Joi.number().min(1).max(5).default(3),
      timeout: Joi.number().min(5000).max(30000).default(10000)
    })
  }).required(),

  security: Joi.object({
    rateLimiting: Joi.object({
      windowMs: Joi.number().default(60000),
      max: Joi.number().default(100)
    }),
    cors: Joi.object({
      allowedOrigins: Joi.array().items(Joi.string()).default([]),
      allowedMethods: Joi.array().items(Joi.string()).default(['GET', 'POST']),
      maxAge: Joi.number().default(86400)
    }),
    helmet: Joi.object({
      hsts: Joi.boolean().default(true),
      noSniff: Joi.boolean().default(true),
      xssFilter: Joi.boolean().default(true)
    })
  }).required()
}).required();

/**
 * Validates the loaded configuration using comprehensive Joi schema
 */
function validateConfig(config: Record<string, any>): Record<string, any> {
  const { error, value } = configSchema.validate(config, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new Error(`Configuration validation error: ${error.message}`);
  }

  return value;
}

/**
 * Loads and validates service configuration with enhanced security
 */
function loadConfig(): Record<string, any> {
  const config = {
    env: NODE_ENV,
    serviceName: SERVICE_NAME,
    port: parseInt(process.env.PORT || '3000', 10),
    logLevel: process.env.LOG_LEVEL || 'info',

    email: {
      graphApi: {
        clientId: process.env.GRAPH_CLIENT_ID,
        clientSecret: process.env.GRAPH_CLIENT_SECRET,
        tenantId: process.env.GRAPH_TENANT_ID,
        scope: process.env.GRAPH_SCOPE || 'https://graph.microsoft.com/.default',
        endpoint: process.env.GRAPH_ENDPOINT || 'https://graph.microsoft.com/v1.0'
      },
      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          minVersion: 'TLSv1.2',
          ciphers: 'HIGH:!aNULL:!MD5'
        }
      },
      templates: {
        minutesEmail: process.env.MINUTES_EMAIL_TEMPLATE,
        reminderEmail: process.env.REMINDER_EMAIL_TEMPLATE
      },
      retryConfig: {
        maxAttempts: 3,
        initialDelay: 2000,
        maxDelay: 10000
      }
    },

    teams: {
      notificationEndpoint: process.env.TEAMS_NOTIFICATION_ENDPOINT,
      apiVersion: process.env.TEAMS_API_VERSION || '1.0',
      webhookUrl: process.env.TEAMS_WEBHOOK_URL,
      retryConfig: {
        maxAttempts: 3,
        initialDelay: 2000
      }
    },

    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === 'true',
      db: parseInt(process.env.REDIS_DB || '0', 10),
      keyPrefix: 'dist:',
      connectTimeout: 5000
    },

    azure: {
      appInsights: {
        instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
        cloudRole: SERVICE_NAME
      },
      keyVault: {
        name: process.env.KEYVAULT_NAME,
        tenantId: process.env.KEYVAULT_TENANT_ID,
        clientId: process.env.KEYVAULT_CLIENT_ID,
        clientSecret: process.env.KEYVAULT_CLIENT_SECRET
      }
    },

    retry: {
      distribution: {
        maxAttempts: 3,
        backoff: {
          type: 'exponential',
          initialDelay: 2000
        }
      },
      notification: {
        maxAttempts: 3,
        timeout: 10000
      }
    },

    security: {
      rateLimiting: {
        windowMs: 60000,
        max: 100
      },
      cors: {
        allowedOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
        allowedMethods: ['GET', 'POST'],
        maxAge: 86400
      },
      helmet: {
        hsts: true,
        noSniff: true,
        xssFilter: true
      }
    }
  };

  // Validate configuration
  const validatedConfig = validateConfig(config);

  // Initialize logger
  const logger = createLogger({
    serviceName: validatedConfig.serviceName,
    environment: validatedConfig.env,
    logLevel: validatedConfig.logLevel,
    appInsightsKey: validatedConfig.azure.appInsights.instrumentationKey
  });

  // Freeze configuration to prevent modifications
  return Object.freeze(validatedConfig);
}

// Export immutable configuration
export const config = loadConfig();