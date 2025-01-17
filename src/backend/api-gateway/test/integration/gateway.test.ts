/**
 * @fileoverview Integration tests for API Gateway service
 * @version 1.0.0
 */

import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { app } from '../../src/index';
import { config } from '../../src/config';
import { logger } from '../../../shared/utils/logger';
import { ErrorCode } from '../../../shared/constants/error-codes';
import { HttpStatusCode } from '../../../shared/constants/status-codes';
import { MeetingStatus } from '../../../shared/types/meeting.types';
import { MinutesStatus } from '../../../shared/types/minutes.types';
import { TranscriptionStatus } from '../../../shared/types/transcription.types';

// Test constants
const TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  roles: ['user']
};

const TEST_MEETING = {
  id: 'test-meeting-id',
  title: 'Test Meeting',
  startTime: '2023-01-01T10:00:00Z'
};

// Helper function to generate test tokens
function generateTestToken(payload: object = TEST_USER): string {
  return jwt.sign(
    payload,
    config.auth.clientSecret,
    {
      expiresIn: '1h',
      audience: config.auth.tokenValidation.validAudiences[0],
      issuer: config.auth.tokenValidation.validIssuers[0]
    }
  );
}

describe('API Gateway Integration Tests', () => {
  let validToken: string;

  beforeAll(async () => {
    validToken = generateTestToken();
    jest.spyOn(logger, 'error');
    jest.spyOn(logger, 'info');
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  describe('Authentication Tests', () => {
    test('Should reject requests without auth token', async () => {
      const response = await request(app)
        .get('/api/v1/meetings/123')
        .expect(HttpStatusCode.UNAUTHORIZED);

      expect(response.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    test('Should reject invalid auth tokens', async () => {
      const response = await request(app)
        .get('/api/v1/meetings/123')
        .set('Authorization', 'Bearer invalid-token')
        .expect(HttpStatusCode.UNAUTHORIZED);

      expect(response.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    test('Should accept valid auth tokens', async () => {
      const response = await request(app)
        .get('/api/v1/meetings/123')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatusCode.NOT_FOUND); // 404 because meeting doesn't exist, but auth passed

      expect(response.body.error.code).toBe(ErrorCode.NOT_FOUND);
    });

    test('Should handle expired tokens correctly', async () => {
      const expiredToken = jwt.sign(
        TEST_USER,
        config.auth.clientSecret,
        { expiresIn: '0s' }
      );

      const response = await request(app)
        .get('/api/v1/meetings/123')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(HttpStatusCode.UNAUTHORIZED);

      expect(response.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });
  });

  describe('Rate Limiting Tests', () => {
    test('Should allow requests within rate limit', async () => {
      const response = await request(app)
        .get('/api/v1/meetings/123')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Client-ID', 'test-client')
        .expect(HttpStatusCode.NOT_FOUND);

      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeGreaterThan(0);
    });

    test('Should reject requests exceeding rate limit', async () => {
      const clientId = 'rate-limit-test-client';
      const requests = Array(config.rateLimit.maxRequests + 1).fill(null);

      for (const _ of requests) {
        const response = await request(app)
          .get('/api/v1/meetings/123')
          .set('Authorization', `Bearer ${validToken}`)
          .set('X-Client-ID', clientId);

        if (response.status === HttpStatusCode.TOO_MANY_REQUESTS) {
          expect(response.body.error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
          break;
        }
      }
    });
  });

  describe('Meeting Routes Tests', () => {
    test('Should create new meeting with valid data', async () => {
      const meetingData = {
        title: 'Integration Test Meeting',
        startTime: new Date().toISOString(),
        participants: [{
          id: TEST_USER.id,
          name: 'Test User',
          email: TEST_USER.email,
          role: 'ORGANIZER'
        }]
      };

      const response = await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Client-ID', 'test-client')
        .send(meetingData)
        .expect(HttpStatusCode.CREATED);

      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe(MeetingStatus.SCHEDULED);
    });

    test('Should handle invalid meeting data', async () => {
      const invalidData = {
        title: '', // Invalid: empty title
        startTime: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Client-ID', 'test-client')
        .send(invalidData)
        .expect(HttpStatusCode.BAD_REQUEST);

      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('Minutes Routes Tests', () => {
    test('Should generate meeting minutes', async () => {
      const response = await request(app)
        .post('/api/v1/minutes/generate')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Client-ID', 'test-client')
        .send({ meetingId: TEST_MEETING.id })
        .expect(HttpStatusCode.ACCEPTED);

      expect(response.body.status).toBe(MinutesStatus.GENERATING);
      expect(response.headers['x-job-id']).toBeDefined();
    });

    test('Should handle missing meeting ID', async () => {
      const response = await request(app)
        .post('/api/v1/minutes/generate')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Client-ID', 'test-client')
        .send({})
        .expect(HttpStatusCode.BAD_REQUEST);

      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('Transcription Routes Tests', () => {
    test('Should process transcription chunks', async () => {
      const transcriptionData = {
        meetingId: TEST_MEETING.id,
        content: 'Test transcription content',
        metadata: { language: 'en-US' }
      };

      const response = await request(app)
        .post('/api/v1/transcriptions')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Client-ID', 'test-client')
        .send(transcriptionData)
        .expect(HttpStatusCode.CREATED);

      expect(response.body.status).toBe(TranscriptionStatus.PROCESSING);
      expect(response.body.wsUrl).toBeDefined();
    });

    test('Should validate transcription format', async () => {
      const invalidData = {
        meetingId: TEST_MEETING.id,
        content: '' // Invalid: empty content
      };

      const response = await request(app)
        .post('/api/v1/transcriptions')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Client-ID', 'test-client')
        .send(invalidData)
        .expect(HttpStatusCode.BAD_REQUEST);

      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('Error Handling Tests', () => {
    test('Should handle 404 routes gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Client-ID', 'test-client')
        .expect(HttpStatusCode.NOT_FOUND);

      expect(response.body.error.code).toBe(ErrorCode.NOT_FOUND);
    });

    test('Should provide meaningful error messages', async () => {
      const response = await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Client-ID', 'test-client')
        .send({}) // Empty body
        .expect(HttpStatusCode.BAD_REQUEST);

      expect(response.body.error.message).toBeDefined();
      expect(response.body.error.details).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    test('Should enforce CORS policies', async () => {
      const response = await request(app)
        .options('/api/v1/meetings')
        .set('Origin', 'https://malicious-site.com')
        .expect(HttpStatusCode.NO_CONTENT);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    test('Should validate content types', async () => {
      const response = await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Client-ID', 'test-client')
        .set('Content-Type', 'text/plain')
        .send('invalid content')
        .expect(HttpStatusCode.BAD_REQUEST);

      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });
});