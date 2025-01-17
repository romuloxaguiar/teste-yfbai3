/**
 * @fileoverview WebSocket service implementation for real-time communication
 * @version 1.0.0
 */

import ReconnectingWebSocket from 'reconnecting-websocket'; // ^4.4.0
import { createApiUrl } from '../config/api.config';
import { WebSocketMessage, WebSocketMessageType } from '../types/api.types';

// Constants for WebSocket configuration
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 5000;
const MAX_MESSAGE_SIZE = 1048576; // 1MB

/**
 * Enhanced WebSocket service for managing real-time communication
 * with comprehensive security, monitoring, and error handling
 */
export class WebSocketService {
  private socket: ReconnectingWebSocket | null = null;
  private subscribers: Map<WebSocketMessageType, Set<Function>>;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private messageMetrics: Map<string, number>;

  constructor() {
    this.subscribers = new Map();
    this.messageMetrics = new Map();
    Object.values(WebSocketMessageType).forEach(type => {
      this.subscribers.set(type, new Set());
    });
  }

  /**
   * Establishes secure WebSocket connection with comprehensive monitoring
   * @throws Error if connection cannot be established
   */
  public async connect(): Promise<void> {
    try {
      const wsUrl = createApiUrl('ws/meetings').replace('http', 'ws');
      const token = localStorage.getItem('auth_token');

      this.socket = new ReconnectingWebSocket(wsUrl, [], {
        maxRetries: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelayGrowFactor: 1.5,
        maxReconnectionDelay: RECONNECT_INTERVAL,
        minReconnectionDelay: 1000,
        connectionTimeout: CONNECTION_TIMEOUT,
        maxEnqueuedMessages: 100,
        debug: process.env.NODE_ENV === 'development',
        maxMessageSize: MAX_MESSAGE_SIZE,
        WebSocket: WebSocket
      });

      // Add authentication headers
      if (token) {
        this.socket.addListener('beforeConnect', () => {
          if (this.socket) {
            this.socket.url = `${wsUrl}?token=${token}`;
          }
        });
      }

      // Set up event listeners
      this.socket.addEventListener('open', this.handleOpen.bind(this));
      this.socket.addEventListener('close', this.handleClose.bind(this));
      this.socket.addEventListener('message', this.handleMessage.bind(this));
      this.socket.addEventListener('error', this.handleError.bind(this));

      // Initialize health monitoring
      this.startHealthMonitoring();

      // Wait for connection or timeout
      await this.waitForConnection();

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      throw new Error('Failed to establish WebSocket connection');
    }
  }

  /**
   * Safely closes WebSocket connection with cleanup
   */
  public disconnect(): void {
    this.stopHealthMonitoring();
    if (this.socket) {
      this.socket.close(1000, 'Client disconnecting');
      this.socket = null;
    }
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.messageMetrics.clear();
  }

  /**
   * Subscribes to specific message types with validation
   * @param messageType - Type of messages to subscribe to
   * @param callback - Callback function for handling messages
   */
  public subscribe(messageType: WebSocketMessageType, callback: Function): void {
    if (!Object.values(WebSocketMessageType).includes(messageType)) {
      throw new Error('Invalid message type');
    }

    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    const subscribers = this.subscribers.get(messageType);
    if (subscribers) {
      subscribers.add(callback);
      this.updateMetrics('subscription_count', 1);
    }
  }

  /**
   * Unsubscribes from specific message types
   * @param messageType - Type of messages to unsubscribe from
   * @param callback - Callback function to remove
   */
  public unsubscribe(messageType: WebSocketMessageType, callback: Function): void {
    const subscribers = this.subscribers.get(messageType);
    if (subscribers) {
      subscribers.delete(callback);
      this.updateMetrics('subscription_count', -1);
    }
  }

  /**
   * Handles WebSocket connection open event
   */
  private handleOpen(): void {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.updateMetrics('connection_success', 1);
    console.info('WebSocket connection established');
  }

  /**
   * Handles WebSocket connection close event
   */
  private handleClose(event: CloseEvent): void {
    this.isConnected = false;
    this.updateMetrics('connection_close', 1);
    console.warn(`WebSocket connection closed: ${event.code} - ${event.reason}`);
  }

  /**
   * Processes incoming WebSocket messages with type validation
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.validateMessage(message);

      const subscribers = this.subscribers.get(message.type);
      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(message.payload);
          } catch (error) {
            console.error('Error in subscriber callback:', error);
          }
        });
      }

      this.updateMetrics('messages_received', 1);
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      this.updateMetrics('message_errors', 1);
    }
  }

  /**
   * Handles WebSocket error events
   */
  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.updateMetrics('connection_errors', 1);
  }

  /**
   * Validates incoming message structure
   */
  private validateMessage(message: WebSocketMessage): void {
    if (!message.type || !Object.values(WebSocketMessageType).includes(message.type)) {
      throw new Error('Invalid message type');
    }

    if (!message.correlationId || typeof message.correlationId !== 'string') {
      throw new Error('Invalid correlation ID');
    }

    if (!message.timestamp || typeof message.timestamp !== 'number') {
      throw new Error('Invalid timestamp');
    }
  }

  /**
   * Initializes connection health monitoring
   */
  private startHealthMonitoring(): void {
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.lastPingTime = Date.now();
        this.socket.send(JSON.stringify({
          type: WebSocketMessageType.CONNECTION_HEALTH,
          payload: { timestamp: this.lastPingTime },
          correlationId: crypto.randomUUID(),
          timestamp: Date.now()
        }));
      }
    }, PING_INTERVAL);
  }

  /**
   * Stops health monitoring intervals
   */
  private stopHealthMonitoring(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Updates service metrics
   */
  private updateMetrics(metric: string, value: number): void {
    const currentValue = this.messageMetrics.get(metric) || 0;
    this.messageMetrics.set(metric, currentValue + value);
  }

  /**
   * Waits for connection establishment or timeout
   */
  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, CONNECTION_TIMEOUT);

      const checkConnection = setInterval(() => {
        if (this.isConnected) {
          clearTimeout(timeout);
          clearInterval(checkConnection);
          resolve();
        }
      }, 100);
    });
  }
}

export default WebSocketService;