/**
 * @fileoverview Transcription model implementation with enhanced data access and business logic
 * @version 1.0.0
 */

import { Injectable } from '@nestjs/common'; // v9.x
import { InjectRepository } from '@nestjs/typeorm'; // v9.x
import { Repository } from 'typeorm'; // v0.3.x
import { CacheManager } from '@nestjs/cache-manager'; // v1.x
import { Logger } from '@nestjs/common'; // v9.x

import { Transcription, TranscriptionStatus, isValidTranscriptionMetadata } from '../../../shared/types/transcription.types';
import { TranscriptionEntity } from '../../../shared/database/schemas/transcription.schema';
import { ErrorCode } from '../../../shared/constants/error-codes';

const CACHE_TTL = 300; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const CACHE_KEY_PREFIX = 'transcription:';

@Injectable()
export class TranscriptionModel {
  constructor(
    @InjectRepository(TranscriptionEntity)
    private readonly transcriptionRepository: Repository<TranscriptionEntity>,
    private readonly cacheManager: CacheManager,
    private readonly logger: Logger
  ) {
    this.logger.setContext('TranscriptionModel');
  }

  /**
   * Creates a new transcription with validation and error handling
   * @param transcriptionData - The transcription data to create
   * @returns Promise<TranscriptionEntity>
   * @throws Error with DATABASE_ERROR code if creation fails
   */
  async createTranscription(transcriptionData: Omit<Transcription, 'id'>): Promise<TranscriptionEntity> {
    this.logger.debug(`Creating transcription for meeting: ${transcriptionData.meetingId}`);

    try {
      // Validate transcription metadata
      if (!isValidTranscriptionMetadata(transcriptionData.metadata)) {
        throw new Error('Invalid transcription metadata');
      }

      const transcriptionEntity = new TranscriptionEntity({
        ...transcriptionData,
        status: TranscriptionStatus.PROCESSING
      });

      // Validate entity before save
      transcriptionEntity.validate();

      // Save with retry mechanism
      let retryCount = 0;
      while (retryCount < MAX_RETRY_ATTEMPTS) {
        try {
          const savedEntity = await this.transcriptionRepository.save(transcriptionEntity);
          this.logger.log(`Created transcription: ${savedEntity.id}`);
          return savedEntity;
        } catch (error) {
          retryCount++;
          if (retryCount === MAX_RETRY_ATTEMPTS) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      throw new Error(ErrorCode.DATABASE_ERROR);
    } catch (error) {
      this.logger.error(`Failed to create transcription: ${error.message}`, error.stack);
      throw new Error(ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * Updates an existing transcription with optimistic locking
   * @param id - The transcription ID
   * @param updateData - Partial transcription data to update
   * @returns Promise<TranscriptionEntity>
   * @throws Error with DATABASE_ERROR code if update fails
   */
  async updateTranscription(
    id: string,
    updateData: Partial<Omit<Transcription, 'id' | 'meetingId'>>
  ): Promise<TranscriptionEntity> {
    this.logger.debug(`Updating transcription: ${id}`);

    try {
      const existingTranscription = await this.transcriptionRepository.findOne({ 
        where: { id },
        lock: { mode: 'optimistic' }
      });

      if (!existingTranscription) {
        throw new Error(ErrorCode.NOT_FOUND);
      }

      const updatedTranscription = {
        ...existingTranscription,
        ...updateData
      };

      // Validate updated entity
      updatedTranscription.validate();

      const savedEntity = await this.transcriptionRepository.save(updatedTranscription);
      
      // Invalidate cache
      await this.cacheManager.del(`${CACHE_KEY_PREFIX}${id}`);
      
      this.logger.log(`Updated transcription: ${id}`);
      return savedEntity;
    } catch (error) {
      this.logger.error(`Failed to update transcription ${id}: ${error.message}`, error.stack);
      throw new Error(error.message === ErrorCode.NOT_FOUND ? ErrorCode.NOT_FOUND : ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * Retrieves a transcription by ID with caching
   * @param id - The transcription ID
   * @returns Promise<TranscriptionEntity>
   * @throws Error with DATABASE_ERROR code if retrieval fails
   */
  async getTranscription(id: string): Promise<TranscriptionEntity> {
    this.logger.debug(`Retrieving transcription: ${id}`);

    try {
      // Check cache first
      const cachedTranscription = await this.cacheManager.get<TranscriptionEntity>(`${CACHE_KEY_PREFIX}${id}`);
      if (cachedTranscription) {
        this.logger.debug(`Cache hit for transcription: ${id}`);
        return cachedTranscription;
      }

      const transcription = await this.transcriptionRepository.findOne({ 
        where: { id },
        relations: ['meeting']
      });

      if (!transcription) {
        throw new Error(ErrorCode.NOT_FOUND);
      }

      // Cache the result
      await this.cacheManager.set(`${CACHE_KEY_PREFIX}${id}`, transcription, CACHE_TTL);

      this.logger.debug(`Retrieved transcription: ${id}`);
      return transcription;
    } catch (error) {
      this.logger.error(`Failed to retrieve transcription ${id}: ${error.message}`, error.stack);
      throw new Error(error.message === ErrorCode.NOT_FOUND ? ErrorCode.NOT_FOUND : ErrorCode.DATABASE_ERROR);
    }
  }

  /**
   * Retrieves all transcriptions for a meeting with time-based partitioning
   * @param meetingId - The meeting ID
   * @param timeRange - Optional time range for filtering
   * @returns Promise<TranscriptionEntity[]>
   * @throws Error with DATABASE_ERROR code if retrieval fails
   */
  async getTranscriptionsByMeeting(
    meetingId: string,
    timeRange?: { startTime: Date; endTime: Date }
  ): Promise<TranscriptionEntity[]> {
    this.logger.debug(`Retrieving transcriptions for meeting: ${meetingId}`);

    try {
      const queryBuilder = this.transcriptionRepository
        .createQueryBuilder('transcription')
        .where('transcription.meetingId = :meetingId', { meetingId })
        .orderBy('transcription.timestamp', 'ASC');

      if (timeRange) {
        queryBuilder
          .andWhere('transcription.timestamp >= :startTime', { startTime: timeRange.startTime })
          .andWhere('transcription.timestamp <= :endTime', { endTime: timeRange.endTime });
      }

      const transcriptions = await queryBuilder.getMany();

      this.logger.debug(`Retrieved ${transcriptions.length} transcriptions for meeting: ${meetingId}`);
      return transcriptions;
    } catch (error) {
      this.logger.error(`Failed to retrieve transcriptions for meeting ${meetingId}: ${error.message}`, error.stack);
      throw new Error(ErrorCode.DATABASE_ERROR);
    }
  }
}