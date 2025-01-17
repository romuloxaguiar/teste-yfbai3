/**
 * @fileoverview Teams notification service for meeting minutes status updates
 * @version 1.0.0
 */

import { Client } from '@microsoft/microsoft-graph-client'; // v3.0.0
import { DefaultAzureCredential } from '@azure/identity'; // v3.0.0
import { injectable } from 'inversify'; // v5.1.1
import { Minutes, MinutesStatus } from '../../../shared/types/minutes.types';
import { handleError } from '../../../shared/utils/error-handler';
import { Logger } from '../../../shared/utils/logger';
import { ErrorCode } from '../../../shared/constants/error-codes';

/**
 * Configuration interface for Teams notification service
 */
interface TeamsNotificationConfig {
  maxRetries: number;
  retryDelay: number;
  retryMultiplier: number;
  maxRetryDelay: number;
}

/**
 * Service responsible for sending Teams notifications about meeting minutes status
 */
@injectable()
export class TeamsNotificationService {
  private readonly logger: Logger;
  private readonly graphClient: Client;
  private readonly retryConfig: TeamsNotificationConfig;

  constructor(logger: Logger) {
    this.logger = logger;
    
    // Initialize Microsoft Graph client with Azure credentials
    const credential = new DefaultAzureCredential();
    this.graphClient = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = await credential.getToken('https://graph.microsoft.com/.default');
          return token.token;
        }
      }
    });

    // Configure retry settings
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      retryMultiplier: 2,
      maxRetryDelay: 10000
    };
  }

  /**
   * Creates an adaptive card for minutes generation notification
   */
  private createMinutesGeneratedCard(minutes: Minutes): any {
    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          size: 'Large',
          weight: 'Bolder',
          text: 'Meeting Minutes Generated'
        },
        {
          type: 'FactSet',
          facts: [
            {
              title: 'Status',
              value: minutes.status
            },
            {
              title: 'Generated At',
              value: `${minutes.generatedAt.toLocaleString()}`
            }
          ]
        },
        {
          type: 'ActionSet',
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'View Minutes',
              url: `${process.env.APP_URL}/minutes/${minutes.id}`
            }
          ]
        }
      ]
    };
  }

  /**
   * Creates an adaptive card for distribution status notification
   */
  private createDistributionStatusCard(minutes: Minutes, success: boolean): any {
    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          size: 'Large',
          weight: 'Bolder',
          text: `Minutes Distribution ${success ? 'Successful' : 'Failed'}`
        },
        {
          type: 'FactSet',
          facts: [
            {
              title: 'Status',
              value: minutes.status
            },
            {
              title: 'Distribution Time',
              value: new Date().toLocaleString()
            }
          ]
        }
      ]
    };
  }

  /**
   * Sends a notification with retry logic
   */
  private async sendNotification(chatId: string, card: any, correlationId: string): Promise<void> {
    let retryCount = 0;
    let delay = this.retryConfig.retryDelay;

    while (retryCount < this.retryConfig.maxRetries) {
      try {
        await this.graphClient.api(`/chats/${chatId}/messages`)
          .post({
            body: {
              contentType: 'html',
              content: '',
              attachments: [
                {
                  contentType: 'application/vnd.microsoft.card.adaptive',
                  content: card
                }
              ]
            }
          });
        
        this.logger.info('Teams notification sent successfully', {
          correlationId,
          chatId,
          retryCount
        });
        return;

      } catch (error) {
        retryCount++;
        if (retryCount === this.retryConfig.maxRetries) {
          throw await handleError(error, {
            correlationId,
            chatId,
            retryCount
          });
        }

        this.logger.warn(`Teams notification failed, retrying (${retryCount}/${this.retryConfig.maxRetries})`, {
          correlationId,
          chatId,
          error: error.message
        });

        // Exponential backoff with jitter
        delay = Math.min(
          delay * this.retryConfig.retryMultiplier * (1 + Math.random() * 0.1),
          this.retryConfig.maxRetryDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Sends notification when meeting minutes are generated
   */
  public async sendMinutesGeneratedNotification(minutes: Minutes): Promise<void> {
    const correlationId = `minutes-notification-${minutes.id}`;
    
    try {
      this.logger.info('Sending minutes generated notification', {
        correlationId,
        minutesId: minutes.id,
        meetingId: minutes.meetingId
      });

      const card = this.createMinutesGeneratedCard(minutes);
      await this.sendNotification(
        minutes.meetingId.toString(),
        card,
        correlationId
      );

    } catch (error) {
      throw await handleError(error, {
        correlationId,
        minutesId: minutes.id,
        errorCode: ErrorCode.TEAMS_API_ERROR
      });
    }
  }

  /**
   * Sends notification about minutes distribution status
   */
  public async sendDistributionStatusNotification(minutes: Minutes, success: boolean): Promise<void> {
    const correlationId = `distribution-notification-${minutes.id}`;
    
    try {
      this.logger.info('Sending distribution status notification', {
        correlationId,
        minutesId: minutes.id,
        success
      });

      const card = this.createDistributionStatusCard(minutes, success);
      await this.sendNotification(
        minutes.meetingId.toString(),
        card,
        correlationId
      );

    } catch (error) {
      throw await handleError(error, {
        correlationId,
        minutesId: minutes.id,
        success,
        errorCode: ErrorCode.TEAMS_API_ERROR
      });
    }
  }
}