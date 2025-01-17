/**
 * @fileoverview Integration tests for transcription service with performance validation
 * @version 1.0.0
 */

import { describe, it, beforeEach, afterEach, expect, jest } from 'jest';
import { Container } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { TranscriptionService } from '../../src/services/transcription.service';
import { TeamsService } from '../../src/services/teams.service';
import { TranscriptionStatus, SpeakerData } from '../../../shared/types/transcription.types';
import { MeetingStatus } from '../../../shared/types/meeting.types';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Test configuration constants
const TEST_CONFIG = {
  processingTimeout: 300000, // 5 minutes
  networkSimulation: {
    latencyMs: 100,
    packetLossRate: 0.05,
    jitterMs: 50
  },
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000
  }
};

// Mock data generators
const createTestMeeting = () => ({
  id: uuidv4(),
  organizerId: uuidv4(),
  title: 'Test Meeting',
  startTime: new Date(),
  status: MeetingStatus.IN_PROGRESS,
  metadata: {
    teamsId: uuidv4(),
    transcriptionEnabled: true
  }
});

const createTestSpeakerData = (): SpeakerData => ({
  speakerId: uuidv4(),
  participantId: uuidv4(),
  startTime: new Date(),
  endTime: new Date(),
  confidence: 0.95
});

// Enhanced test container setup
const setupTestContainer = () => {
  const container = new Container();

  // Mock TeamsService with network simulation
  const mockTeamsService = {
    startTranscription: jest.fn(),
    stopTranscription: jest.fn(),
    getTranscriptionStream: jest.fn(),
    processSpeakerData: jest.fn(),
    simulateNetworkConditions: jest.fn()
  };

  container.bind<TeamsService>('TeamsService').toConstantValue(mockTeamsService);
  container.bind<TranscriptionService>(TranscriptionService).toSelf();

  return {
    container,
    mockTeamsService
  };
};

describe('TranscriptionService Integration Tests', () => {
  let container: Container;
  let transcriptionService: TranscriptionService;
  let mockTeamsService: jest.Mocked<TeamsService>;
  let testMeeting: any;

  beforeEach(() => {
    const setup = setupTestContainer();
    container = setup.container;
    mockTeamsService = setup.mockTeamsService;
    transcriptionService = container.get(TranscriptionService);
    testMeeting = createTestMeeting();

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    container.unbindAll();
  });

  describe('Processing Time Requirements', () => {
    it('should process transcription within 5 minutes', async () => {
      // Setup test data
      const startTime = Date.now();
      const testTranscription = 'Test transcription content';
      const testSpeakerData = createTestSpeakerData();

      // Configure mock behavior
      mockTeamsService.startTranscription.mockResolvedValue(true);
      mockTeamsService.getTranscriptionStream.mockImplementation(() => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue({ content: testTranscription, speakerData: testSpeakerData });
            controller.close();
          }
        });
        return Promise.resolve(stream);
      });

      // Start transcription
      const result = await transcriptionService.startTranscription(testMeeting.id);

      // Validate processing time
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(TEST_CONFIG.processingTimeout);
      expect(result.status).toBe(TranscriptionStatus.PROCESSING);
    });

    it('should handle large transcription volumes efficiently', async () => {
      // Setup large test data
      const largeTranscription = 'A'.repeat(100000); // 100KB of text
      const startTime = Date.now();

      // Configure mock for large data processing
      mockTeamsService.getTranscriptionStream.mockImplementation(() => {
        const stream = new ReadableStream({
          start(controller) {
            // Split large content into chunks
            const chunkSize = 1000;
            for (let i = 0; i < largeTranscription.length; i += chunkSize) {
              controller.enqueue({
                content: largeTranscription.slice(i, i + chunkSize),
                speakerData: createTestSpeakerData()
              });
            }
            controller.close();
          }
        });
        return Promise.resolve(stream);
      });

      await transcriptionService.startTranscription(testMeeting.id);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(TEST_CONFIG.processingTimeout);
    });
  });

  describe('Network Resilience', () => {
    it('should handle network interruptions gracefully', async () => {
      // Setup network simulation
      mockTeamsService.simulateNetworkConditions.mockImplementation(async () => {
        if (Math.random() < TEST_CONFIG.networkSimulation.packetLossRate) {
          throw new Error('Network error');
        }
      });

      // Start transcription with unstable network
      const result = await transcriptionService.startTranscription(testMeeting.id);

      expect(result).toBeDefined();
      expect(mockTeamsService.startTranscription).toHaveBeenCalledTimes(1);
    });

    it('should implement retry mechanism for failed requests', async () => {
      // Setup failing request simulation
      let attempts = 0;
      mockTeamsService.startTranscription.mockImplementation(async () => {
        attempts++;
        if (attempts <= 2) {
          throw new Error('Service unavailable');
        }
        return true;
      });

      // Attempt transcription with retries
      await transcriptionService.startTranscription(testMeeting.id);

      expect(attempts).toBeGreaterThan(1);
      expect(attempts).toBeLessThanOrEqual(TEST_CONFIG.retryPolicy.maxRetries);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain speaker data accuracy', async () => {
      const testSpeakerData = createTestSpeakerData();
      
      mockTeamsService.processSpeakerData.mockResolvedValue(testSpeakerData);

      const result = await transcriptionService.startTranscription(testMeeting.id);

      expect(result.speakerData).toBeDefined();
      expect(result.speakerData[0]?.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should validate transcription content integrity', async () => {
      const testContent = 'Test transcription content';
      
      mockTeamsService.getTranscriptionStream.mockImplementation(() => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue({ 
              content: testContent,
              speakerData: createTestSpeakerData()
            });
            controller.close();
          }
        });
        return Promise.resolve(stream);
      });

      const result = await transcriptionService.startTranscription(testMeeting.id);

      expect(result.content).toBeDefined();
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should handle error conditions appropriately', async () => {
      mockTeamsService.startTranscription.mockRejectedValue(
        new Error('Teams API error')
      );

      try {
        await transcriptionService.startTranscription(testMeeting.id);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.TEAMS_API_ERROR);
      }
    });
  });
});