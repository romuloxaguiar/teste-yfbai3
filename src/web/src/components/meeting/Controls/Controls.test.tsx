import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import Controls from './Controls';
import { useMeeting } from '../../../hooks/useMeeting';
import { ProcessingStatus } from '../../../types/meeting.types';
import { ErrorCode, ErrorSeverity } from '../../../../backend/shared/constants/error-codes';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock the useMeeting hook
jest.mock('../../../hooks/useMeeting', () => ({
  useMeeting: jest.fn()
}));

// Mock ApplicationInsights
jest.mock('@microsoft/applicationinsights-web', () => ({
  ApplicationInsights: jest.fn().mockImplementation(() => ({
    loadAppInsights: jest.fn(),
    trackEvent: jest.fn(),
    trackException: jest.fn()
  }))
}));

describe('Controls Component', () => {
  // Test meeting data
  const mockMeeting = {
    id: '123',
    metadata: {
      transcriptionEnabled: false,
      processingStatus: ProcessingStatus.IDLE
    }
  };

  // Mock hook functions
  const mockToggleTranscription = jest.fn();
  const mockEndMeeting = jest.fn();
  const mockRetryConnection = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default hook mock implementation
    (useMeeting as jest.Mock).mockReturnValue({
      meeting: mockMeeting,
      error: null,
      isLoading: false,
      connectionStatus: 'CONNECTED',
      toggleTranscription: mockToggleTranscription,
      endMeeting: mockEndMeeting,
      retryConnection: mockRetryConnection,
      clearError: mockClearError
    });
  });

  describe('Rendering', () => {
    it('renders all control buttons correctly', () => {
      render(<Controls meetingId="123" />);

      expect(screen.getByTestId('transcription-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('end-meeting')).toBeInTheDocument();
      expect(screen.getByText(/Start Transcription/i)).toBeInTheDocument();
      expect(screen.getByText(/End Meeting/i)).toBeInTheDocument();
    });

    it('shows correct button states based on meeting status', () => {
      render(<Controls meetingId="123" />);

      const transcriptionButton = screen.getByTestId('transcription-toggle');
      const endMeetingButton = screen.getByTestId('end-meeting');

      expect(transcriptionButton).not.toBeDisabled();
      expect(endMeetingButton).not.toBeDisabled();
      expect(transcriptionButton).toHaveAttribute('aria-label', 'Toggle transcription');
    });

    it('displays processing status indicators when active', () => {
      (useMeeting as jest.Mock).mockReturnValue({
        meeting: {
          ...mockMeeting,
          metadata: {
            ...mockMeeting.metadata,
            processingStatus: ProcessingStatus.PROCESSING_TRANSCRIPTION
          }
        }
      });

      render(<Controls meetingId="123" />);
      expect(screen.getByText(/Processing Transcription/i)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('handles transcription toggle correctly', async () => {
      render(<Controls meetingId="123" />);
      
      const transcriptionButton = screen.getByTestId('transcription-toggle');
      await userEvent.click(transcriptionButton);

      expect(mockToggleTranscription).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(transcriptionButton).not.toBeDisabled();
      });
    });

    it('shows confirmation dialog before ending meeting', async () => {
      render(<Controls meetingId="123" />);
      
      const endButton = screen.getByTestId('end-meeting');
      await userEvent.click(endButton);

      expect(screen.getByText(/Confirm End/i)).toBeInTheDocument();
      await userEvent.click(endButton); // Second click to confirm

      expect(mockEndMeeting).toHaveBeenCalledTimes(1);
    });

    it('prevents actions while loading', async () => {
      (useMeeting as jest.Mock).mockReturnValue({
        meeting: mockMeeting,
        isLoading: true
      });

      render(<Controls meetingId="123" />);
      
      const transcriptionButton = screen.getByTestId('transcription-toggle');
      const endButton = screen.getByTestId('end-meeting');

      expect(transcriptionButton).toBeDisabled();
      expect(endButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays retry button when connection error occurs', () => {
      (useMeeting as jest.Mock).mockReturnValue({
        meeting: null,
        error: {
          code: ErrorCode.TEAMS_API_ERROR,
          message: 'Connection failed',
          severity: ErrorSeverity.ERROR
        }
      });

      render(<Controls meetingId="123" />);
      
      expect(screen.getByText(/Retry Connection/i)).toBeInTheDocument();
    });

    it('handles retry attempts correctly', async () => {
      (useMeeting as jest.Mock).mockReturnValue({
        meeting: null,
        error: {
          code: ErrorCode.TEAMS_API_ERROR,
          message: 'Connection failed',
          severity: ErrorSeverity.ERROR
        }
      });

      render(<Controls meetingId="123" />);
      
      const retryButton = screen.getByText(/Retry Connection/i);
      await userEvent.click(retryButton);

      expect(mockRetryConnection).toHaveBeenCalledTimes(1);
    });

    it('shows error boundary fallback on render errors', () => {
      (useMeeting as jest.Mock).mockImplementation(() => {
        throw new Error('Render error');
      });

      render(<Controls meetingId="123" />);
      
      expect(screen.getByText(/Controls temporarily unavailable/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA requirements', async () => {
      const { container } = render(<Controls meetingId="123" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      render(<Controls meetingId="123" />);
      
      const transcriptionButton = screen.getByTestId('transcription-toggle');
      const endButton = screen.getByTestId('end-meeting');

      transcriptionButton.focus();
      expect(document.activeElement).toBe(transcriptionButton);

      fireEvent.keyDown(transcriptionButton, { key: 'Tab' });
      expect(document.activeElement).toBe(endButton);
    });

    it('provides proper ARIA labels and roles', () => {
      render(<Controls meetingId="123" />);
      
      const transcriptionButton = screen.getByTestId('transcription-toggle');
      const endButton = screen.getByTestId('end-meeting');

      expect(transcriptionButton).toHaveAttribute('aria-label', 'Toggle transcription');
      expect(endButton).toHaveAttribute('aria-label', 'End meeting');
    });

    it('maintains focus management during state changes', async () => {
      render(<Controls meetingId="123" />);
      
      const transcriptionButton = screen.getByTestId('transcription-toggle');
      transcriptionButton.focus();
      await userEvent.click(transcriptionButton);

      await waitFor(() => {
        expect(document.activeElement).toBe(transcriptionButton);
      });
    });
  });

  describe('Performance', () => {
    it('handles rapid button clicks without state issues', async () => {
      render(<Controls meetingId="123" />);
      
      const transcriptionButton = screen.getByTestId('transcription-toggle');
      
      // Simulate rapid clicks
      await userEvent.click(transcriptionButton);
      await userEvent.click(transcriptionButton);
      await userEvent.click(transcriptionButton);

      expect(mockToggleTranscription).toHaveBeenCalledTimes(3);
    });

    it('debounces status updates appropriately', async () => {
      const { rerender } = render(<Controls meetingId="123" />);

      // Simulate multiple rapid status updates
      for (let i = 0; i < 5; i++) {
        (useMeeting as jest.Mock).mockReturnValue({
          meeting: {
            ...mockMeeting,
            metadata: {
              processingStatus: ProcessingStatus.PROCESSING_TRANSCRIPTION
            }
          }
        });
        rerender(<Controls meetingId="123" />);
      }

      // Verify only one status indicator is shown
      expect(screen.getAllByText(/Processing Transcription/i)).toHaveLength(1);
    });
  });
});