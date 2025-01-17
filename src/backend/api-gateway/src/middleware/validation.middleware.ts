/**
 * @fileoverview Express middleware for request validation in the API Gateway
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import { validateMeeting, validateMinutes, validateTranscription } from '../../../shared/utils/validation';
import { ErrorCode } from '../../../shared/constants/error-codes';
import { handleError } from '../../../shared/utils/error-handler';

/**
 * Middleware to validate meeting request data
 * Ensures all required fields and data types are correct before processing
 */
export const validateMeetingRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const meetingData = req.body;

    // Add request metadata to meeting data
    const enrichedMeetingData = {
      ...meetingData,
      metadata: {
        ...meetingData.metadata,
        requestTimestamp: new Date(),
        requestIp: req.ip,
        userAgent: req.headers['user-agent']
      }
    };

    // Validate meeting data structure
    await validateMeeting(enrichedMeetingData);

    // Store validated data in request for downstream handlers
    req.body = enrichedMeetingData;
    next();
  } catch (error) {
    const handledError = await handleError(error, {
      requestId: req.id,
      endpoint: req.path,
      method: req.method,
      validationTarget: 'meeting'
    });

    // Send validation error response
    res.status(400).json({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Meeting validation failed',
      details: handledError.details,
      correlationId: handledError.correlationId
    });
  }
};

/**
 * Middleware to validate minutes request data
 * Ensures all required fields and data types are correct before processing
 */
export const validateMinutesRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const minutesData = req.body;

    // Add request metadata to minutes data
    const enrichedMinutesData = {
      ...minutesData,
      processingMetadata: {
        ...minutesData.processingMetadata,
        requestTimestamp: new Date(),
        requestSource: 'api-gateway',
        validationVersion: '1.0.0'
      }
    };

    // Validate minutes data structure
    await validateMinutes(enrichedMinutesData);

    // Store validated data in request for downstream handlers
    req.body = enrichedMinutesData;
    next();
  } catch (error) {
    const handledError = await handleError(error, {
      requestId: req.id,
      endpoint: req.path,
      method: req.method,
      validationTarget: 'minutes'
    });

    // Send validation error response
    res.status(400).json({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Minutes validation failed',
      details: handledError.details,
      correlationId: handledError.correlationId
    });
  }
};

/**
 * Middleware to validate transcription request data
 * Ensures all required fields and data types are correct before processing
 */
export const validateTranscriptionRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const transcriptionData = req.body;

    // Add request metadata to transcription data
    const enrichedTranscriptionData = {
      ...transcriptionData,
      metadata: {
        ...transcriptionData.metadata,
        validationTimestamp: new Date(),
        gatewayVersion: process.env.API_GATEWAY_VERSION || '1.0.0',
        requestOrigin: req.headers.origin
      }
    };

    // Validate transcription data structure
    await validateTranscription(enrichedTranscriptionData);

    // Store validated data in request for downstream handlers
    req.body = enrichedTranscriptionData;
    next();
  } catch (error) {
    const handledError = await handleError(error, {
      requestId: req.id,
      endpoint: req.path,
      method: req.method,
      validationTarget: 'transcription'
    });

    // Send validation error response
    res.status(400).json({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Transcription validation failed',
      details: handledError.details,
      correlationId: handledError.correlationId
    });
  }
};