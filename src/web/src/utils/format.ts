/**
 * @fileoverview Utility functions for formatting various data types used in the web client
 * @version 1.0.0
 */

import { formatNumber } from 'intl'; // v2.1.0
import type { WebMeeting } from '../types/meeting.types';
import type { WebMinutes } from '../types/minutes.types';

/**
 * Formats a progress value as a localized percentage string
 * @param progress - Number between 0 and 1 representing progress
 * @returns Formatted percentage string with % symbol
 * @throws Error if progress value is invalid
 */
export const formatProgressPercentage = (progress: number): string => {
  if (progress < 0 || progress > 1 || !Number.isFinite(progress)) {
    throw new Error('Progress value must be between 0 and 1');
  }

  return new Intl.NumberFormat(navigator.language, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(progress);
};

/**
 * Formats an AI confidence score as a localized decimal string
 * @param confidence - Number between 0 and 1 representing confidence
 * @returns Formatted confidence score with 2 decimal places
 */
export const formatConfidenceScore = (confidence: number): string => {
  // Handle invalid inputs
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return new Intl.NumberFormat(navigator.language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(0);
  }

  return new Intl.NumberFormat(navigator.language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(confidence);
};

/**
 * Formats a topic title with proper capitalization and truncation
 * @param title - Raw topic title string
 * @param maxLength - Maximum length before truncation
 * @returns Formatted topic title
 */
export const formatTopicTitle = (title: string, maxLength: number = 100): string => {
  if (!title || typeof title !== 'string') {
    return '';
  }

  // Clean and normalize the title
  let formattedTitle = title
    .trim()
    .replace(/\s+/g, ' ') // Remove extra whitespace
    .replace(/[^\w\s\-.,?!]/g, ''); // Remove special chars except punctuation

  // Capitalize first letter of each sentence
  formattedTitle = formattedTitle.replace(
    /(^\w|\.\s+\w|\?\s+\w|\!\s+\w)/g,
    letter => letter.toUpperCase()
  );

  // Truncate if longer than maxLength
  if (formattedTitle.length > maxLength) {
    return `${formattedTitle.substring(0, maxLength - 3)}...`;
  }

  return formattedTitle;
};

/**
 * Maps action item status to a localized, user-friendly display string
 * @param status - ActionItemStatus enum value
 * @returns Formatted status string
 */
export const formatActionItemStatus = (status: ActionItemStatus): string => {
  const statusDisplayMap: Record<ActionItemStatus, string> = {
    'PENDING': 'Not Started',
    'IN_PROGRESS': 'In Progress',
    'COMPLETED': 'Completed'
  };

  // Return mapped value or fallback for unknown status
  return statusDisplayMap[status] || 'Unknown Status';
};

/**
 * Formats a meeting duration as a localized time string
 * @param startTime - Meeting start time
 * @param endTime - Meeting end time
 * @returns Formatted duration string
 */
export const formatMeetingDuration = (startTime: Date, endTime: Date): string => {
  const durationMs = endTime.getTime() - startTime.getTime();
  const minutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (remainingMinutes > 0 || parts.length === 0) {
    parts.push(`${remainingMinutes}m`);
  }

  return parts.join(' ');
};

/**
 * Formats a timestamp for display in the UI with localization
 * @param date - Date object to format
 * @param includeTime - Whether to include time in output
 * @returns Formatted date/time string
 */
export const formatTimestamp = (date: Date, includeTime: boolean = true): string => {
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: includeTime ? 'short' : undefined
  };

  return new Intl.DateTimeFormat(navigator.language, options).format(date);
};

/**
 * Formats participant count with proper pluralization
 * @param count - Number of participants
 * @returns Formatted participant count string
 */
export const formatParticipantCount = (count: number): string => {
  return new Intl.NumberFormat(navigator.language, {
    style: 'unit',
    unit: 'person',
    unitDisplay: 'long'
  }).format(count);
};

/**
 * Formats processing status for display in the UI
 * @param status - Processing status string
 * @returns User-friendly status string
 */
export const formatProcessingStatus = (status: ProcessingStatus): string => {
  const statusDisplayMap: Record<ProcessingStatus, string> = {
    'IDLE': 'Ready',
    'PROCESSING_TRANSCRIPTION': 'Processing Transcription',
    'GENERATING_MINUTES': 'Generating Minutes',
    'DISTRIBUTING': 'Distributing Minutes',
    'COMPLETED': 'Completed',
    'ERROR': 'Error Processing'
  };

  return statusDisplayMap[status] || 'Unknown Status';
};