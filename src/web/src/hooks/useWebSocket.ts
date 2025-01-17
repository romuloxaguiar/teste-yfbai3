/**
 * @fileoverview Enhanced React hook for managing secure WebSocket connections with monitoring and error handling
 * @version 1.0.0
 */

import { useEffect, useCallback, useState } from 'react';
import {
  WebSocketService,
  WebSocketMessageType
} from '../services/websocket.service';

/**
 * Connection state enum for detailed status tracking
 */
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/**
 * Enhanced WebSocket error interface with monitoring context
 */
interface WebSocketError {
  code: string;
  message: string;
  timestamp: number;
  correlationId: string;
  details?: Record<string, unknown>;
}

/**
 * Connection metrics for monitoring and debugging
 */
interface ConnectionMetrics {
  connectAttempts: number;
  messageCount: number;
  lastMessageTime: number | null;
  averageLatency: number;
  errorCount: number;
  reconnections: number;
}

/**
 * Retry configuration interface
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  jitter: true
};

/**
 * Enhanced WebSocket hook with comprehensive security and monitoring
 * @param messageType - Type of WebSocket messages to handle
 * @param onMessage - Callback function for message handling
 * @param autoConnect - Whether to connect automatically on mount
 * @param retryConfig - Custom retry configuration
 */
export const useWebSocket = (
  messageType: WebSocketMessageType,
  onMessage: (data: any) => void,
  autoConnect: boolean = true,
  retryConfig: Partial<RetryConfig> = {}
) => {
  // Initialize WebSocket service instance
  const [wsService] = useState(() => new WebSocketService());
  
  // Connection state management
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );
  const [error, setError] = useState<WebSocketError | null>(null);
  
  // Connection metrics tracking
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    connectAttempts: 0,
    messageCount: 0,
    lastMessageTime: null,
    averageLatency: 0,
    errorCount: 0,
    reconnections: 0
  });

  // Merge retry configuration with defaults
  const finalRetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

  /**
   * Enhanced message handler with validation and metrics
   */
  const handleMessage = useCallback((data: any) => {
    try {
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        messageCount: prev.messageCount + 1,
        lastMessageTime: Date.now(),
        averageLatency: calculateAverageLatency(prev, Date.now())
      }));

      // Execute callback
      onMessage(data);
    } catch (err) {
      handleError('MESSAGE_PROCESSING_ERROR', 'Failed to process message', err);
    }
  }, [onMessage]);

  /**
   * Establishes WebSocket connection with retry logic
   */
  const connect = useCallback(async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      setMetrics(prev => ({
        ...prev,
        connectAttempts: prev.connectAttempts + 1
      }));

      await wsService.connect();
      wsService.subscribe(messageType, handleMessage);
      
      setConnectionState(ConnectionState.CONNECTED);
      setError(null);
    } catch (err) {
      handleError('CONNECTION_ERROR', 'Failed to establish connection', err);
      await handleRetry();
    }
  }, [messageType, handleMessage, wsService]);

  /**
   * Implements retry logic with exponential backoff
   */
  const handleRetry = async () => {
    const { connectAttempts } = metrics;
    if (connectAttempts >= finalRetryConfig.maxAttempts) {
      setConnectionState(ConnectionState.ERROR);
      return;
    }

    setConnectionState(ConnectionState.RECONNECTING);
    const delay = calculateRetryDelay(connectAttempts, finalRetryConfig);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    connect();
  };

  /**
   * Safely disconnects WebSocket with cleanup
   */
  const disconnect = useCallback(() => {
    wsService.unsubscribe(messageType, handleMessage);
    wsService.disconnect();
    setConnectionState(ConnectionState.DISCONNECTED);
  }, [messageType, handleMessage, wsService]);

  /**
   * Handles errors with monitoring and reporting
   */
  const handleError = (code: string, message: string, error: any) => {
    const wsError: WebSocketError = {
      code,
      message,
      timestamp: Date.now(),
      correlationId: crypto.randomUUID(),
      details: error instanceof Error ? { stack: error.stack } : undefined
    };

    setError(wsError);
    setMetrics(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1
    }));

    // Log error for monitoring
    console.error('WebSocket error:', wsError);
  };

  /**
   * Calculates retry delay with exponential backoff and optional jitter
   */
  const calculateRetryDelay = (attempt: number, config: RetryConfig): number => {
    const exponentialDelay = Math.min(
      config.baseDelay * Math.pow(2, attempt),
      config.maxDelay
    );

    if (!config.jitter) {
      return exponentialDelay;
    }

    // Add random jitter between 0-100ms
    return exponentialDelay + Math.random() * 100;
  };

  /**
   * Calculates average message latency
   */
  const calculateAverageLatency = (
    prevMetrics: ConnectionMetrics,
    currentTime: number
  ): number => {
    if (!prevMetrics.lastMessageTime) {
      return 0;
    }

    const latency = currentTime - prevMetrics.lastMessageTime;
    return (
      (prevMetrics.averageLatency * prevMetrics.messageCount + latency) /
      (prevMetrics.messageCount + 1)
    );
  };

  /**
   * Effect for auto-connection and cleanup
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected: connectionState === ConnectionState.CONNECTED,
    connectionState,
    connect,
    disconnect,
    error,
    metrics
  };
};

export default useWebSocket;