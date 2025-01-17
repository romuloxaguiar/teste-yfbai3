/**
 * @fileoverview Express router implementation for meeting-related API endpoints in the API Gateway
 * @version 1.0.0
 */

import express, { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateMeetingRequest } from '../middleware/validation.middleware';
import rateLimitMiddleware from '../middleware/ratelimit.middleware';
import { Meeting, MeetingStatus } from '../../../shared/types/meeting.types';
import { ErrorCode } from '../../../shared/constants/error-codes';
import { handleError } from '../../../shared/utils/error-handler';
import { config } from '../config';
import { Logger } from '../../../shared/utils/logger';

// Initialize router and logger
const router = express.Router();
const logger = new Logger({
  serviceName: 'api-gateway',
  environment: process.env.NODE_ENV || 'development'
});

// Constants
const MEETINGS_BASE_PATH = '/meetings';
const STATUS_PATH = '/status';
const REQUEST_TIMEOUT = 5000;
const MAX_RETRIES = 3;
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX_REQUESTS = 100;

/**
 * Creates a new meeting with validation and error handling
 * POST /meetings
 */
router.post(
  MEETINGS_BASE_PATH,
  authenticateToken,
  validateMeetingRequest,
  rateLimitMiddleware(config.rateLimit),
  async (req: Request, res: Response) => {
    const correlationId = uuidv4();
    logger.info('Creating new meeting', { correlationId });

    try {
      const meetingData: Partial<Meeting> = {
        ...req.body,
        id: uuidv4(),
        status: MeetingStatus.SCHEDULED,
        organizerId: req.user?.id
      };

      const response = await axios.post(
        `${config.services.transcription.url}/meetings`,
        meetingData,
        {
          headers: {
            'X-Correlation-ID': correlationId,
            'Authorization': req.headers.authorization
          },
          timeout: REQUEST_TIMEOUT
        }
      );

      logger.info('Meeting created successfully', {
        correlationId,
        meetingId: response.data.id
      });

      res.status(201).json(response.data);
    } catch (error) {
      const serviceError = await handleError(error as Error, {
        correlationId,
        source: 'meeting.routes',
        operation: 'createMeeting'
      });

      res.status(serviceError.code === ErrorCode.VALIDATION_ERROR ? 400 : 500)
         .json({ error: serviceError });
    }
  }
);

/**
 * Updates meeting status with validation and authorization
 * PUT /meetings/:id/status
 */
router.put(
  `${MEETINGS_BASE_PATH}/:id${STATUS_PATH}`,
  authenticateToken,
  rateLimitMiddleware(config.rateLimit),
  async (req: Request, res: Response) => {
    const correlationId = uuidv4();
    const meetingId = req.params.id;

    logger.info('Updating meeting status', { correlationId, meetingId });

    try {
      const { status } = req.body;
      if (!Object.values(MeetingStatus).includes(status)) {
        throw new Error('Invalid meeting status');
      }

      const response = await axios.put(
        `${config.services.transcription.url}/meetings/${meetingId}/status`,
        { status },
        {
          headers: {
            'X-Correlation-ID': correlationId,
            'Authorization': req.headers.authorization
          },
          timeout: REQUEST_TIMEOUT
        }
      );

      logger.info('Meeting status updated successfully', {
        correlationId,
        meetingId,
        status
      });

      res.json(response.data);
    } catch (error) {
      const serviceError = await handleError(error as Error, {
        correlationId,
        meetingId,
        source: 'meeting.routes',
        operation: 'updateMeetingStatus'
      });

      res.status(serviceError.code === ErrorCode.NOT_FOUND ? 404 : 500)
         .json({ error: serviceError });
    }
  }
);

/**
 * Retrieves meeting details with caching and error handling
 * GET /meetings/:id
 */
router.get(
  `${MEETINGS_BASE_PATH}/:id`,
  authenticateToken,
  rateLimitMiddleware(config.rateLimit),
  async (req: Request, res: Response) => {
    const correlationId = uuidv4();
    const meetingId = req.params.id;

    logger.info('Retrieving meeting details', { correlationId, meetingId });

    try {
      const response = await axios.get(
        `${config.services.transcription.url}/meetings/${meetingId}`,
        {
          headers: {
            'X-Correlation-ID': correlationId,
            'Authorization': req.headers.authorization
          },
          timeout: REQUEST_TIMEOUT
        }
      );

      logger.info('Meeting details retrieved successfully', {
        correlationId,
        meetingId
      });

      res.json(response.data);
    } catch (error) {
      const serviceError = await handleError(error as Error, {
        correlationId,
        meetingId,
        source: 'meeting.routes',
        operation: 'getMeetingDetails'
      });

      res.status(serviceError.code === ErrorCode.NOT_FOUND ? 404 : 500)
         .json({ error: serviceError });
    }
  }
);

export default router;