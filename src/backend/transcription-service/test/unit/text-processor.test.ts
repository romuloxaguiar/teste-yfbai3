/**
 * @fileoverview Unit tests for TextProcessor utility
 * @version 1.0.0
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { TextProcessor } from '../../src/utils/text-processor';
import { Logger } from '../../../shared/utils/logger';
import { Transcription, SpeakerData, TranscriptionMetadata } from '../../../shared/types/transcription.types';
import { ErrorCode } from '../../../shared/constants/error-codes';

// Test constants
const PROCESSING_TIME_LIMIT = 300000; // 5 minutes in milliseconds
const CHUNK_PROCESSING_LIMIT = 1000; // 1 second in milliseconds
const TEST_MEETING_ID = '123e4567-e89b-12d3-a456-426614174000';

describe('TextProcessor', () => {
  let textProcessor: TextProcessor;
  let mockLogger: jest.Mocked<Logger>;

  // Sample test data
  const sampleSpeakerData: SpeakerData = {
    speakerId: 'speaker1',
    participantId: 'participant1',
    startTime: new Date(),
    endTime: new Date(Date.now() + 60000),
    confidence: 0.95
  };

  const sampleTranscription: Transcription = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    meetingId: TEST_MEETING_ID,
    content: 'Um, so like I think we should um proceed with the project timeline.',
    timestamp: new Date(),
    speakerData: [sampleSpeakerData],
    status: 'PROCESSING',
    metadata: {
      language: 'en',
      noiseLevel: 0,
      processingDuration: 0,
      wordCount: 0
    }
  };

  beforeEach(() => {
    // Initialize mocks
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as unknown as jest.Mocked<Logger>;

    // Initialize TextProcessor instance
    textProcessor = new TextProcessor(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanTranscriptionText', () => {
    it('should remove filler words while maintaining semantic meaning', async () => {
      const input = 'Um, like, you know, we should proceed with the project.';
      const expected = 'We should proceed with the project.';
      
      const result = await textProcessor['cleanTranscriptionText'](input);
      expect(result).toBe(expected);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should normalize whitespace and punctuation', async () => {
      const input = 'First   point...    Second    point  !  Third point   ';
      const expected = 'First point. Second point! Third point';
      
      const result = await textProcessor['cleanTranscriptionText'](input);
      expect(result).toBe(expected);
    });

    it('should handle empty or malformed input gracefully', async () => {
      const emptyResult = await textProcessor['cleanTranscriptionText']('');
      expect(emptyResult).toBe('');

      const nullResult = await textProcessor['cleanTranscriptionText'](null as unknown as string);
      expect(nullResult).toBe('');
    });

    it('should maintain speaker identification markers', async () => {
      const input = '[Speaker 1]: Hello, um, everyone. [Speaker 2]: Hi there!';
      const expected = '[Speaker 1]: Hello, everyone. [Speaker 2]: Hi there!';
      
      const result = await textProcessor['cleanTranscriptionText'](input);
      expect(result).toBe(expected);
    });

    it('should process large text within memory constraints', async () => {
      const largeText = 'Um, like '.repeat(10000);
      const startMemory = process.memoryUsage().heapUsed;
      
      await textProcessor['cleanTranscriptionText'](largeText);
      
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;
      expect(memoryUsed).toBeLessThan(50 * 1024 * 1024); // 50MB limit
    });
  });

  describe('processSpeakerData', () => {
    it('should validate and normalize speaker identification data', async () => {
      const result = await textProcessor['processSpeakerData']([sampleSpeakerData]);
      
      expect(result[0]).toHaveProperty('confidence');
      expect(result[0].confidence).toBeGreaterThanOrEqual(0);
      expect(result[0].confidence).toBeLessThanOrEqual(1);
    });

    it('should handle missing or corrupt speaker data gracefully', async () => {
      const corruptData = { ...sampleSpeakerData, confidence: undefined };
      
      const result = await textProcessor['processSpeakerData']([corruptData as SpeakerData]);
      expect(result[0].confidence).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should process multiple speaker transitions correctly', async () => {
      const multiSpeakerData = [
        { ...sampleSpeakerData, startTime: new Date(2023, 0, 1, 10, 0) },
        { ...sampleSpeakerData, speakerId: 'speaker2', startTime: new Date(2023, 0, 1, 10, 1) }
      ];
      
      const result = await textProcessor['processSpeakerData'](multiSpeakerData);
      expect(result).toHaveLength(2);
      expect(result[0].speakerId).not.toBe(result[1].speakerId);
    });
  });

  describe('processTranscription', () => {
    it('should process full transcription within time limits', async () => {
      const startTime = Date.now();
      
      await textProcessor.processTranscription(sampleTranscription);
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(PROCESSING_TIME_LIMIT);
    });

    it('should handle large transcription content efficiently', async () => {
      const largeTranscription = {
        ...sampleTranscription,
        content: 'Um, like, you know '.repeat(10000)
      };
      
      const result = await textProcessor.processTranscription(largeTranscription);
      expect(result.metadata.processingDuration).toBeLessThan(PROCESSING_TIME_LIMIT);
    });

    it('should update metadata with processing statistics', async () => {
      const result = await textProcessor.processTranscription(sampleTranscription);
      
      expect(result.metadata).toHaveProperty('noiseLevel');
      expect(result.metadata).toHaveProperty('processingDuration');
      expect(result.metadata).toHaveProperty('wordCount');
      expect(result.metadata).toHaveProperty('qualityScore');
    });

    it('should handle processing errors with proper logging', async () => {
      const invalidTranscription = {
        ...sampleTranscription,
        content: null
      } as unknown as Transcription;
      
      await expect(textProcessor.processTranscription(invalidTranscription))
        .rejects
        .toThrow();
      
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('processChunk', () => {
    it('should process transcription chunks in sequence', async () => {
      const chunk = 'Um, this is a test chunk, like, you know?';
      
      const result = await textProcessor.processChunk(chunk, sampleSpeakerData);
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('speakerData');
      expect(result).toHaveProperty('noiseLevel');
    });

    it('should process chunks within real-time constraints', async () => {
      const chunk = 'Um, testing real-time processing constraints.';
      const startTime = Date.now();
      
      await textProcessor.processChunk(chunk, sampleSpeakerData);
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(CHUNK_PROCESSING_LIMIT);
    });

    it('should maintain chunk integrity during processing', async () => {
      const chunks = [
        'First chunk with um, like, filler words.',
        'Second chunk with, you know, more fillers.'
      ];
      
      const results = await Promise.all(
        chunks.map(chunk => textProcessor.processChunk(chunk, sampleSpeakerData))
      );
      
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.noiseLevel).toBeDefined();
        expect(result.content).not.toContain('um');
        expect(result.content).not.toContain('like');
      });
    });

    it('should handle chunk boundary conditions', async () => {
      const incompleteChunk = 'This sentence is cut';
      const completingChunk = 'off in the middle.';
      
      const result1 = await textProcessor.processChunk(incompleteChunk, sampleSpeakerData);
      const result2 = await textProcessor.processChunk(completingChunk, sampleSpeakerData);
      
      expect(result1.content).toBeDefined();
      expect(result2.content).toBeDefined();
    });
  });

  describe('Performance Validation', () => {
    it('should maintain performance under concurrent load', async () => {
      const concurrentChunks = Array(10).fill('Test chunk with some, um, filler words.');
      const startTime = Date.now();
      
      await Promise.all(
        concurrentChunks.map(chunk => textProcessor.processChunk(chunk, sampleSpeakerData))
      );
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(CHUNK_PROCESSING_LIMIT * 2);
    });

    it('should optimize memory usage during processing', async () => {
      const startMemory = process.memoryUsage().heapUsed;
      
      await textProcessor.processTranscription(sampleTranscription);
      
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;
      expect(memoryUsed).toBeLessThan(100 * 1024 * 1024); // 100MB limit
    });
  });
});