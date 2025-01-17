/**
 * @fileoverview Enhanced template service for secure document generation
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common'; // v9.0.0
import LRUCache from 'lru-cache'; // v7.0.0
import * as handlebars from 'handlebars'; // v4.7.0
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { Minutes } from '../../shared/types/minutes.types';
import { config } from '../config';
import { ValidationError } from '../../shared/utils/validation';
import { ErrorCode } from '../../shared/constants/error-codes';

/**
 * Interface for template processing metrics
 */
interface TemplateMetrics {
  loadTime: number;
  compileTime: number;
  renderTime: number;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * Interface for template security context
 */
interface SecurityContext {
  allowedHelpers: Set<string>;
  sanitizationRules: Map<string, RegExp>;
  maxDepth: number;
  maxLength: number;
}

/**
 * Enhanced service for managing document templates with security and performance
 */
@Injectable()
export class TemplateService {
  private readonly templateCache: LRUCache<string, handlebars.TemplateDelegate>;
  private readonly logger: Logger;
  private readonly metrics: TemplateMetrics;
  private readonly securityContext: SecurityContext;
  private readonly basePath: string;
  private readonly defaultTemplate: string;

  constructor() {
    // Initialize template cache with configuration
    this.templateCache = new LRUCache({
      max: config.templates.cacheSize,
      ttl: config.performance.cache.ttl,
      updateAgeOnGet: true,
      allowStale: false
    });

    // Initialize logger with correlation support
    this.logger = new Logger(TemplateService.name);

    // Initialize metrics tracking
    this.metrics = {
      loadTime: 0,
      compileTime: 0,
      renderTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    // Set base configuration
    this.basePath = config.templates.basePath;
    this.defaultTemplate = config.templates.defaultTemplate;

    // Initialize security context
    this.securityContext = {
      allowedHelpers: new Set(['formatDate', 'listFormat', 'sanitize']),
      sanitizationRules: new Map([
        ['html', /<[^>]*>/g],
        ['script', /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi]
      ]),
      maxDepth: 10,
      maxLength: 1000000 // 1MB
    };

    // Register secure template helpers
    this.registerHelpers();

    // Warmup cache if enabled
    if (config.templates.warmup) {
      this.warmupCache().catch(error => 
        this.logger.error('Cache warmup failed', { error, correlationId: uuidv4() })
      );
    }
  }

  /**
   * Loads and compiles a template with security validation
   * @param templateName Name of template to load
   * @param correlationId Request correlation ID
   * @returns Compiled template function
   */
  public async loadTemplate(
    templateName: string = this.defaultTemplate,
    correlationId: string
  ): Promise<handlebars.TemplateDelegate> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cachedTemplate = this.templateCache.get(templateName);
      if (cachedTemplate) {
        this.metrics.cacheHits++;
        return cachedTemplate;
      }

      this.metrics.cacheMisses++;

      // Validate template path
      const templatePath = path.join(this.basePath, `${templateName}.hbs`);
      if (!templatePath.startsWith(this.basePath)) {
        throw new ValidationError('Invalid template path', { templateName });
      }

      // Load template with security checks
      const template = await fs.readFile(templatePath, 'utf-8');
      if (template.length > this.securityContext.maxLength) {
        throw new ValidationError('Template exceeds maximum size', { 
          size: template.length,
          maxSize: this.securityContext.maxLength 
        });
      }

      // Validate template content
      this.validateTemplateContent(template);

      // Compile template with security context
      const compiled = handlebars.compile(template, {
        strict: true,
        preventIndent: true,
        noEscape: false
      });

      // Cache compiled template
      this.templateCache.set(templateName, compiled);

      this.metrics.loadTime = Date.now() - startTime;
      return compiled;

    } catch (error) {
      this.logger.error('Template loading failed', { 
        error,
        templateName,
        correlationId 
      });
      throw error;
    }
  }

