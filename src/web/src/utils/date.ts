/**
 * @fileoverview Utility functions for date formatting, parsing, and manipulation
 * Provides consistent date formatting with localization support for the web client
 * @version 1.0.0
 */

import { format, parseISO, differenceInMinutes } from 'date-fns'; // v2.30.0
import type { WebMeeting } from '../types/meeting.types';
import type { WebActionItem } from '../types/minutes.types';

/**
 * Default date format strings for consistent display
 */
const DATE_FORMATS = {
  DATE_ONLY: 'PPP', // e.g., "April 29, 2023"
  DATE_TIME: 'PPP p', // e.g., "April 29, 2023 at 2:30 PM"
  TIME_ONLY: 'p', // e.g., "2:30 PM"
} as const;

/**
 * Formats a meeting date and time according to user locale and preferences
 * @param date The date to format
 * @param includeTime Whether to include the time component
 * @returns Formatted date string in locale-specific format
 * @throws Error if date is invalid
 */
export const formatMeetingDate = (date: Date, includeTime: boolean = true): string => {
  try {
    // Handle ISO string dates by parsing them
    const dateObj = date instanceof Date ? date : parseISO(date.toString());
    
    // Validate the date is valid
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date provided');
    }

    // Get user's locale from browser
    const userLocale = navigator.language || 'en-US';
    
    // Format the date based on whether time should be included
    const formatString = includeTime ? DATE_FORMATS.DATE_TIME : DATE_FORMATS.DATE_ONLY;
    
    return format(dateObj, formatString, { locale: userLocale });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Formats an action item due date with null handling and consistent display
 * @param dueDate The due date to format, can be null
 * @returns Formatted due date string or empty string if null
 */
export const formatDueDate = (dueDate: Date | null): string => {
  if (!dueDate) {
    return '';
  }

  try {
    // Handle ISO string dates by parsing them
    const dateObj = dueDate instanceof Date ? dueDate : parseISO(dueDate.toString());
    
    // Validate the date is valid
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid due date provided');
    }

    // Get user's locale from browser
    const userLocale = navigator.language || 'en-US';
    
    // Format due dates with date only (no time component)
    return format(dateObj, DATE_FORMATS.DATE_ONLY, { locale: userLocale });
  } catch (error) {
    console.error('Due date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Calculates and formats the duration between meeting start and end times
 * @param startTime Meeting start time
 * @param endTime Meeting end time
 * @returns Formatted duration string (e.g., "1h 30m")
 * @throws Error if either date is invalid
 */
export const formatDuration = (startTime: Date, endTime: Date): string => {
  try {
    // Handle ISO string dates by parsing them
    const startDate = startTime instanceof Date ? startTime : parseISO(startTime.toString());
    const endDate = endTime instanceof Date ? endTime : parseISO(endTime.toString());
    
    // Validate both dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid start or end time provided');
    }

    // Calculate total minutes between dates
    const totalMinutes = Math.abs(differenceInMinutes(endDate, startDate));
    
    // Extract hours and remaining minutes
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    // Handle edge cases
    if (totalMinutes === 0) {
      return '0m';
    }
    
    // Format the duration string
    const parts: string[] = [];
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0 || parts.length === 0) {
      parts.push(`${minutes}m`);
    }
    
    return parts.join(' ');
  } catch (error) {
    console.error('Duration formatting error:', error);
    return 'Invalid Duration';
  }
};