import { jest } from '@jest/globals';
import { Client } from '@microsoft/microsoft-graph-client'; // v3.0.0
import * as nodemailer from 'nodemailer'; // v6.9.0
import { EmailService } from '../../src/services/email.service';
import { Minutes, MinutesStatus, Priority, Impact } from '../../../shared/types/minutes.types';
import { ErrorCode } from '../../../shared/constants/error-codes';
import '@testing-library/jest-dom'; // v5.16.5

describe('EmailService', () => {
  let emailService: EmailService;
  let mockGraphClient: jest.Mocked<Client>;
  let mockTransporter: jest.Mocked<nodemailer.Transporter>;
  let testMinutes: Minutes;
  let testRecipients: string[];

  // Mock Graph client
  jest.mock('@microsoft/microsoft-graph-client', () => ({
    Client: {
      init: jest.fn().mockReturnValue({
        api: jest.fn().mockReturnThis(),
        post: jest.fn().mockResolvedValue({ id: 'test-message-id' })
      })
    }
  }));

  // Mock nodemailer
  jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-smtp-id' })
    })
  }));

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Initialize test configuration
    const config = {
      graphClientOptions: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        tenantId: 'test-tenant-id'
      },
      smtpConfig: {
        host: 'smtp.test.com',
        port: 587,
        secure: true,
        auth: {
          user: 'test@test.com',
          pass: 'test-password'
        }
      },
      retryConfig: {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000
      }
    };

    // Initialize service
    emailService = new EmailService(config);

    // Prepare test minutes data
    testMinutes = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      meetingId: '123e4567-e89b-12d3-a456-426614174001',
      summary: 'Test Meeting Summary',
      topics: [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          title: 'Test Topic',
          content: 'Test Content',
          confidence: 0.95,
          subtopics: [],
          startTime: new Date('2023-01-01T10:00:00Z'),
          endTime: new Date('2023-01-01T10:30:00Z')
        }
      ],
      actionItems: [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          description: 'Test Action Item',
          assigneeId: 'test-user@test.com',
          dueDate: new Date('2023-01-08T10:00:00Z'),
          status: 'PENDING',
          confidence: 0.9,
          priority: Priority.HIGH
        }
      ],
      decisions: [
        {
          id: '123e4567-e89b-12d3-a456-426614174004',
          description: 'Test Decision',
          madeBy: 'test-user@test.com',
          timestamp: new Date('2023-01-01T10:15:00Z'),
          confidence: 0.95,
          impact: Impact.HIGH
        }
      ],
      status: MinutesStatus.GENERATED,
      generatedAt: new Date('2023-01-01T10:30:00Z'),
      processingMetadata: {
        processingStartTime: new Date('2023-01-01T10:30:00Z'),
        processingEndTime: new Date('2023-01-01T10:30:05Z'),
        processingDuration: 5000,
        modelVersion: '1.0.0',
        overallConfidence: 0.93
      }
    };

    testRecipients = ['recipient1@test.com', 'recipient2@test.com'];
  });

  describe('sendMinutesEmail', () => {
    it('should successfully send emails to all recipients', async () => {
      const result = await emailService.sendMinutesEmail(testMinutes, testRecipients);

      expect(result).toHaveLength(testRecipients.length);
      result.forEach(status => {
        expect(status.status).toBe('delivered');
        expect(status.error).toBeUndefined();
      });
    });

    it('should handle delivery failures with retry mechanism', async () => {
      // Mock first attempt failure
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('SMTP Error'));
      // Mock successful retry
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: 'retry-success-id' });

      const result = await emailService.sendMinutesEmail(testMinutes, [testRecipients[0]]);

      expect(result[0].status).toBe('delivered');
      expect(result[0].retryCount).toBe(1);
    });

    it('should handle permanent delivery failures', async () => {
      // Mock all attempts failing
      mockTransporter.sendMail.mockRejectedValue(new Error('Permanent SMTP Error'));

      const result = await emailService.sendMinutesEmail(testMinutes, [testRecipients[0]]);

      expect(result[0].status).toBe('failed');
      expect(result[0].error).toBeDefined();
      expect(result[0].retryCount).toBe(3); // Max retries
    });

    it('should process recipients in batches', async () => {
      const largeRecipientList = Array(100).fill('test@test.com');
      
      const result = await emailService.sendMinutesEmail(testMinutes, largeRecipientList);

      expect(result).toHaveLength(largeRecipientList.length);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2); // 2 batches of 50
    });
  });

  describe('generateEmailContent', () => {
    it('should generate properly formatted HTML content', async () => {
      const emailContent = await emailService['generateEmailContent'](testMinutes);

      // Verify HTML structure
      expect(emailContent.html).toContain('<!DOCTYPE html>');
      expect(emailContent.html).toContain('<meta charset="utf-8">');
      expect(emailContent.html).toContain('viewport');
      
      // Verify content sections
      expect(emailContent.html).toContain(testMinutes.summary);
      expect(emailContent.html).toContain(testMinutes.topics[0].title);
      expect(emailContent.html).toContain(testMinutes.actionItems[0].description);
      expect(emailContent.html).toContain(testMinutes.decisions[0].description);
    });

    it('should generate plain text alternative content', async () => {
      const emailContent = await emailService['generateEmailContent'](testMinutes);

      expect(emailContent.text).toBeDefined();
      expect(emailContent.text).toContain(testMinutes.summary);
      expect(emailContent.text).toContain(testMinutes.topics[0].title);
      expect(emailContent.text).not.toContain('<html>');
    });

    it('should properly sanitize HTML content', async () => {
      const minutesWithHtml = {
        ...testMinutes,
        summary: '<script>alert("xss")</script>Test Summary'
      };

      const emailContent = await emailService['generateEmailContent'](minutesWithHtml);

      expect(emailContent.html).not.toContain('<script>');
      expect(emailContent.html).toContain('&lt;script&gt;');
    });

    it('should include Teams-styled CSS', async () => {
      const emailContent = await emailService['generateEmailContent'](testMinutes);

      expect(emailContent.html).toContain('font-family: \'Segoe UI\'');
      expect(emailContent.html).toContain('background: #464775');
    });
  });

  describe('error handling', () => {
    it('should handle Graph API errors', async () => {
      mockGraphClient.api().post.mockRejectedValue(new Error('Graph API Error'));

      const result = await emailService.sendMinutesEmail(testMinutes, [testRecipients[0]]);

      expect(result[0].status).toBe('failed');
      expect(result[0].error?.message).toContain('Graph API Error');
    });

    it('should handle invalid recipient emails', async () => {
      const invalidRecipients = ['invalid-email', ...testRecipients];

      const result = await emailService.sendMinutesEmail(testMinutes, invalidRecipients);

      expect(result[0].status).toBe('failed');
      expect(result[0].error?.message).toContain('Invalid email address');
    });

    it('should handle rate limiting', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      const result = await emailService.sendMinutesEmail(testMinutes, testRecipients);

      expect(result.some(r => r.retryCount > 0)).toBeTruthy();
    });
  });

  describe('delivery tracking', () => {
    it('should track delivery status for each recipient', async () => {
      const result = await emailService.sendMinutesEmail(testMinutes, testRecipients);

      result.forEach(status => {
        expect(status).toHaveProperty('recipient');
        expect(status).toHaveProperty('timestamp');
        expect(status).toHaveProperty('status');
      });
    });

    it('should update delivery status during retries', async () => {
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({ messageId: 'retry-success' });

      const result = await emailService.sendMinutesEmail(testMinutes, [testRecipients[0]]);

      expect(result[0].retryCount).toBe(1);
      expect(result[0].status).toBe('delivered');
    });
  });
});