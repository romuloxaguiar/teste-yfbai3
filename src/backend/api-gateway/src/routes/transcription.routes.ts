/**
 * @fileoverview Express router configuration for transcription-related API endpoints
 * @version 1.0.0
 */

import express, { Request, Response, Router } from 'express'; // ^4.18.2
import WebSocket from 'ws'; // ^8.13.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { authenticateToken } from '../middleware/auth.middleware';
import { validateTranscriptionRequest } from '../middleware/validation.middleware';
import { handleError } from '../../../shared/utils/error-handler';
import { Logger } from '../../../shared/utils/logger';
import { ErrorCode } from '../../../shared/constants/error-codes';
import { HttpStatusCode } from '../../../shared/constants/status-codes';
import type { 
  Transcription, 
  TranscriptionStatus, 
  TranscriptionChunk 
} from '../../../shared/types/transcription.types';

// WebSocket event types
const WEBSOCKET_EVENTS = {
  TRANSCRIPTION_UPDATE: 'transcription:update',
  TRANSCRIPTION_COMPLETE: 'transcription:complete',
  TRANSCRIPTION_ERROR: 'transcription:error',
  HEARTBEAT: 'heartbeat',
  RECONNECT: 'reconnect'
} as const;

// Rate limiting configuration
const RATE_LIMITS = {
  MAX_REQUESTS_PER_MINUTE: 100,
  MAX_CONNECTIONS_PER_CLIENT: 5,
  RETRY_ATTEMPTS: 3,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 5000 // 5 seconds
} as const;

// Initialize router and logger
const router: Router = express.Router();
const logger = new Logger({
  serviceName: 'api-gateway',
  environment: process.env.NODE_ENV || 'development'
});

// WebSocket connection pool
const wsConnections = new Map<string, WebSocket>();

/**
 * Create new transcription with WebSocket support
 * @route POST /api/v1/transcriptions
 */
router.post(
  '/transcriptions',
  authenticateToken,
  validateTranscriptionRequest,
  async (req: Request, res: Response) => {
    try {
      const transcriptionId = uuidv4();
      const { meetingId, content, metadata } = req.body;

      // Create initial transcription record
      const transcription: Transcription = {
        id: transcriptionId,
        meetingId,
        content,
        timestamp: new Date(),
        speakerData: [],
        status: TranscriptionStatus.PROCESSING,
        metadata: {
          ...metadata,
          language: metadata.language || 'en-US',
          noiseLevel: 0,
          processingDuration: 0,
          wordCount: content.split(/\s+/).length
        }
      };

      // Set up WebSocket connection
      const ws = new WebSocket(process.env.TRANSCRIPTION_SERVICE_WS_URL!);
      
      // Configure WebSocket connection
      setupWebSocketConnection(ws, transcriptionId, req.user!.id);

      // Store connection in pool
      wsConnections.set(transcriptionId, ws);

      logger.info('Transcription created', {
        transcriptionId,
        meetingId,
        userId: req.user!.id
      });

      res.status(HttpStatusCode.CREATED).json({
        id: transcriptionId,
        status: TranscriptionStatus.PROCESSING,
        wsUrl: `/api/v1/transcriptions/${transcriptionId}/live`
      });
    } catch (error) {
      const serviceError = await handleError(error, {
        source: 'transcription.routes',
        userId: req.user!.id
      });
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: serviceError });
    }
  }
);

/**
 * Update transcription with real-time processing
 * @route PUT /api/v1/transcriptions/:id
 */
router.put(
  '/transcriptions/:id',
  authenticateToken,
  validateTranscriptionRequest,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const update = req.body;

      // Validate transcription exists
      const ws = wsConnections.get(id);
      if (!ws) {
        throw new Error('Transcription not found');
      }

      // Process transcription chunk
      const chunk: TranscriptionChunk = {
        id: uuidv4(),
        transcriptionId: id,
        content: update.content,
        sequence: update.sequence,
        speakerData: update.speakerData,
        timestamp: new Date(),
        isProcessed: false
      };

      // Broadcast update to connected clients
      ws.send(JSON.stringify({
        event: WEBSOCKET_EVENTS.TRANSCRIPTION_UPDATE,
        data: chunk
      }));

      logger.info('Transcription updated', {
        transcriptionId: id,
        chunkId: chunk.id,
        userId: req.user!.id
      });

      res.status(HttpStatusCode.OK).json({
        id,
        chunkId: chunk.id,
        status: TranscriptionStatus.PROCESSING
      });
    } catch (error) {
      const serviceError = await handleError(error, {
        source: 'transcription.routes',
        userId: req.user!.id
      });
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: serviceError });
    }
  }
);

