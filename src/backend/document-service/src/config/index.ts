/**
 * @fileoverview Production configuration for document service
 * @version 1.0.0
 */

import { config as dotenvConfig } from 'dotenv'; // v16.3.1
import { z } from 'zod'; // v3.22.0
import type { Minutes } from '../../shared/types/minutes.types';
import { validateMinutes } from '../../shared/utils/validation';

// Load environment variables with security checks
dotenvConfig({ encoding: 'utf8' });

// Required environment variables
const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'STORAGE_CONNECTION_STRING',
  'API_KEY',
  'APP_INSIGHTS_KEY',
  'KEY_VAULT_URL',
  'REDIS_CONNECTION_STRING'
] as const;

// Configuration version for tracking
const CONFIG_VERSION = '1.0.0';
const DEFAULT_PORT = 3003;
const DEFAULT_HOST = '0.0.0.0';

// Zod schema for strong runtime validation
const CONFIG_SCHEMA = z.object({
  server: z.object({
    port: z.number().int().min(1).max(65535),
    host: z.string().ip(),
    cors: z.object({
      origin: z.array(z.string().url()),
      methods: z.array(z.string()),
      maxAge: z.number().int().positive(),
      credentials: z.boolean()
    }),
    rateLimit: z.object({
      windowMs: z.number().int().positive(),
      max: z.number().int().positive()
    }),
    security: z.object({
      trustProxy: z.boolean(),
      headers: z.object({
        contentSecurityPolicy: z.boolean(),
        xssProtection: z.boolean(),
        noSniff: z.boolean(),
        frameOptions: z.boolean()
      })
    })
  }),
  storage: z.object({
    connectionString: z.string().min(1),
    containerName: z.string().min(1),
    retryAttempts: z.number().int().min(1),
    retryDelay: z.number().int().min(100),
    timeout: z.number().int().min(1000),
    encryption: z.object({
      enabled: z.boolean(),
      keyVaultUrl: z.string().url()
    })
  }),
  templates: z.object({
    basePath: z.string().min(1),
    defaultTemplate: z.string().min(1),
    cacheEnabled: z.boolean(),
    cacheSize: z.number().int().positive(),
    warmup: z.boolean(),
    validation: z.object({
      enabled: z.boolean(),
      schema: z.any()
    })
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']),
    format: z.enum(['json', 'text']),
    outputPath: z.string().min(1),
    applicationInsights: z.object({
      enabled: z.boolean(),
      key: z.string().min(1)
    }),
    audit: z.object({
      enabled: z.boolean(),
      retention: z.number().int().positive()
    })
  }),
  monitoring: z.object({
    metrics: z.object({
      enabled: z.boolean(),
      interval: z.number().int().positive()
    }),
    healthCheck: z.object({
      enabled: z.boolean(),
      path: z.string().min(1)
    }),
    alerts: z.object({
      enabled: z.boolean(),
      endpoints: z.array(z.string().url())
    })
  }),
  performance: z.object({
    cache: z.object({
      ttl: z.number().int().positive(),
      checkPeriod: z.number().int().positive()
    }),
    compression: z.object({
      enabled: z.boolean(),
      level: z.number().int().min(1).max(9)
    }),
    timeout: z.object({
      request: z.number().int().positive(),
      operation: z.number().int().positive()
    })
  }),
  compliance: z.object({
    dataRetention: z.object({
      enabled: z.boolean(),
      days: z.number().int().positive()
    }),
    audit: z.object({
      enabled: z.boolean(),
      detailed: z.boolean()
    }),
    pii: z.object({
      enabled: z.boolean(),
      scanning: z.boolean()
    })
  })
});

// Configuration interface matching schema
export interface Config extends z.infer<typeof CONFIG_SCHEMA> {}

/**
 * Validates the configuration against schema and business rules
 * @param config Configuration object to validate
 * @returns true if valid, throws error if invalid
 */
const validateConfig = (config: Config): boolean => {
  try {
    CONFIG_SCHEMA.parse(config);

    // Validate required environment variables
    REQUIRED_ENV_VARS.forEach(envVar => {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    });

    // Additional business rule validations
    if (config.performance.cache.ttl > 86400000) { // 24 hours
      throw new Error('Cache TTL cannot exceed 24 hours');
    }

    if (config.compliance.dataRetention.days < 30) {
      throw new Error('Data retention period must be at least 30 days');
    }

    return true;
  } catch (error) {
    throw new Error(`Configuration validation failed: ${error.message}`);
  }
};

/**
 * Loads and validates the service configuration
 * @returns Validated configuration object
 */
const loadConfig = (): Config => {
  const config: Config = {
    server: {
      port: parseInt(process.env.PORT || DEFAULT_PORT.toString(), 10),
      host: process.env.HOST || DEFAULT_HOST,
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['https://api.teams.microsoft.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        maxAge: 3600,
        credentials: true
      },
      rateLimit: {
        windowMs: 60000, // 1 minute
        max: 100 // requests per window
      },
      security: {
        trustProxy: true,
        headers: {
          contentSecurityPolicy: true,
          xssProtection: true,
          noSniff: true,
          frameOptions: true
        }
      }
    },
    storage: {
      connectionString: process.env.STORAGE_CONNECTION_STRING!,
      containerName: 'minutes',
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      encryption: {
        enabled: true,
        keyVaultUrl: process.env.KEY_VAULT_URL!
      }
    },
    templates: {
      basePath: './templates',
      defaultTemplate: 'standard',
      cacheEnabled: true,
      cacheSize: 100,
      warmup: true,
      validation: {
        enabled: true,
        schema: validateMinutes
      }
    },
    logging: {
      level: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug',
      format: 'json',
      outputPath: './logs',
      applicationInsights: {
        enabled: true,
        key: process.env.APP_INSIGHTS_KEY!
      },
      audit: {
        enabled: true,
        retention: 90 // days
      }
    },
    monitoring: {
      metrics: {
        enabled: true,
        interval: 60000 // 1 minute
      },
      healthCheck: {
        enabled: true,
        path: '/health'
      },
      alerts: {
        enabled: true,
        endpoints: process.env.ALERT_ENDPOINTS?.split(',') || []
      }
    },
    performance: {
      cache: {
        ttl: 3600000, // 1 hour
        checkPeriod: 600000 // 10 minutes
      },
      compression: {
        enabled: true,
        level: 6
      },
      timeout: {
        request: 30000, // 30 seconds
        operation: 10000 // 10 seconds
      }
    },
    compliance: {
      dataRetention: {
        enabled: true,
        days: 90
      },
      audit: {
        enabled: true,
        detailed: true
      },
      pii: {
        enabled: true,
        scanning: true
      }
    }
  };

  validateConfig(config);
  return config;
};

// Export validated configuration
export const config = loadConfig();