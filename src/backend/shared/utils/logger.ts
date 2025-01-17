/**
 * @fileoverview Enterprise-grade logging utility with Azure Application Insights integration
 * @version 1.0.0
 */

import winston from 'winston'; // ^3.8.0
import * as applicationinsights from 'applicationinsights'; // ^2.5.0
import { ErrorCode } from '../constants/error-codes';

// Global logging configuration
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4
};

const DEFAULT_LOG_LEVEL = 'info';
const MAX_LOG_SIZE = 10485760; // 10MB
const LOG_RETENTION_DAYS = 30;

/**
 * Logger configuration options interface
 */
interface LoggerOptions {
  serviceName: string;
  environment: string;
  logLevel?: string;
  appInsightsKey?: string;
  logFilePath?: string;
  correlationId?: string;
}

/**
 * Log metadata interface for structured logging
 */
interface LogMetadata {
  correlationId?: string;
  timestamp?: string;
  serviceName?: string;
  environment?: string;
  [key: string]: any;
}

/**
 * Enterprise logging class with comprehensive monitoring capabilities
 */
export class Logger {
  private winston: winston.Logger;
  private appInsights?: applicationinsights.TelemetryClient;
  private options: LoggerOptions;

  constructor(options: LoggerOptions) {
    this.options = {
      logLevel: DEFAULT_LOG_LEVEL,
      ...options
    };

    // Initialize Application Insights if key is provided
    if (this.options.appInsightsKey) {
      applicationinsights.setup(this.options.appInsightsKey)
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true)
        .setUseDiskRetryCaching(true)
        .start();

      this.appInsights = applicationinsights.defaultClient;
    }

    // Configure Winston logger
    this.winston = winston.createLogger({
      levels: LOG_LEVELS,
      level: this.options.logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: this.configureTransports()
    });
  }

  /**
   * Configure logging transports based on environment and options
   */
  private configureTransports(): winston.transport[] {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ];

    // Add file transport if path is specified
    if (this.options.logFilePath) {
      transports.push(
        new winston.transports.File({
          filename: this.options.logFilePath,
          maxsize: MAX_LOG_SIZE,
          maxFiles: LOG_RETENTION_DAYS,
          tailable: true,
          format: winston.format.json()
        })
      );
    }

    return transports;
  }

  /**
   * Format log message with metadata and context
   */
  private formatLogMessage(message: string, metadata: LogMetadata = {}): LogMetadata {
    return {
      message,
      timestamp: new Date().toISOString(),
      correlationId: this.options.correlationId || metadata.correlationId,
      serviceName: this.options.serviceName,
      environment: this.options.environment,
      ...metadata
    };
  }

  /**
   * Log error messages with full context and tracking
   */
  public error(message: string, error?: Error, metadata: LogMetadata = {}): void {
    const formattedMetadata = this.formatLogMessage(message, {
      ...metadata,
      errorCode: error?.name || ErrorCode.INTERNAL_SERVER_ERROR,
      errorMessage: error?.message,
      stackTrace: error?.stack
    });

    this.winston.error(message, formattedMetadata);

    if (this.appInsights) {
      this.appInsights.trackException({
        exception: error || new Error(message),
        properties: formattedMetadata
      });
    }
  }

  /**
   * Log warning messages with context
   */
  public warn(message: string, metadata: LogMetadata = {}): void {
    const formattedMetadata = this.formatLogMessage(message, metadata);
    this.winston.warn(message, formattedMetadata);

    if (this.appInsights) {
      this.appInsights.trackTrace({
        message,
        severity: applicationinsights.Contracts.SeverityLevel.Warning,
        properties: formattedMetadata
      });
    }
  }

  /**
   * Log informational messages
   */
  public info(message: string, metadata: LogMetadata = {}): void {
    const formattedMetadata = this.formatLogMessage(message, metadata);
    this.winston.info(message, formattedMetadata);

    if (this.appInsights) {
      this.appInsights.trackTrace({
        message,
        severity: applicationinsights.Contracts.SeverityLevel.Information,
        properties: formattedMetadata
      });
    }
  }

  /**
   * Log debug messages with detailed context
   */
  public debug(message: string, metadata: LogMetadata = {}): void {
    const formattedMetadata = this.formatLogMessage(message, metadata);
    this.winston.debug(message, formattedMetadata);

    if (this.appInsights) {
      this.appInsights.trackTrace({
        message,
        severity: applicationinsights.Contracts.SeverityLevel.Verbose,
        properties: formattedMetadata
      });
    }
  }
}

/**
 * Create a configured logger instance
 */
export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options);
}