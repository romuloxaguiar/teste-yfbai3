/**
 * @fileoverview TypeORM entity schema for meeting transcriptions
 * @version 1.0.0
 */

import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne, 
  Index,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm'; // v0.3.x

import { 
  Transcription,
  TranscriptionStatus,
  SpeakerData,
  TranscriptionMetadata 
} from '../../types/transcription.types';

import { Meeting } from '../../types/meeting.types';
import { ErrorCode } from '../../constants/error-codes';

/**
 * TypeORM entity for storing and managing meeting transcription data
 * Implements time-based partitioning and optimized indexing for query performance
 */
@Entity('transcriptions')
@Index(['meetingId', 'timestamp']) // Optimize queries by meeting and time
@Index(['status']) // Support status-based filtering
@Index(['createdAt']) // Support retention policies
export class TranscriptionEntity implements Partial<Transcription> {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  meetingId!: string;

  @Column('text')
  content!: string;

  @Column('timestamp with time zone')
  timestamp!: Date;

  @Column({
    type: 'enum',
    enum: TranscriptionStatus,
    default: TranscriptionStatus.PROCESSING
  })
  status!: TranscriptionStatus;

  @Column('jsonb')
  speakerData!: SpeakerData[];

  @Column('jsonb')
  metadata!: TranscriptionMetadata;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  // Establish relationship with Meeting entity
  @ManyToOne('MeetingEntity', 'transcriptions', {
    onDelete: 'CASCADE',
    nullable: false
  })
  meeting!: Meeting;

  /**
   * Creates a new transcription entity instance
   * @param data - Partial transcription data for initialization
   */
  constructor(data?: Partial<TranscriptionEntity>) {
    if (data) {
      Object.assign(this, data);
    }
  }

  /**
   * Converts entity to a plain JSON object
   * Implements custom serialization for dates and complex objects
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      meetingId: this.meetingId,
      content: this.content,
      timestamp: this.timestamp.toISOString(),
      status: this.status,
      speakerData: this.speakerData,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }

  /**
   * Validates transcription data before save
   * @throws Error with DATABASE_ERROR code if validation fails
   */
  validate(): void {
    if (!this.content || !this.meetingId || !this.timestamp) {
      throw new Error(ErrorCode.DATABASE_ERROR);
    }
  }
}