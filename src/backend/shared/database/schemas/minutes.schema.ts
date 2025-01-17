/**
 * @fileoverview Database schema definition for meeting minutes using TypeORM
 * @version 1.0.0
 */

import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  ManyToOne, 
  OneToMany, 
  Index, 
  Check 
} from 'typeorm'; // v0.3.x

import { 
  MinutesStatus, 
  ActionItemStatus, 
  Priority, 
  Impact 
} from '../../types/minutes.types';

/**
 * Entity class for meeting minutes with enhanced indexing and metadata support
 */
@Entity('minutes')
@Index(['meetingId', 'generatedAt'])
@Index(['status'])
@Index(['generatedAt'])
export class MinutesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  meetingId: string;

  @Column('text')
  summary: string;

  @Column({
    type: 'enum',
    enum: MinutesStatus,
    default: MinutesStatus.GENERATING
  })
  status: MinutesStatus;

  @Column('timestamp with time zone')
  generatedAt: Date;

  @Column('timestamp with time zone', { nullable: true })
  lastModifiedAt: Date;

  @Column('float', { 
    default: 0,
    precision: 4,
    scale: 3
  })
  @Check('content_confidence >= 0 AND content_confidence <= 1')
  contentConfidence: number;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, unknown>;

  @ManyToOne('MeetingEntity', 'minutes', { onDelete: 'CASCADE' })
  meeting: any;

  @OneToMany(() => TopicEntity, topic => topic.minutes, { 
    cascade: true,
    eager: true 
  })
  topics: TopicEntity[];

  @OneToMany(() => ActionItemEntity, actionItem => actionItem.minutes, {
    cascade: true,
    eager: true
  })
  actionItems: ActionItemEntity[];

  @OneToMany(() => DecisionEntity, decision => decision.minutes, {
    cascade: true,
    eager: true
  })
  decisions: DecisionEntity[];
}

/**
 * Entity class for meeting topics with confidence scoring
 */
@Entity('topics')
@Index(['minutesId'])
@Index(['confidence'])
export class TopicEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  minutesId: string;

  @Column('text')
  title: string;

  @Column('text')
  content: string;

  @Column('float', {
    precision: 4,
    scale: 3
  })
  @Check('confidence >= 0 AND confidence <= 1')
  confidence: number;

  @Column('float', {
    precision: 4,
    scale: 3,
    default: 0
  })
  @Check('relevance_score >= 0 AND relevance_score <= 1')
  relevanceScore: number;

  @ManyToOne(() => MinutesEntity, minutes => minutes.topics, { onDelete: 'CASCADE' })
  minutes: MinutesEntity;

  @OneToMany(() => TopicEntity, subtopic => subtopic.parentTopic, {
    cascade: true,
    nullable: true
  })
  subtopics: TopicEntity[];

  @ManyToOne(() => TopicEntity, topic => topic.subtopics, { nullable: true })
  parentTopic: TopicEntity;
}

/**
 * Entity class for action items with enhanced tracking
 */
@Entity('action_items')
@Index(['minutesId', 'assigneeId'])
@Index(['status'])
@Index(['dueDate'])
export class ActionItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  minutesId: string;

  @Column('text')
  description: string;

  @Column('text')
  assigneeId: string;

  @Column('timestamp with time zone', { nullable: true })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: ActionItemStatus,
    default: ActionItemStatus.PENDING
  })
  status: ActionItemStatus;

  @Column('float', {
    precision: 4,
    scale: 3
  })
  @Check('confidence >= 0 AND confidence <= 1')
  confidence: number;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM
  })
  priority: Priority;

  @Column('timestamp with time zone', { 
    default: () => 'CURRENT_TIMESTAMP' 
  })
  lastUpdatedAt: Date;

  @ManyToOne(() => MinutesEntity, minutes => minutes.actionItems, { onDelete: 'CASCADE' })
  minutes: MinutesEntity;
}

/**
 * Entity class for meeting decisions with metadata
 */
@Entity('decisions')
@Index(['minutesId', 'timestamp'])
@Index(['confidence'])
export class DecisionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  minutesId: string;

  @Column('text')
  description: string;

  @Column('text')
  madeBy: string;

  @Column('timestamp with time zone')
  timestamp: Date;

  @Column('float', {
    precision: 4,
    scale: 3
  })
  @Check('confidence >= 0 AND confidence <= 1')
  confidence: number;

  @Column({
    type: 'enum',
    enum: Impact,
    default: Impact.MEDIUM
  })
  impact: Impact;

  @Column('jsonb', { nullable: true })
  context: Record<string, unknown>;

  @ManyToOne(() => MinutesEntity, minutes => minutes.decisions, { onDelete: 'CASCADE' })
  minutes: MinutesEntity;
}