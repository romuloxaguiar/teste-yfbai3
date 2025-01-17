/**
 * @fileoverview Unit tests for API Gateway middleware components
 * @version 1.0.0
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import supertest from 'supertest'; // ^6.3.0
import express from 'express';
import Redis from 'ioredis-mock'; // ^8.0.0
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import { authenticateToken, validateRoles } from '../../src/middleware/auth.middleware';
import rateLimitMiddleware, { createRateLimiter } from '../../src/middleware/ratelimit.middleware';
import { validateMeetingRequest, createValidator } from '../../src/middleware/validation.middleware';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Test constants
const TEST_RATE_LIMIT = 5;
const TEST_WINDOW_MS = 1000;
const TEST_SECRET_KEY = 'test-secret-key';
const TEST_REDIS_CLUSTER = ['localhost:6379', 'localhost:6380'];

/**
 * Creates an Express app instance with configured middleware for testing
 */
const setupTestApp = (middlewareConfig = {}) => {
  const app = express();
  const redisClient = new Redis();

  // Configure middleware
  app.use(express.json());
  app.use(rateLimitMiddleware(redisClient, {
    rateLimit: TEST_RATE_LIMIT,
    windowMs: TEST_WINDOW_MS,
    ...middlewareConfig
  }));

  // Test routes
  app.post('/api/test/meeting', validateMeetingRequest, (req, res) => {
    res.status(200).json({ success: true });
  });

  app.get('/api/test/protected', authenticateToken, (req, res) => {
    res.status(200).json({ user: req.user });
  });

  return app;
};

/**
 * Generates JWT tokens for testing
 */
const generateTestToken = (claims = {}, roles = []) => {
  return jwt.sign(
    {
      sub: uuidv4(),
      roles,
      ...claims
    },
    TEST_SECRET_KEY,
    { expiresIn: '1h' }
  );
};

describe('AuthMiddleware', () => {
  let app: express.Application;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(() => {
    app = setupTestApp();
    request = supertest(app);
  });

  describe('Token Authentication', () => {
    test('should authenticate valid token', async () => {
      const token = generateTestToken({ name: 'Test User' });

      const response = await request
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.name).toBe('Test User');
    });

    test('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { sub: uuidv4() },
        TEST_SECRET_KEY,
        { expiresIn: '0s' }
      );

      const response = await request
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    test('should reject invalid signature', async () => {
      const invalidToken = jwt.sign(
        { sub: uuidv4() },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    test('should handle missing authorization header', async () => {
      const response = await request.get('/api/test/protected');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });
  });

  describe('Role Authorization', () => {
    test('should authorize user with required role', async () => {
      const token = generateTestToken({}, ['ADMIN']);

      const response = await request
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    test('should reject user without required role', async () => {
      const token = generateTestToken({}, ['USER']);

      const response = await request
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe(ErrorCode.ROLE_UNAUTHORIZED);
    });
  });
});

describe('RateLimitMiddleware', () => {
  let app: express.Application;
  let request: supertest.SuperTest<supertest.Test>;
  let redisClient: Redis;

  beforeEach(() => {
    redisClient = new Redis();
    app = setupTestApp({ redisClient });
    request = supertest(app);
  });

  afterEach(async () => {
    await redisClient.flushall();
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limit', async () => {
      const clientId = uuidv4();

      for (let i = 0; i < TEST_RATE_LIMIT; i++) {
        const response = await request
          .get('/api/test/protected')
          .set('x-client-id', clientId);

        expect(response.status).not.toBe(429);
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      }
    });

    test('should block requests exceeding rate limit', async () => {
      const clientId = uuidv4();

      // Exhaust rate limit
      for (let i = 0; i < TEST_RATE_LIMIT; i++) {
        await request
          .get('/api/test/protected')
          .set('x-client-id', clientId);
      }

      // Additional request should be blocked
      const response = await request
        .get('/api/test/protected')
        .set('x-client-id', clientId);

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
    });

    test('should handle Redis cluster failover', async () => {
      const clientId = uuidv4();
      
      // Simulate primary node failure
      await redisClient.disconnect();

      const response = await request
        .get('/api/test/protected')
        .set('x-client-id', clientId);

      // Should fallback to allowing request
      expect(response.status).not.toBe(429);
    });
  });
});

describe('ValidationMiddleware', () => {
  let app: express.Application;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(() => {
    app = setupTestApp();
    request = supertest(app);
  });

  describe('Meeting Request Validation', () => {
    test('should validate valid meeting request', async () => {
      const validMeeting = {
        id: uuidv4(),
        title: 'Test Meeting',
        startTime: new Date(),
        status: 'SCHEDULED',
        participants: [{
          id: uuidv4(),
          name: 'Test User',
          email: 'test@example.com',
          role: 'ORGANIZER',
          joinTime: new Date()
        }],
        metadata: {
          teamsId: 'teams-123',
          transcriptionEnabled: true,
          recordingEnabled: false,
          autoMinutesEnabled: true
        }
      };

      const response = await request
        .post('/api/test/meeting')
        .send(validMeeting);

      expect(response.status).toBe(200);
    });

    test('should reject invalid meeting data', async () => {
      const invalidMeeting = {
        title: 'Test Meeting',
        // Missing required fields
      };

      const response = await request
        .post('/api/test/meeting')
        .send(invalidMeeting);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    test('should validate meeting time constraints', async () => {
      const invalidMeeting = {
        id: uuidv4(),
        title: 'Test Meeting',
        startTime: new Date('2023-12-31'),
        endTime: new Date('2023-12-30'), // End before start
        status: 'SCHEDULED',
        participants: [{
          id: uuidv4(),
          name: 'Test User',
          email: 'test@example.com',
          role: 'ORGANIZER',
          joinTime: new Date()
        }],
        metadata: {
          teamsId: 'teams-123',
          transcriptionEnabled: true,
          recordingEnabled: false,
          autoMinutesEnabled: true
        }
      };

      const response = await request
        .post('/api/test/meeting')
        .send(invalidMeeting);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.details).toHaveProperty('startTime');
    });

    test('should validate participant data', async () => {
      const meetingWithInvalidParticipant = {
        id: uuidv4(),
        title: 'Test Meeting',
        startTime: new Date(),
        status: 'SCHEDULED',
        participants: [{
          id: 'invalid-uuid',
          name: '', // Empty name
          email: 'invalid-email', // Invalid email
          role: 'INVALID_ROLE', // Invalid role
          joinTime: new Date()
        }],
        metadata: {
          teamsId: 'teams-123',
          transcriptionEnabled: true,
          recordingEnabled: false,
          autoMinutesEnabled: true
        }
      };

      const response = await request
        .post('/api/test/meeting')
        .send(meetingWithInvalidParticipant);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.details).toHaveProperty('participants');
    });
  });
});