/**
 * Get transcription status and data
 * @route GET /api/v1/transcriptions/:id
 */
router.get(
  '/transcriptions/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Implement transcription retrieval logic here
      // This would typically involve a service call

      logger.info('Transcription retrieved', {
        transcriptionId: id,
        userId: req.user!.id
      });

      res.status(HttpStatusCode.OK).json({
        id,
        // Add transcription data
      });
    } catch (error) {
      const serviceError = await handleError(error, {
        source: 'transcription.routes',
        userId: req.user!.id
      });
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: serviceError });
    }
  }
);

/**
 * Delete transcription and clean up resources
 * @route DELETE /api/v1/transcriptions/:id
 */
router.delete(
  '/transcriptions/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Close and remove WebSocket connection
      const ws = wsConnections.get(id);
      if (ws) {
        ws.close();
        wsConnections.delete(id);
      }

      logger.info('Transcription deleted', {
        transcriptionId: id,
        userId: req.user!.id
      });

      res.status(HttpStatusCode.NO_CONTENT).send();
    } catch (error) {
      const serviceError = await handleError(error, {
        source: 'transcription.routes',
        userId: req.user!.id
      });
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: serviceError });
    }
  }
);

/**
 * Configure WebSocket connection with enhanced features
 */
function setupWebSocketConnection(ws: WebSocket, transcriptionId: string, userId: string): void {
  // Set up heartbeat interval
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: WEBSOCKET_EVENTS.HEARTBEAT }));
    }
  }, RATE_LIMITS.HEARTBEAT_INTERVAL);

  // Configure connection timeout
  const connectionTimeout = setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) {
      ws.close();
      logger.error('WebSocket connection timeout', null, {
        transcriptionId,
        userId
      });
    }
  }, RATE_LIMITS.CONNECTION_TIMEOUT);

  // Set up event handlers
  ws.on('open', () => {
    clearTimeout(connectionTimeout);
    logger.info('WebSocket connection established', {
      transcriptionId,
      userId
    });
  });

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const message = JSON.parse(data.toString());
      handleWebSocketMessage(message, transcriptionId, userId);
    } catch (error) {
      logger.error('WebSocket message handling failed', error as Error, {
        transcriptionId,
        userId
      });
    }
  });

  ws.on('close', () => {
    clearInterval(heartbeatInterval);
    wsConnections.delete(transcriptionId);
    logger.info('WebSocket connection closed', {
      transcriptionId,
      userId
    });
  });

  ws.on('error', (error: Error) => {
    logger.error('WebSocket error occurred', error, {
      transcriptionId,
      userId
    });
    ws.close();
  });
}

/**
 * Handle incoming WebSocket messages
 */
function handleWebSocketMessage(
  message: any,
  transcriptionId: string,
  userId: string
): void {
  switch (message.event) {
    case WEBSOCKET_EVENTS.TRANSCRIPTION_COMPLETE:
      handleTranscriptionComplete(message.data, transcriptionId, userId);
      break;
    case WEBSOCKET_EVENTS.TRANSCRIPTION_ERROR:
      handleTranscriptionError(message.data, transcriptionId, userId);
      break;
    case WEBSOCKET_EVENTS.HEARTBEAT:
      // Handle heartbeat response
      break;
    default:
      logger.warn('Unknown WebSocket event received', {
        event: message.event,
        transcriptionId,
        userId
      });
  }
}

/**
 * Handle transcription completion
 */
function handleTranscriptionComplete(
  data: any,
  transcriptionId: string,
  userId: string
): void {
  logger.info('Transcription completed', {
    transcriptionId,
    userId,
    processingDuration: data.processingDuration
  });

  const ws = wsConnections.get(transcriptionId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
}

/**
 * Handle transcription errors
 */
function handleTranscriptionError(
  error: any,
  transcriptionId: string,
  userId: string
): void {
  logger.error('Transcription processing error', null, {
    transcriptionId,
    userId,
    error
  });

  const ws = wsConnections.get(transcriptionId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
}

export default router;