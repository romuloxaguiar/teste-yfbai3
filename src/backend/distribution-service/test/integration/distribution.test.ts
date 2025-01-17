/**
 * @fileoverview Integration tests for distribution service
 * @version 1.0.0
 */

import { jest } from '@jest/globals'; // ^29.0.0
import supertest from 'supertest'; // ^6.3.0
import { GenericContainer, StartedTestContainer } from 'testcontainers'; // ^9.0.0
import now from 'performance-now'; // ^2.1.0
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../../src/services/email.service';
import { TeamsNotificationService } from '../../src/services/teams.notification.service';
import { Minutes, MinutesStatus, Priority, Impact } from '../../../shared/types/minutes.types';
import { Logger } from '../../../shared/utils/logger';

// Constants for test configuration
const TEST_TIMEOUT = 60000; // 60 seconds
const DISTRIBUTION_SLA = 600000; // 10 minutes in milliseconds
const BATCH_SIZE = 50; // Recipients per batch

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  emailDelivery: 5000, // 5 seconds per batch
  teamsNotification: 2000, // 2 seconds per notification
  totalProcessing: DISTRIBUTION_SLA * 0.8 // 80% of SLA
};

describe('Distribution Service Integration Tests', () => {
  let emailService: EmailService;
  let teamsNotificationService: TeamsNotificationService;
  let mockSmtpContainer: StartedTestContainer;
  let logger: Logger;

  // Test data
  const testMinutes: Minutes = {
    id: uuidv4(),
    meetingId: uuidv4(),
    summary: 'Test Meeting Summary',
    topics: [{
      id: uuidv4(),
      title: 'Test Topic',
      content: 'Test Content',
      confidence: 0.95,
      subtopics: [],
      startTime: new Date(),
      endTime: new Date()
    }],
    actionItems: [{
      id: uuidv4(),
      description: 'Test Action Item',
      assigneeId: 'test.user@company.com',
      dueDate: new Date(),
      status: 'PENDING',
      confidence: 0.9,
      priority: Priority.HIGH
    }],
    decisions: [{
      id: uuidv4(),
      description: 'Test Decision',
      madeBy: 'test.user@company.com',
      timestamp: new Date(),
      confidence: 0.95,
      impact: Impact.HIGH
    }],
    status: MinutesStatus.GENERATED,
    generatedAt: new Date(),
    processingMetadata: {
      processingStartTime: new Date(),
      processingEndTime: new Date(),
      processingDuration: 1000,
      modelVersion: '1.0.0',
      overallConfidence: 0.92
    }
  };

  const testRecipients = Array(100).fill(null).map((_, i) => 
    `test.user${i}@company.com`
  );

  beforeAll(async () => {
    // Initialize logger
    logger = new Logger({
      serviceName: 'distribution-service-test',
      environment: 'test'
    });

    // Start mock SMTP server container
    mockSmtpContainer = await new GenericContainer('mailhog/mailhog')
      .withExposedPorts(1025, 8025)
      .start();

    // Initialize services with test configuration
    emailService = new EmailService({
      graphClientOptions: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        tenantId: 'test-tenant-id'
      },
      smtpConfig: {
        host: mockSmtpContainer.getHost(),
        port: mockSmtpContainer.getMappedPort(1025),
        secure: false,
        auth: {
          user: 'test',
          pass: 'test'
        }
      },
      retryConfig: {
        retries: 3,
        minTimeout: 100,
        maxTimeout: 1000
      }
    });

    teamsNotificationService = new TeamsNotificationService(logger);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await mockSmtpContainer.stop();
  });

  describe('Email Distribution', () => {
    test('should distribute minutes to all recipients within SLA', async () => {
      const startTime = now();
      const deliveryResults = [];

      // Process recipients in batches
      for (let i = 0; i < testRecipients.length; i += BATCH_SIZE) {
        const batchStart = now();
        const batch = testRecipients.slice(i, i + BATCH_SIZE);
        
        const batchResults = await emailService.sendMinutesEmail(
          testMinutes,
          batch,
          { priority: 'high' }
        );

        const batchDuration = now() - batchStart;
        expect(batchDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.emailDelivery);
        
        deliveryResults.push(...batchResults);
      }

      const totalDuration = now() - startTime;
      
      // Validate delivery results
      expect(deliveryResults).toHaveLength(testRecipients.length);
      expect(deliveryResults.every(result => result.status === 'delivered')).toBe(true);
      
      // Validate SLA compliance
      expect(totalDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.totalProcessing);
    }, TEST_TIMEOUT);

    test('should handle delivery failures with retry mechanism', async () => {
      // Simulate network failure
      const failingRecipient = 'failing.user@company.com';
      jest.spyOn(emailService as any, 'sendEmail')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ status: 'delivered' });

      const result = await emailService.sendMinutesEmail(
        testMinutes,
        [failingRecipient],
        { priority: 'high' }
      );

      expect(result[0].status).toBe('delivered');
      expect(result[0].retryCount).toBe(1);
    });
  });

  describe('Teams Notifications', () => {
    test('should send minutes generated notification within performance threshold', async () => {
      const startTime = now();

      await teamsNotificationService.sendMinutesGeneratedNotification(testMinutes);

      const duration = now() - startTime;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.teamsNotification);
    });

    test('should send distribution status notification with success', async () => {
      const startTime = now();

      await teamsNotificationService.sendDistributionStatusNotification(
        testMinutes,
        true
      );

      const duration = now() - startTime;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.teamsNotification);
    });

    test('should handle notification failures with retry mechanism', async () => {
      // Simulate API failure
      jest.spyOn(teamsNotificationService as any, 'sendNotification')
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce(undefined);

      await expect(
        teamsNotificationService.sendMinutesGeneratedNotification(testMinutes)
      ).resolves.not.toThrow();
    });
  });

  describe('End-to-End Distribution', () => {
    test('should complete full distribution process within SLA', async () => {
      const startTime = now();

      // Send email notifications
      const emailResults = await emailService.sendMinutesEmail(
        testMinutes,
        testRecipients,
        { priority: 'high' }
      );

      // Send Teams notifications
      await teamsNotificationService.sendMinutesGeneratedNotification(testMinutes);
      await teamsNotificationService.sendDistributionStatusNotification(
        testMinutes,
        emailResults.every(r => r.status === 'delivered')
      );

      const totalDuration = now() - startTime;

      // Validate complete process
      expect(emailResults).toHaveLength(testRecipients.length);
      expect(totalDuration).toBeLessThan(DISTRIBUTION_SLA);
    }, TEST_TIMEOUT);
  });
});