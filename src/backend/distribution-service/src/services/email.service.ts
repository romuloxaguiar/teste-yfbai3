/**
 * @fileoverview Enterprise-grade email distribution service for meeting minutes
 * @version 1.0.0
 */

import { Client } from '@microsoft/microsoft-graph-client'; // v3.0.0
import * as nodemailer from 'nodemailer'; // v6.9.0
import * as rax from 'retry-axios'; // v3.0.0
import { Minutes } from '../../../shared/types/minutes.types';
import { handleError } from '../../../shared/utils/error-handler';
import { Logger } from '../../../shared/utils/logger';

/**
 * Email content structure with HTML and plain text versions
 */
interface EmailContent {
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

/**
 * Email attachment configuration
 */
interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

/**
 * Email delivery tracking status
 */
interface DeliveryStatus {
  recipient: string;
  status: 'delivered' | 'failed' | 'pending';
  timestamp: Date;
  error?: Error;
  retryCount?: number;
}

/**
 * Email service configuration options
 */
interface EmailServiceConfig {
  graphClientOptions: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
  };
  smtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  retryConfig: {
    retries: number;
    minTimeout: number;
    maxTimeout: number;
  };
}

/**
 * Enterprise-grade email service for distributing meeting minutes
 */
export class EmailService {
  private readonly logger: Logger;
  private readonly graphClient: Client;
  private readonly emailTransporter: nodemailer.Transporter;
  private readonly retryConfig: rax.RetryConfig;
  private readonly deliveryTracker: Map<string, DeliveryStatus>;

  constructor(config: EmailServiceConfig) {
    // Initialize logger
    this.logger = new Logger({
      serviceName: 'email-service',
      environment: process.env.NODE_ENV || 'development'
    });

    // Initialize Graph client with retry mechanism
    this.graphClient = Client.init({
      authProvider: async (done) => {
        try {
          // Implement token acquisition logic here
          const token = 'your_token_here';
          done(null, token);
        } catch (error) {
          done(error as Error, null);
        }
      }
    });

    // Configure retry-axios
    this.retryConfig = {
      retry: config.retryConfig.retries,
      noResponseRetries: config.retryConfig.retries,
      retryDelay: this.getExponentialBackoff,
      statusCodesToRetry: [[500, 599]],
      onRetryAttempt: (err) => {
        this.logger.warn('Retrying email delivery', {
          error: err,
          attempt: (err.config?.raxConfig?.currentRetryAttempt || 0) + 1
        });
      }
    };

    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport(config.smtpConfig);

    // Initialize delivery tracking
    this.deliveryTracker = new Map<string, DeliveryStatus>();
  }

