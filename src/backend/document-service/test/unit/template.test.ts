/**
 * @fileoverview Unit tests for TemplateService class
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import { mock } from 'jest-mock';
import { TemplateService } from '../../src/services/template.service';
import { Minutes } from '../../../../shared/types/minutes.types';
import { ValidationError } from '../../../../shared/utils/validation';
import { ErrorCode } from '../../../../shared/constants/error-codes';

describe('TemplateService', () => {
  let templateService: TemplateService;
  const mockCorrelationId = '123e4567-e89b-12d3-a456-426614174000';
  const performanceThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Mock template content
  const mockTemplateContent = `
    <html>
      <body>
        <h1>{{summary}}</h1>
        {{#each topics}}
          <h2>{{title}}</h2>
          <p>{{content}}</p>
          {{#each subtopics}}
            <h3>{{title}}</h3>
            <p>{{content}}</p>
          {{/each}}
        {{/each}}
        <h2>Action Items</h2>
        {{#each actionItems}}
          <li>{{description}} - Assigned to: {{assigneeId}}</li>
        {{/each}}
        <h2>Decisions</h2>
        {{#each decisions}}
          <li>{{description}} - Made by: {{madeBy}}</li>
        {{/each}}
      </body>
    </html>
  `;

  // Mock minutes data
  const mockMinutesData: Minutes = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    meetingId: '123e4567-e89b-12d3-a456-426614174001',
    summary: 'Test Meeting Summary',
    topics: [{
      id: '123e4567-e89b-12d3-a456-426614174002',
      title: 'Test Topic',
      content: 'Test Content',
      confidence: 0.95,
      startTime: new Date(),
      endTime: new Date(),
      subtopics: []
    }],
    actionItems: [{
      id: '123e4567-e89b-12d3-a456-426614174003',
      description: 'Test Action Item',
      assigneeId: '123e4567-e89b-12d3-a456-426614174004',
      dueDate: new Date(),
      status: 'PENDING',
      confidence: 0.9,
      priority: 'HIGH'
    }],
    decisions: [{
      id: '123e4567-e89b-12d3-a456-426614174005',
      description: 'Test Decision',
      madeBy: '123e4567-e89b-12d3-a456-426614174006',
      timestamp: new Date(),
      confidence: 0.85,
      impact: 'HIGH'
    }],
    status: 'GENERATING',
    generatedAt: new Date(),
    processingMetadata: {
      processingStartTime: new Date(),
      processingEndTime: new Date(),
      processingDuration: 1000,
      modelVersion: '1.0.0',
      overallConfidence: 0.9
    }
  };

  beforeEach(() => {
    // Reset mocks and create fresh instance
    jest.clearAllMocks();
    templateService = new TemplateService();

    // Mock filesystem operations
    jest.spyOn(templateService as any, 'loadTemplate')
      .mockImplementation(async () => mockTemplateContent);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadTemplate', () => {
    it('should successfully load a template', async () => {
      const template = await templateService.loadTemplate('standard', mockCorrelationId);
      expect(template).toBeDefined();
      expect(typeof template).toBe('function');
    });

    it('should cache loaded templates', async () => {
      const loadSpy = jest.spyOn(templateService as any, 'loadTemplate');
      
      await templateService.loadTemplate('standard', mockCorrelationId);
      await templateService.loadTemplate('standard', mockCorrelationId);
      
      expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw ValidationError for invalid template path', async () => {
      const invalidPath = '../malicious/path';
      await expect(templateService.loadTemplate(invalidPath, mockCorrelationId))
        .rejects
        .toThrow(ValidationError);
    });

    it('should handle large templates within size limits', async () => {
      const largeMockTemplate = 'x'.repeat(900000); // Just under 1MB limit
      jest.spyOn(templateService as any, 'loadTemplate')
        .mockImplementation(async () => largeMockTemplate);
      
      const template = await templateService.loadTemplate('large', mockCorrelationId);
      expect(template).toBeDefined();
    });

    it('should throw error for templates exceeding size limit', async () => {
      const oversizedTemplate = 'x'.repeat(1100000); // Over 1MB limit
      jest.spyOn(templateService as any, 'loadTemplate')
        .mockImplementation(async () => oversizedTemplate);
      
      await expect(templateService.loadTemplate('oversized', mockCorrelationId))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('applyTemplate', () => {
    it('should successfully apply template to minutes data', async () => {
      const result = await templateService.applyTemplate(mockMinutesData, 'standard', mockCorrelationId);
      
      expect(result).toContain(mockMinutesData.summary);
      expect(result).toContain(mockMinutesData.topics[0].title);
      expect(result).toContain(mockMinutesData.actionItems[0].description);
      expect(result).toContain(mockMinutesData.decisions[0].description);
    });

    it('should complete processing within performance threshold', async () => {
      const startTime = Date.now();
      await templateService.applyTemplate(mockMinutesData, 'standard', mockCorrelationId);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(performanceThreshold);
    });

    it('should handle missing optional template name', async () => {
      const result = await templateService.applyTemplate(mockMinutesData, undefined, mockCorrelationId);
      expect(result).toBeDefined();
    });

    it('should sanitize HTML in input data', async () => {
      const unsafeMinutes = {
        ...mockMinutesData,
        summary: '<script>alert("xss")</script>Test Summary'
      };
      
      const result = await templateService.applyTemplate(unsafeMinutes, 'standard', mockCorrelationId);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Test Summary');
    });

    it('should validate minutes data structure', async () => {
      const invalidMinutes = {
        ...mockMinutesData,
        topics: undefined
      };
      
      await expect(templateService.applyTemplate(invalidMinutes as Minutes, 'standard', mockCorrelationId))
        .rejects
        .toThrow(ValidationError);
    });

    it('should handle deeply nested topic structures', async () => {
      const deepMinutes = {
        ...mockMinutesData,
        topics: [{
          ...mockMinutesData.topics[0],
          subtopics: [{
            id: '123e4567-e89b-12d3-a456-426614174007',
            title: 'Nested Topic',
            content: 'Nested Content',
            confidence: 0.8,
            startTime: new Date(),
            endTime: new Date(),
            subtopics: []
          }]
        }]
      };
      
      const result = await templateService.applyTemplate(deepMinutes, 'standard', mockCorrelationId);
      expect(result).toContain('Nested Topic');
      expect(result).toContain('Nested Content');
    });
  });

  describe('clearCache', () => {
    it('should successfully clear template cache', async () => {
      // Load template to populate cache
      await templateService.loadTemplate('standard', mockCorrelationId);
      
      // Clear cache
      templateService.clearCache(mockCorrelationId);
      
      // Verify cache is cleared by checking if template is reloaded
      const loadSpy = jest.spyOn(templateService as any, 'loadTemplate');
      await templateService.loadTemplate('standard', mockCorrelationId);
      expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent cache operations safely', async () => {
      const operations = [
        templateService.loadTemplate('standard', mockCorrelationId),
        templateService.clearCache(mockCorrelationId),
        templateService.loadTemplate('standard', mockCorrelationId)
      ];
      
      await expect(Promise.all(operations)).resolves.not.toThrow();
    });
  });
});