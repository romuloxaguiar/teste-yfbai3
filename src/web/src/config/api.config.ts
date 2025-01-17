/**
 * @fileoverview API configuration for web client communication with backend services
 * @version 1.0.0
 */

import { AxiosRequestConfig } from 'axios'; // ^1.4.0
import CircuitBreaker from 'opossum'; // ^6.0.0
import { v4 as uuidv4 } from 'uuid';

import {
  API_VERSION,
  API_ENDPOINTS,
  REQUEST_TIMEOUT,
  MAX_RETRY_ATTEMPTS,
  DEFAULT_HEADERS,
  SECURITY_HEADERS,
  CIRCUIT_BREAKER_CONFIG,
  CACHE_CONFIG,
  RETRYABLE_ERROR_CODES
} from '../constants/api.constants';
import { CircuitBreakerConfig } from '../types/api.types';
import { RetryStrategy } from '../types/api.types';
import { isApiError } from '../types/api.types';

// Validate required environment variable
if (!process.env.VITE_API_BASE_URL) {
  throw new Error('API base URL environment variable is not defined');
}

/**
 * Enhanced security configuration for API requests
 */
const securityConfig = {
  headers: {
    ...SECURITY_HEADERS,
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  },
  validateStatus: (status: number) => status >= 200 && status < 300
};

/**
 * Enhanced monitoring configuration for API requests
 */
const monitoringConfig = {
  enableMetrics: true,
  metricsPrefix: 'api_client',
  enableTracing: true,
  sampleRate: 0.1,
  performanceTracking: true
};

/**
 * Creates a fully qualified API URL with validation
 * @param endpoint - API endpoint path
 * @returns Complete API URL
 * @throws Error if endpoint is invalid
 */
export const createApiUrl = (endpoint: string): string => {
  if (!endpoint || typeof endpoint !== 'string') {
    throw new Error('Invalid endpoint provided');
  }

  // Sanitize endpoint path
  const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Construct and validate URL
  const url = new URL(
    `${process.env.VITE_API_BASE_URL}/${API_VERSION}${sanitizedEndpoint}`
  );
  
  if (!url.protocol.startsWith('https')) {
    throw new Error('API URL must use HTTPS protocol');
  }
  
  return url.toString();
};

/**
 * Generates enhanced request configuration with security and monitoring
 * @param overrides - Optional request configuration overrides
 * @returns Enhanced request configuration
 */
export const getRequestConfig = (
  overrides: Partial<AxiosRequestConfig> = {}
): AxiosRequestConfig => {
  const correlationId = uuidv4();
  
  const config: AxiosRequestConfig = {
    timeout: REQUEST_TIMEOUT,
    headers: {
      ...DEFAULT_HEADERS,
      ...securityConfig.headers,
      'X-Correlation-ID': correlationId,
      'X-Request-ID': uuidv4()
    },
    validateStatus: securityConfig.validateStatus,
    // Retry configuration
    retry: {
      attempts: MAX_RETRY_ATTEMPTS,
      strategy: RetryStrategy.EXPONENTIAL,
      retryableErrors: RETRYABLE_ERROR_CODES,
      delay: 1000
    },
    // Monitoring configuration
    monitoring: {
      ...monitoringConfig,
      correlationId
    },
    // Cache configuration
    cache: {
      ...CACHE_CONFIG,
      key: (config: AxiosRequestConfig) => 
        `${config.method}:${config.url}:${JSON.stringify(config.params)}`
    },
    ...overrides
  };

  // Add authentication if available
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers!.Authorization = `Bearer ${token}`;
  }

  return config;
};

/**
 * Configures circuit breaker pattern for API requests
 * @param config - Circuit breaker configuration
 * @returns Configured circuit breaker instance
 */
export const configureCircuitBreaker = (
  config: CircuitBreakerConfig = CIRCUIT_BREAKER_CONFIG
): CircuitBreaker => {
  const breaker = new CircuitBreaker(async (request: Promise<any>) => {
    try {
      return await request;
    } catch (error) {
      if (isApiError(error)) {
        throw error;
      }
      throw new Error('Circuit breaker: request failed');
    }
  }, {
    timeout: config.timeout,
    errorThresholdPercentage: config.errorThresholdPercentage,
    resetTimeout: config.resetTimeout,
    rollingCountTimeout: config.rollingCountTimeout
  });

  // Configure event handlers
  breaker.on('open', () => {
    console.warn('Circuit breaker opened - API requests suspended');
  });

  breaker.on('halfOpen', () => {
    console.info('Circuit breaker half-open - testing API availability');
  });

  breaker.on('close', () => {
    console.info('Circuit breaker closed - API requests resumed');
  });

  return breaker;
};

/**
 * Exported API configuration object
 */
export const apiConfig = {
  baseURL: process.env.VITE_API_BASE_URL,
  version: API_VERSION,
  endpoints: API_ENDPOINTS,
  defaultConfig: getRequestConfig(),
  security: securityConfig,
  monitoring: monitoringConfig,
  circuitBreaker: configureCircuitBreaker(),
  createUrl: createApiUrl,
  getRequestConfig
};

export default apiConfig;