  /**
   * Sends meeting minutes to specified recipients
   */
  public async sendMinutesEmail(
    minutes: Minutes,
    recipients: string[],
    options: { priority?: 'high' | 'normal' | 'low' } = {}
  ): Promise<DeliveryStatus[]> {
    try {
      const emailContent = await this.generateEmailContent(minutes);
      const deliveryStatuses: DeliveryStatus[] = [];

      // Process recipients in batches to respect rate limits
      const batchSize = 50;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const batchPromises = batch.map(async (recipient) => {
          try {
            await this.sendEmail(recipient, emailContent, options);
            return this.updateDeliveryStatus(recipient, 'delivered');
          } catch (error) {
            const status = await this.handleDeliveryError(recipient, error as Error);
            return status;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        deliveryStatuses.push(...batchResults);
      }

      return deliveryStatuses;
    } catch (error) {
      throw await handleError(error as Error, {
        context: 'EmailService.sendMinutesEmail',
        minutesId: minutes.id,
        recipientCount: recipients.length
      });
    }
  }

  /**
   * Generates Teams-styled email content from minutes
   */
  private async generateEmailContent(minutes: Minutes): Promise<EmailContent> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Meeting Minutes: ${this.sanitizeHtml(minutes.summary)}</title>
          <style>
            /* Teams-styled CSS */
            body { font-family: 'Segoe UI', sans-serif; line-height: 1.5; color: #252424; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: #464775; color: white; padding: 20px; }
            .section { margin: 20px 0; padding: 15px; background: #f5f5f5; }
            .action-item { margin: 10px 0; padding: 10px; background: white; }
            .decision { margin: 10px 0; padding: 10px; background: white; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Meeting Minutes</h1>
              <p>${new Date(minutes.generatedAt).toLocaleString()}</p>
            </div>
            
            <div class="section">
              <h2>Summary</h2>
              <p>${this.sanitizeHtml(minutes.summary)}</p>
            </div>

            <div class="section">
              <h2>Topics Discussed</h2>
              ${this.renderTopics(minutes.topics)}
            </div>

            <div class="section">
              <h2>Action Items</h2>
              ${this.renderActionItems(minutes.actionItems)}
            </div>

            <div class="section">
              <h2>Decisions</h2>
              ${this.renderDecisions(minutes.decisions)}
            </div>
          </div>
        </body>
      </html>
    `;

    const text = this.generatePlainTextContent(minutes);

    return { html, text };
  }

  /**
   * Implements exponential backoff with jitter for retries
   */
  private getExponentialBackoff(retryCount: number): number {
    const base = Math.min(1000 * Math.pow(2, retryCount), 30000);
    const jitter = Math.random() * 1000;
    return base + jitter;
  }

  /**
   * Handles delivery errors with retry logic
   */
  private async handleDeliveryError(
    recipient: string,
    error: Error
  ): Promise<DeliveryStatus> {
    const currentStatus = this.deliveryTracker.get(recipient);
    const retryCount = (currentStatus?.retryCount || 0) + 1;

    if (retryCount <= this.retryConfig.retry!) {
      this.logger.warn(`Email delivery failed, attempting retry ${retryCount}`, {
        recipient,
        error: error.message
      });

      return {
        recipient,
        status: 'pending',
        timestamp: new Date(),
        error,
        retryCount
      };
    }

    return this.updateDeliveryStatus(recipient, 'failed', error);
  }

  /**
   * Updates delivery status tracking
   */
  private updateDeliveryStatus(
    recipient: string,
    status: 'delivered' | 'failed' | 'pending',
    error?: Error
  ): DeliveryStatus {
    const deliveryStatus: DeliveryStatus = {
      recipient,
      status,
      timestamp: new Date(),
      error,
      retryCount: this.deliveryTracker.get(recipient)?.retryCount
    };

    this.deliveryTracker.set(recipient, deliveryStatus);
    return deliveryStatus;
  }

  /**
   * Sanitizes HTML content for security
   */
  private sanitizeHtml(content: string): string {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Renders topics section with hierarchy
   */
  private renderTopics(topics: Minutes['topics']): string {
    return topics.map(topic => `
      <div class="topic">
        <h3>${this.sanitizeHtml(topic.title)}</h3>
        <p>${this.sanitizeHtml(topic.content)}</p>
        ${topic.subtopics?.length ? this.renderTopics(topic.subtopics) : ''}
      </div>
    `).join('');
  }

  /**
   * Renders action items section
   */
  private renderActionItems(actionItems: Minutes['actionItems']): string {
    return actionItems.map(item => `
      <div class="action-item">
        <strong>📋 ${this.sanitizeHtml(item.description)}</strong>
        <br>
        Assigned to: ${this.sanitizeHtml(item.assigneeId)}
        <br>
        Due: ${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Not specified'}
        <br>
        Priority: ${item.priority}
      </div>
    `).join('');
  }

  /**
   * Renders decisions section
   */
  private renderDecisions(decisions: Minutes['decisions']): string {
    return decisions.map(decision => `
      <div class="decision">
        <strong>✓ ${this.sanitizeHtml(decision.description)}</strong>
        <br>
        Made by: ${this.sanitizeHtml(decision.madeBy)}
        <br>
        Time: ${new Date(decision.timestamp).toLocaleString()}
      </div>
    `).join('');
  }

  /**
   * Generates plain text version of the email
   */
  private generatePlainTextContent(minutes: Minutes): string {
    return `
Meeting Minutes
Generated: ${new Date(minutes.generatedAt).toLocaleString()}

Summary:
${minutes.summary}

Topics Discussed:
${this.generatePlainTextTopics(minutes.topics)}

Action Items:
${minutes.actionItems.map(item => `
- ${item.description}
  Assigned to: ${item.assigneeId}
  Due: ${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Not specified'}
  Priority: ${item.priority}
`).join('\n')}

Decisions:
${minutes.decisions.map(decision => `
- ${decision.description}
  Made by: ${decision.madeBy}
  Time: ${new Date(decision.timestamp).toLocaleString()}
`).join('\n')}
    `.trim();
  }

  /**
   * Generates plain text version of topics
   */
  private generatePlainTextTopics(topics: Minutes['topics'], level = 0): string {
    return topics.map(topic => `
${'  '.repeat(level)}- ${topic.title}
${'  '.repeat(level)}  ${topic.content}
${topic.subtopics?.length ? this.generatePlainTextTopics(topic.subtopics, level + 1) : ''}
    `).join('\n');
  }
}