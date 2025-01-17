import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import Status from './Status';
import { MeetingContext } from '../../../contexts/MeetingContext';
import { ProcessingStatus } from '../../../types/meeting.types';
import { ErrorCode, ErrorSeverity } from '../../../../backend/shared/constants/error-codes';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Mock translations
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: { [key: string]: string } = {
        'status.idle': 'Waiting to start',
        'status.transcribing': 'Processing meeting transcription',
        'status.generating': 'Generating meeting minutes',
        'status.distributing': 'Distributing meeting minutes',
        'status.completed': 'Minutes generation completed',
        'status.error': options?.context || 'Error processing meeting minutes',
        'status.retry': 'Retry processing',
        'status.unknown': 'Unknown status'
      };
      return translations[key] || key;
    }
  })
}));

// Mock meeting context values
const mockMeetingStates = {
  idle: {
    id: 'test-meeting-1',
    metadata: {
      processingStatus: ProcessingStatus.IDLE,
      processingProgress: 0
    }
  },
  processing: {
    id: 'test-meeting-2',
    metadata: {
      processingStatus: ProcessingStatus.PROCESSING_TRANSCRIPTION,
      processingProgress: 25
    }
  },
  completed: {
    id: 'test-meeting-3',
    metadata: {
      processingStatus: ProcessingStatus.COMPLETED,
      processingProgress: 100
    }
  },
  error: {
    id: 'test-meeting-4',
    metadata: {
      processingStatus: ProcessingStatus.ERROR,
      processingProgress: 0
    }
  }
};

// Helper function to render Status with context
const renderWithContext = (
  meetingState: any = null,
  error: any = null,
  retryProcessing = jest.fn()
) => {
  return render(
    <MeetingContext.Provider
      value={{
        meeting: meetingState,
        error,
        isInitialized: true,
        startMeeting: jest.fn(),
        stopMeeting: jest.fn(),
        updateMeetingState: jest.fn(),
        retryOperation: retryProcessing
      }}
    >
      <Status meetingId="test-meeting" />
    </MeetingContext.Provider>
  );
};

describe('Status Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without errors', () => {
    const { container } = renderWithContext();
    expect(container).toBeInTheDocument();
    expect(screen.getByTestId('meeting-status')).toBeInTheDocument();
  });

  it('displays correct status message for each processing state', () => {
    Object.values(ProcessingStatus).forEach(status => {
      const meetingState = {
        ...mockMeetingStates.idle,
        metadata: { processingStatus: status, processingProgress: 0 }
      };
      
      renderWithContext(meetingState);
      
      const statusElement = screen.getByRole('status');
      expect(statusElement).toBeInTheDocument();
      
      // Verify status message is displayed
      const expectedMessage = screen.getByText((content) => {
        return content.includes(status.toLowerCase());
      });
      expect(expectedMessage).toBeInTheDocument();
      
      // Clean up
      cleanup();
    });
  });

  it('shows progress bar with correct progress value', async () => {
    renderWithContext(mockMeetingStates.processing);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('handles error states correctly', async () => {
    const mockError = {
      code: ErrorCode.TEAMS_API_ERROR,
      message: 'API connection failed',
      severity: ErrorSeverity.ERROR,
      timestamp: new Date()
    };
    
    const mockRetry = jest.fn();
    renderWithContext(mockMeetingStates.error, mockError, mockRetry);

    // Verify error message
    expect(screen.getByText(/API connection failed/i)).toBeInTheDocument();

    // Verify retry button
    const retryButton = screen.getByRole('button', { name: /retry processing/i });
    expect(retryButton).toBeInTheDocument();

    // Test retry functionality
    await userEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithContext(mockMeetingStates.processing);

    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify ARIA attributes
    const statusElement = screen.getByRole('status');
    expect(statusElement).toHaveAttribute('aria-live', 'polite');
    expect(statusElement).toHaveAttribute('aria-atomic', 'true');

    // Verify keyboard navigation
    const retryButton = screen.queryByRole('button');
    if (retryButton) {
      retryButton.focus();
      expect(retryButton).toHaveFocus();
    }
  });

  it('updates status message when processing status changes', async () => {
    const { rerender } = renderWithContext(mockMeetingStates.idle);
    
    // Initial state
    expect(screen.getByText(/waiting to start/i)).toBeInTheDocument();
    
    // Update to processing state
    rerender(
      <MeetingContext.Provider
        value={{
          meeting: mockMeetingStates.processing,
          error: null,
          isInitialized: true,
          startMeeting: jest.fn(),
          stopMeeting: jest.fn(),
          updateMeetingState: jest.fn(),
          retryOperation: jest.fn()
        }}
      >
        <Status meetingId="test-meeting" />
      </MeetingContext.Provider>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/processing meeting transcription/i)).toBeInTheDocument();
    });
  });

  it('supports high contrast mode', () => {
    renderWithContext(mockMeetingStates.processing, null, undefined, true);
    
    const statusContainer = screen.getByTestId('meeting-status');
    expect(statusContainer).toHaveAttribute('highContrast', 'true');
  });

  it('announces status changes to screen readers', async () => {
    const { rerender } = renderWithContext(mockMeetingStates.idle);
    
    // Update status
    rerender(
      <MeetingContext.Provider
        value={{
          meeting: mockMeetingStates.completed,
          error: null,
          isInitialized: true,
          startMeeting: jest.fn(),
          stopMeeting: jest.fn(),
          updateMeetingState: jest.fn(),
          retryOperation: jest.fn()
        }}
      >
        <Status meetingId="test-meeting" />
      </MeetingContext.Provider>
    );
    
    // Verify aria-live region update
    await waitFor(() => {
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(/minutes generation completed/i);
    });
  });
});