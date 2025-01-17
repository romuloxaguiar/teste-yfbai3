/**
 * @fileoverview Database schema and ORM entity mapping for Microsoft Teams meetings
 * @version 1.0.0
 */

import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  Index, 
  Check,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm'; // v0.3.x

import { 
  Meeting,
  MeetingStatus,
  MeetingMetadata,
  Participant,
  ParticipantRole
} from '../../types/meeting.types';

/**
 * TypeORM entity representing a Teams meeting with enhanced security and validation
 */
@Entity('meetings')
@Index(['organizerId', 'startTime']) // Optimize queries for organizer's meetings
@Index(['status']) // Optimize status-based filtering
@Check(`"startTime" < "endTime"`) // Ensure valid meeting duration
export class MeetingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    nullable: false,
    comment: 'Azure AD user ID of meeting organizer'
  })
  @Index()
  organizerId!: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    nullable: false,
    comment: 'Meeting title'
  })
  title!: string;

  @Column({ 
    type: 'timestamp with time zone', 
    nullable: false,
    comment: 'Meeting start time'
  })
  startTime!: Date;

  @Column({ 
    type: 'timestamp with time zone', 
    nullable: true,
    comment: 'Meeting end time'
  })
  endTime?: Date;

  @Column({ 
    type: 'enum', 
    enum: MeetingStatus, 
    default: MeetingStatus.SCHEDULED,
    comment: 'Current meeting status'
  })
  status!: MeetingStatus;

  @Column({ 
    type: 'jsonb', 
    nullable: false,
    comment: 'Meeting participants with roles and timing'
  })
  participants!: Participant[];

  @Column({ 
    type: 'jsonb', 
    nullable: false,
    comment: 'Meeting configuration and processing metadata'
  })
  metadata!: MeetingMetadata;

  @CreateDateColumn({ 
    type: 'timestamp with time zone',
    comment: 'Record creation timestamp'
  })
  createdAt!: Date;

  @UpdateDateColumn({ 
    type: 'timestamp with time zone',
    comment: 'Record last update timestamp'
  })
  updatedAt!: Date;

  @Column({ 
    type: 'boolean', 
    default: false,
    comment: 'Soft delete flag'
  })
  isDeleted!: boolean;

  /**
   * Validates meeting metadata structure and constraints
   * @param metadata Meeting metadata to validate
   * @returns boolean indicating validation result
   */
  private validateMetadata(metadata: MeetingMetadata): boolean {
    if (!metadata.teamsId || typeof metadata.teamsId !== 'string') {
      return false;
    }

    if (typeof metadata.transcriptionEnabled !== 'boolean' ||
        typeof metadata.recordingEnabled !== 'boolean' ||
        typeof metadata.autoMinutesEnabled !== 'boolean') {
      return false;
    }

    if (metadata.aiProcessingMetadata) {
      const { status, startTime } = metadata.aiProcessingMetadata;
      if (!['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'].includes(status)) {
        return false;
      }
      if (!(startTime instanceof Date)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Converts entity to DTO format with enhanced error handling
   * @returns Meeting DTO object
   * @throws Error if entity data is invalid
   */
  toDTO(): Meeting {
    // Validate metadata before conversion
    if (!this.validateMetadata(this.metadata)) {
      throw new Error('Invalid meeting metadata structure');
    }

    // Validate participants data
    if (!Array.isArray(this.participants)) {
      throw new Error('Invalid participants data structure');
    }

    // Ensure all participants have valid roles
    const hasInvalidRole = this.participants.some(
      p => !Object.values(ParticipantRole).includes(p.role)
    );
    if (hasInvalidRole) {
      throw new Error('Invalid participant role detected');
    }

    return {
      id: this.id,
      organizerId: this.organizerId,
      title: this.title,
      startTime: this.startTime,
      endTime: this.endTime,
      status: this.status,
      participants: Object.freeze([...this.participants]),
      metadata: Object.freeze({...this.metadata}),
    };
  }
}