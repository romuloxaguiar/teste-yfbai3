/**
 * @fileoverview Model class for meeting minutes with comprehensive business logic and validation
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common'; // v9.x
import { validate, validateOrReject, ValidationError } from 'class-validator'; // v0.14.x
import { plainToClass, Transform } from 'class-transformer'; // v0.5.x
import { v4 as uuidv4 } from 'uuid'; // v9.x

import { 
  Minutes, 
  Topic, 
  ActionItem, 
  Decision, 
  MinutesStatus,
  ProcessingMetadata,
  ActionItemStatus,
  Priority,
  Impact
} from '../../../shared/types/minutes.types';
import { MinutesEntity, TopicEntity, ActionItemEntity, DecisionEntity } from '../../../shared/database/schemas/minutes.schema';
import { ErrorCode, ServiceError, ErrorSeverity } from '../../../shared/constants/error-codes';

/**
 * Comprehensive model class for handling meeting minutes with enhanced validation and error handling
 */
@Injectable()
export class MinutesModel implements Minutes {
  readonly id: string;
  readonly meetingId: string;
  readonly summary: string;
  readonly topics: ReadonlyArray<Topic>;
  readonly actionItems: ReadonlyArray<ActionItem>;
  readonly decisions: ReadonlyArray<Decision>;
  readonly status: MinutesStatus;
  readonly generatedAt: Date;
  readonly processingMetadata: ProcessingMetadata;

  private readonly logger = new Logger(MinutesModel.name);

  /**
   * Creates a new MinutesModel instance with comprehensive validation
   */
  constructor(minutesData: Partial<Minutes>) {
    this.logger.debug(`Initializing MinutesModel with data: ${JSON.stringify(minutesData)}`);

    if (!minutesData) {
      throw new Error('Minutes data is required');
    }

    // Transform plain object to class instance
    const transformedData = plainToClass(MinutesModel, {
      id: minutesData.id || uuidv4(),
      meetingId: minutesData.meetingId,
      summary: minutesData.summary,
      topics: minutesData.topics || [],
      actionItems: minutesData.actionItems || [],
      decisions: minutesData.decisions || [],
      status: minutesData.status || MinutesStatus.GENERATING,
      generatedAt: minutesData.generatedAt || new Date(),
      processingMetadata: minutesData.processingMetadata
    });

    Object.assign(this, transformedData);
  }

  /**
   * Converts model to database entity with validation
   */
  async toEntity(): Promise<MinutesEntity> {
    this.logger.debug(`Converting MinutesModel to Entity: ${this.id}`);

    const entity = new MinutesEntity();
    entity.id = this.id;
    entity.meetingId = this.meetingId;
    entity.summary = this.summary;
    entity.status = this.status;
    entity.generatedAt = this.generatedAt;
    entity.contentConfidence = this.processingMetadata?.overallConfidence || 0;
    entity.metadata = {
      processingMetadata: this.processingMetadata
    };

    // Transform topics
    entity.topics = this.topics.map(topic => {
      const topicEntity = new TopicEntity();
      topicEntity.id = topic.id;
      topicEntity.title = topic.title;
      topicEntity.content = topic.content;
      topicEntity.confidence = topic.confidence;
      return topicEntity;
    });

    // Transform action items
    entity.actionItems = this.actionItems.map(item => {
      const actionItemEntity = new ActionItemEntity();
      actionItemEntity.id = item.id;
      actionItemEntity.description = item.description;
      actionItemEntity.assigneeId = item.assigneeId;
      actionItemEntity.dueDate = item.dueDate;
      actionItemEntity.status = item.status;
      actionItemEntity.confidence = item.confidence;
      actionItemEntity.priority = item.priority;
      return actionItemEntity;
    });

    // Transform decisions
    entity.decisions = this.decisions.map(decision => {
      const decisionEntity = new DecisionEntity();
      decisionEntity.id = decision.id;
      decisionEntity.description = decision.description;
      decisionEntity.madeBy = decision.madeBy;
      decisionEntity.timestamp = decision.timestamp;
      decisionEntity.confidence = decision.confidence;
      decisionEntity.impact = decision.impact;
      return decisionEntity;
    });

    await validateOrReject(entity);
    return entity;
  }

  /**
   * Creates model from database entity with validation
   */
  static async fromEntity(entity: MinutesEntity): Promise<MinutesModel> {
    if (!entity) {
      throw new Error('Entity is required');
    }

    const minutesData: Partial<Minutes> = {
      id: entity.id,
      meetingId: entity.meetingId,
      summary: entity.summary,
      status: entity.status,
      generatedAt: entity.generatedAt,
      processingMetadata: entity.metadata?.processingMetadata as ProcessingMetadata,

      topics: entity.topics.map(topic => ({
        id: topic.id,
        title: topic.title,
        content: topic.content,
        confidence: topic.confidence,
        subtopics: [],
        startTime: new Date(),
        endTime: new Date()
      })),

      actionItems: entity.actionItems.map(item => ({
        id: item.id,
        description: item.description,
        assigneeId: item.assigneeId,
        dueDate: item.dueDate,
        status: item.status,
        confidence: item.confidence,
        priority: item.priority
      })),

      decisions: entity.decisions.map(decision => ({
        id: decision.id,
        description: decision.description,
        madeBy: decision.madeBy,
        timestamp: decision.timestamp,
        confidence: decision.confidence,
        impact: decision.impact
      }))
    };

    return new MinutesModel(minutesData);
  }

  /**
   * Performs comprehensive validation of minutes data
   */
  async validate(): Promise<ValidationError[]> {
    this.logger.debug(`Validating MinutesModel: ${this.id}`);

    const validationErrors: ValidationError[] = await validate(this, {
      validationError: { target: false },
      whitelist: true,
      forbidNonWhitelisted: true
    });

    if (validationErrors.length > 0) {
      const error: ServiceError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Minutes validation failed',
        details: { validationErrors },
        correlationId: uuidv4(),
        timestamp: new Date(),
        severity: ErrorSeverity.WARNING
      };
      this.logger.warn(`Validation failed: ${JSON.stringify(error)}`);
      throw error;
    }

    return validationErrors;
  }
}

export { MinutesModel };