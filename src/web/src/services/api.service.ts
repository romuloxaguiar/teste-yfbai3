/**
 * @fileoverview Enhanced API service for handling HTTP requests with security, monitoring, and error handling
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'; // ^1.4.0
import CircuitBreaker from 'opossum'; // ^6.0.0
import { ApplicationInsights } from '@microsoft/applicationinsights-web'; // ^2.8.0
import { v4 as uuidv4 } from 'uuid';

import { ApiResponse, ApiRequestOptions, isApiError } from '../types/api.types';
import { apiConfig } from '../config/api.config';
import { ErrorCode, ErrorSeverity } from '../../backend/shared/constants/error-codes';
import { 
  REQUEST_TIMEOUT, 
  RETRYABLE_ERROR_CODES, 
  SUCCESS_STATUS_CODES,
  CORRELATION_HEADER 
} from '../constants/api.constants';

/**
 * Enhanced API service class for handling HTTP communications with comprehensive
 * security, monitoring, and error handling capabilities.
 */
export class ApiService {
  private readonly axiosInstance: AxiosInstance;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly telemetryClient: ApplicationInsights;

  constructor() {
    // Initialize axios instance with enhanced configuration
    this.axiosInstance = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        ...apiConfig.defaultConfig.headers,
        ...apiConfig.security.headers
      },
      validateStatus: (status: number) => SUCCESS_STATUS_CODES.includes(status)
    });

    // Initialize circuit breaker
    this.circuitBreaker = apiConfig.circuitBreaker;

    // Initialize telemetry client
    this.telemetryClient = new ApplicationInsights({
      config: {
        instrumentationKey: process.env.VITE_APPINSIGHTS_KEY,
        enableAutoRouteTracking: true,
        enableRequestTracing: true
      }
    });
    this.telemetryClient.loadAppInsights();

    this.setupInterceptors();
  }

  /**
   * Configures request and response interceptors for enhanced functionality
   * @private
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const correlationId = uuidv4();
        config.headers[CORRELATION_HEADER] = correlationId;
        
        // Start request tracking
        this.telemetryClient.trackEvent({
          name: 'ApiRequest',
          properties: {
            url: config.url,
            method: config.method,
            correlationId
          }
        });

        return config;
      },
      (error) => {
        this.telemetryClient.trackException({ exception: error });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const correlationId = response.config.headers[CORRELATION_HEADER];
        
        // Track successful response
        this.telemetryClient.trackEvent({
          name: 'ApiResponse',
          properties: {
            status: response.status,
            correlationId,
            duration: response.duration
          }
        });

        return response;
      },
      (error: AxiosError) => {
        this.handleRequestError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Enhanced error handling with telemetry and logging
   * @private
   * @param error - Axios error object
   */
  private handleRequestError(error: AxiosError): void {
    const correlationId = error.config?.headers?.[CORRELATION_HEADER];
    
    this.telemetryClient.trackException({
      exception: error,
      properties: {
        correlationId,
        url: error.config?.url,
        status: error.response?.status,
        message: error.message
      },
      severityLevel: ErrorSeverity.ERROR
    });

    if (error.response?.status === 401) {
      // Handle authentication errors
      window.dispatchEvent(new CustomEvent('auth:required'));
    }
  }

  /**
   * Executes a GET request with enhanced error handling and monitoring
   * @template T - Expected response data type
   * @param endpoint - API endpoint path
   * @param options - Request configuration options
   * @returns Promise resolving to typed API response
   */
  public async get<T>(
    endpoint: string,
    options: Partial<ApiRequestOptions> = {}
  ): Promise<ApiResponse<T>> {
    const requestConfig = apiConfig.getRequestConfig({
      ...options,
      method: 'GET',
      url: apiConfig.createUrl(endpoint)
    });

    try {
      const response = await this.circuitBreaker.fire(() =>
        this.axiosInstance.get<ApiResponse<T>>(endpoint, requestConfig)
      );

      return this.processResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  /**
   * Processes successful API responses
   * @private
   * @template T - Expected response data type
   * @param response - Axios response object
   * @returns Processed API response
   */
  private processResponse<T>(response: AxiosResponse<ApiResponse<T>>): ApiResponse<T> {
    return {
      success: true,
      data: response.data.data,
      error: null,
      metadata: {
        correlationId: response.config.headers[CORRELATION_HEADER],
        timestamp: new Date(),
        duration: response.duration
      }
    };
  }

  /**
   * Handles and formats API errors
   * @private
   * @template T - Expected response data type
   * @param error - Error object
   * @returns Error response
   */
  private handleError<T>(error: unknown): ApiResponse<T> {
    if (isApiError(error)) {
      return {
        success: false,
        data: null as T,
        error: {
          code: error.code,
          message: error.message,
          severity: error.severity,
          timestamp: new Date(),
          details: error.details
        },
        metadata: {
          correlationId: error.correlationId,
          timestamp: new Date()
        }
      };
    }

    // Handle unexpected errors
    return {
      success: false,
      data: null as T,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        severity: ErrorSeverity.ERROR,
        timestamp: new Date(),
        details: { originalError: error }
      },
      metadata: {
        correlationId: uuidv4(),
        timestamp: new Date()
      }
    };
  }

  /**
   * Determines if an error should trigger a retry attempt
   * @private
   * @param error - Error to evaluate
   * @returns True if the error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!isApiError(error)) return false;
    return RETRYABLE_ERROR_CODES.includes(error.code);
  }
}

export default new ApiService();