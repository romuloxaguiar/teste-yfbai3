/**
 * @fileoverview Integration tests for document service functionality
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing'; // v9.0.0
import { BlobServiceClient } from '@azure/storage-blob'; // v12.0.0
import { performance, PerformanceObserver } from 'perf_hooks';
import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from 'jest'; // v29.0.0
import { v4 as uuidv4 } from 'uuid';

import { DocumentService } from '../../src/services/document.service';
import { TemplateService } from '../../src/services/template.service';
import { PDFGenerator } from '../../src/utils/pdf-generator';
import { config } from '../../src/config';
import { Minutes, MinutesStatus, ActionItemStatus, Priority, Impact } from '../../../shared/types/minutes.types';
import { ValidationError } from '../../../shared/utils/validation';
import { ErrorCode } from '../../../shared/constants/error-codes';

describe('DocumentService Integration Tests', () => {
  let moduleRef: TestingModule;
  let documentService: DocumentService;
  let blobServiceClient: BlobServiceClient;
  let testContainerClient: any;
  let performanceObserver: PerformanceObserver;
  let testMinutes: Minutes;

  beforeAll(async () => {
    // Initialize performance monitoring
    performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        console.log(`${entry.name}: ${entry.duration}ms`);
      });
    });
    performanceObserver.observe({ entryTypes: ['measure'], buffered: true });

    // Set up test Azure storage
    blobServiceClient = BlobServiceClient.fromConnectionString(config.storage.connectionString);
    testContainerClient = blobServiceClient.getContainerClient(`test-minutes-${uuidv4()}`);
    await testContainerClient.create();

    // Create test module with real dependencies
    moduleRef = await Test.createTestingModule({
      providers: [
        DocumentService,
        TemplateService,
        PDFGenerator,
        {
          provide: BlobServiceClient,
          useValue: blobServiceClient
        },
        {
          provide: 'MetricsCollector',
          useValue: {
            trackEvent: jest.fn(),
            trackMetric: jest.fn(),
            trackException: jest.fn()
          }
        }
      ]
    }).compile();

    documentService = moduleRef.get<DocumentService>(DocumentService);
  });

  beforeEach(() => {
    // Initialize test minutes data
    testMinutes = {
      id: uuidv4(),
      meetingId: uuidv4(),
      summary: 'Test meeting summary',
      topics: [
        {
          id: uuidv4(),
          title: 'Test Topic 1',
          content: 'Test topic content',
          confidence: 0.95,
          subtopics: [],
          startTime: new Date(),
          endTime: new Date()
        }
      ],
      actionItems: [
        {
          id: uuidv4(),
          description: 'Test action item',
          assigneeId: uuidv4(),
          dueDate: new Date(),
          status: ActionItemStatus.PENDING,
          confidence: 0.9,
          priority: Priority.HIGH
        }
      ],
      decisions: [
        {
          id: uuidv4(),
          description: 'Test decision',
          madeBy: uuidv4(),
          timestamp: new Date(),
          confidence: 0.85,
          impact: Impact.HIGH
        }
      ],
      status: MinutesStatus.GENERATING,
      generatedAt: new Date(),
      processingMetadata: {
        processingStartTime: new Date(),
        processingEndTime: new Date(),
        processingDuration: 1000,
        modelVersion: '1.0.0',
        overallConfidence: 0.92
      }
    };
  });

  afterEach(async () => {
    // Clean up test documents
    const blobs = testContainerClient.listBlobsFlat();
    for await (const blob of blobs) {
      await testContainerClient.deleteBlob(blob.name);
    }
  });

  afterAll(async () => {
    // Clean up test container
    await testContainerClient.delete();
    performanceObserver.disconnect();
    await moduleRef.close();
  });

  describe('Document Generation', () => {
    it('should generate and store document within performance SLA', async () => {
      // Start performance measurement
      performance.mark('documentGeneration-start');

      // Generate document
      const result = await documentService.generateDocument(testMinutes, {
        format: 'pdf',
        accessibility: {
          enabled: true,
          compliance: 'WCAG2.1'
        }
      });

      // End performance measurement
      performance.mark('documentGeneration-end');
      performance.measure(
        'Document Generation Time',
        'documentGeneration-start',
        'documentGeneration-end'
      );

      // Verify result structure
      expect(result).toHaveProperty('documentId');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('metadata');

      // Verify document exists in storage
      const blobClient = testContainerClient.getBlobClient(result.documentId);
      const exists = await blobClient.exists();
      expect(exists).toBe(true);

      // Verify performance SLA
      const measure = performance.getEntriesByName('Document Generation Time')[0];
      expect(measure.duration).toBeLessThan(5000); // 5 seconds SLA
    });

    it('should handle large documents with proper optimization', async () => {
      // Create large test minutes
      const largeMinutes = {
        ...testMinutes,
        topics: Array(100).fill(testMinutes.topics[0]),
        actionItems: Array(50).fill(testMinutes.actionItems[0]),
        decisions: Array(50).fill(testMinutes.decisions[0])
      };

      const result = await documentService.generateDocument(largeMinutes, {
        format: 'pdf',
        compression: true
      });

      // Verify document size is within limits
      const blobClient = testContainerClient.getBlobClient(result.documentId);
      const properties = await blobClient.getProperties();
      expect(properties.contentLength).toBeLessThan(10 * 1024 * 1024); // 10MB limit
    });

    it('should enforce security and compliance requirements', async () => {
      const result = await documentService.generateDocument(testMinutes);

      // Verify document metadata
      const blobClient = testContainerClient.getBlobClient(result.documentId);
      const properties = await blobClient.getProperties();

      expect(properties.metadata).toHaveProperty('encrypted', 'true');
      expect(properties.metadata).toHaveProperty('correlationId');
      expect(properties.contentType).toBe('application/pdf');
    });
  });

  describe('Content Validation', () => {
    it('should validate document content accuracy', async () => {
      const result = await documentService.generateDocument(testMinutes);

      // Retrieve and validate document content
      const blobClient = testContainerClient.getBlobClient(result.documentId);
      const downloadResponse = await blobClient.download();
      const content = await streamToBuffer(downloadResponse.readableStreamBody!);

      // Verify content includes required sections
      const contentString = content.toString();
      expect(contentString).toContain(testMinutes.summary);
      expect(contentString).toContain(testMinutes.topics[0].title);
      expect(contentString).toContain(testMinutes.actionItems[0].description);
      expect(contentString).toContain(testMinutes.decisions[0].description);
    });

    it('should handle invalid minutes data appropriately', async () => {
      const invalidMinutes = {
        ...testMinutes,
        summary: '', // Invalid empty summary
      };

      await expect(documentService.generateDocument(invalidMinutes))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage failures gracefully', async () => {
      // Simulate storage failure
      jest.spyOn(testContainerClient, 'getBlockBlobClient').mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(documentService.generateDocument(testMinutes))
        .rejects
        .toMatchObject({
          code: ErrorCode.DATABASE_ERROR
        });
    });

    it('should handle template processing errors', async () => {
      // Create minutes with problematic content
      const problematicMinutes = {
        ...testMinutes,
        summary: '<script>alert("xss")</script>',
      };

      const result = await documentService.generateDocument(problematicMinutes);
      
      // Verify content was sanitized
      const blobClient = testContainerClient.getBlobClient(result.documentId);
      const downloadResponse = await blobClient.download();
      const content = await streamToBuffer(downloadResponse.readableStreamBody!);
      
      expect(content.toString()).not.toContain('<script>');
    });
  });
});

/**
 * Utility function to convert stream to buffer
 */
async function streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}