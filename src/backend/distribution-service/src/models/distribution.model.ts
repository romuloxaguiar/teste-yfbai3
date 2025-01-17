/**
 * @fileoverview Distribution model for managing meeting minutes delivery
 * @version 1.0.0
 */

import type { UUID } from 'crypto'; // v20.0.0
import type { Minutes } from '../../../shared/types/minutes.types';
import type { Meeting } from '../../../shared/types/meeting.types';

/**
 * @readonly
 * Enumeration of possible distribution states with comprehensive status tracking
 */
export enum DistributionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED'
}

/**
 * @readonly
 * Enumeration of recipient notification preferences
 */
export enum NotificationPreference {
  EMAIL = 'EMAIL',
  TEAMS = 'TEAMS',
  BOTH = 'BOTH'
}

/**
 * @readonly
 * Enumeration of delivery status for individual recipients
 */
export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING'
}

/**
 * Interface for tracking individual recipient delivery status
 */
export interface Recipient {
  readonly id: string;
  readonly email: string;
  readonly notificationPreference: NotificationPreference;
  readonly deliveryStatus: DeliveryStatus;
  readonly deliveredAt: Date | null;
  readonly teamsId: string | null;
  readonly retryCount: number;
  readonly lastError: string | null;
}

/**
 * Core interface for distribution tracking with comprehensive retry and error handling
 */
export interface Distribution {
  readonly id: UUID;
  readonly minutesId: UUID;
  readonly meetingId: UUID;
  readonly status: DistributionStatus;
  readonly recipients: ReadonlyArray<Recipient>;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
  readonly retryCount: number;
  readonly lastError: string | null;
  readonly maxRetries: number;
  readonly lastRetryAt: Date | null;
}

/**
 * Type guard to check if a value is a valid DistributionStatus
 */
export const isDistributionStatus = (value: unknown): value is DistributionStatus => {
  return Object.values(DistributionStatus).includes(value as DistributionStatus);
};

/**
 * Type guard to check if a value is a valid NotificationPreference
 */
export const isNotificationPreference = (value: unknown): value is NotificationPreference => {
  return Object.values(NotificationPreference).includes(value as NotificationPreference);
};

/**
 * Type guard to check if a value is a valid DeliveryStatus
 */
export const isDeliveryStatus = (value: unknown): value is DeliveryStatus => {
  return Object.values(DeliveryStatus).includes(value as DeliveryStatus);
};

/**
 * Type for distribution update operations that maintains immutability
 */
export type DistributionUpdate = Partial<Omit<Distribution, 'id' | 'minutesId' | 'meetingId' | 'createdAt'>>;

/**
 * Type for recipient update operations
 */
export type RecipientUpdate = Partial<Omit<Recipient, 'id' | 'email'>>;

/**
 * Creates a new distribution record for meeting minutes
 * @param minutes The generated meeting minutes
 * @param meeting The associated meeting data
 * @returns A new distribution record
 */
export const createDistribution = (minutes: Minutes, meeting: Meeting): Distribution => {
  const recipients: Recipient[] = meeting.participants.map(participant => ({
    id: participant.id,
    email: participant.email,
    notificationPreference: NotificationPreference.BOTH,
    deliveryStatus: DeliveryStatus.PENDING,
    deliveredAt: null,
    teamsId: null, // Will be populated during distribution
    retryCount: 0,
    lastError: null
  }));

  return {
    id: crypto.randomUUID() as UUID,
    minutesId: minutes.id,
    meetingId: meeting.id,
    status: DistributionStatus.PENDING,
    recipients: recipients,
    createdAt: new Date(),
    completedAt: null,
    retryCount: 0,
    lastError: null,
    maxRetries: 3,
    lastRetryAt: null
  };
};

/**
 * Updates the status of a distribution record
 * @param distributionId The ID of the distribution record
 * @param newStatus The new distribution status
 * @returns The updated distribution record
 */
export const updateDistributionStatus = (
  distribution: Distribution,
  newStatus: DistributionStatus
): Distribution => {
  const now = new Date();
  
  return {
    ...distribution,
    status: newStatus,
    completedAt: newStatus === DistributionStatus.COMPLETED ? now : distribution.completedAt,
    lastRetryAt: newStatus === DistributionStatus.RETRYING ? now : distribution.lastRetryAt,
    retryCount: newStatus === DistributionStatus.RETRYING ? distribution.retryCount + 1 : distribution.retryCount
  };
};

/**
 * Validates a distribution record
 * @param distribution The distribution record to validate
 * @returns True if the distribution record is valid
 */
export const isValidDistribution = (distribution: unknown): distribution is Distribution => {
  if (typeof distribution !== 'object' || distribution === null) return false;

  const dist = distribution as Distribution;
  return (
    typeof dist.id === 'string' &&
    typeof dist.minutesId === 'string' &&
    typeof dist.meetingId === 'string' &&
    isDistributionStatus(dist.status) &&
    Array.isArray(dist.recipients) &&
    dist.recipients.every(r => 
      typeof r.id === 'string' &&
      typeof r.email === 'string' &&
      isNotificationPreference(r.notificationPreference) &&
      isDeliveryStatus(r.deliveryStatus)
    ) &&
    dist.createdAt instanceof Date &&
    (dist.completedAt === null || dist.completedAt instanceof Date) &&
    typeof dist.retryCount === 'number' &&
    (dist.lastError === null || typeof dist.lastError === 'string') &&
    typeof dist.maxRetries === 'number' &&
    (dist.lastRetryAt === null || dist.lastRetryAt instanceof Date)
  );
};