  /**
   * Applies minutes data to template with validation
   * @param minutes Minutes data to format
   * @param templateName Optional template name
   * @param correlationId Request correlation ID
   * @returns Formatted document content
   */
  public async applyTemplate(
    minutes: Minutes,
    templateName?: string,
    correlationId: string = uuidv4()
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Validate minutes data
      if (config.templates.validation.enabled) {
        config.templates.validation.schema(minutes);
      }

      // Sanitize input data
      const sanitizedMinutes = this.sanitizeInput(minutes);

      // Load template
      const template = await this.loadTemplate(templateName, correlationId);

      // Apply template with security context
      const result = template(sanitizedMinutes);

      // Validate output
      if (result.length > this.securityContext.maxLength) {
        throw new ValidationError('Generated content exceeds maximum size', {
          size: result.length,
          maxSize: this.securityContext.maxLength
        });
      }

      this.metrics.renderTime = Date.now() - startTime;
      return result;

    } catch (error) {
      this.logger.error('Template application failed', {
        error,
        minutesId: minutes.id,
        correlationId
      });
      throw error;
    }
  }

  /**
   * Registers secure custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Secure date formatting
    handlebars.registerHelper('formatDate', (date: Date) => {
      if (!(date instanceof Date)) return '';
      return date.toISOString();
    });

    // Secure list formatting
    handlebars.registerHelper('listFormat', (items: any[]) => {
      if (!Array.isArray(items)) return '';
      return items
        .map(item => this.sanitizeString(item.toString()))
        .join(', ');
    });

    // Content sanitization
    handlebars.registerHelper('sanitize', (content: string) => {
      return this.sanitizeString(content);
    });
  }

  /**
   * Validates template content for security issues
   * @param content Template content to validate
   */
  private validateTemplateContent(content: string): void {
    // Check for unauthorized helpers
    const helperPattern = /{{#(\w+)}}/g;
    let match;
    while ((match = helperPattern.exec(content)) !== null) {
      if (!this.securityContext.allowedHelpers.has(match[1])) {
        throw new ValidationError('Unauthorized template helper', { helper: match[1] });
      }
    }

    // Check template nesting depth
    const nestingDepth = (content.match(/{{{?/g) || []).length;
    if (nestingDepth > this.securityContext.maxDepth) {
      throw new ValidationError('Template exceeds maximum nesting depth', {
        depth: nestingDepth,
        maxDepth: this.securityContext.maxDepth
      });
    }
  }

  /**
   * Sanitizes input data for template processing
   * @param minutes Minutes data to sanitize
   * @returns Sanitized minutes data
   */
  private sanitizeInput(minutes: Minutes): Minutes {
    return {
      ...minutes,
      summary: this.sanitizeString(minutes.summary),
      topics: minutes.topics.map(topic => ({
        ...topic,
        title: this.sanitizeString(topic.title),
        content: this.sanitizeString(topic.content),
        subtopics: topic.subtopics.map(subtopic => ({
          ...subtopic,
          title: this.sanitizeString(subtopic.title),
          content: this.sanitizeString(subtopic.content)
        }))
      })),
      actionItems: minutes.actionItems.map(item => ({
        ...item,
        description: this.sanitizeString(item.description)
      })),
      decisions: minutes.decisions.map(decision => ({
        ...decision,
        description: this.sanitizeString(decision.description)
      }))
    };
  }

  /**
   * Sanitizes string content
   * @param content String to sanitize
   * @returns Sanitized string
   */
  private sanitizeString(content: string): string {
    if (typeof content !== 'string') return '';
    
    let sanitized = content;
    for (const [, pattern] of this.securityContext.sanitizationRules) {
      sanitized = sanitized.replace(pattern, '');
    }
    return sanitized;
  }

  /**
   * Warms up template cache
   */
  private async warmupCache(): Promise<void> {
    try {
      const templates = await fs.readdir(this.basePath);
      await Promise.all(
        templates
          .filter(file => file.endsWith('.hbs'))
          .map(file => this.loadTemplate(
            path.basename(file, '.hbs'),
            uuidv4()
          ))
      );
    } catch (error) {
      this.logger.error('Cache warmup failed', { error });
    }
  }

  /**
   * Clears template cache
   * @param correlationId Request correlation ID
   */
  public clearCache(correlationId: string): void {
    this.logger.log('Clearing template cache', { correlationId });
    this.templateCache.clear();
    this.metrics.cacheHits = 0;
    this.metrics.cacheMisses = 0;
  }
}