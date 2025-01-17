import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme, highContrastTheme } from '../../../assets/styles/theme';
import Transcription from './Transcription';
import { WebMeeting, ProcessingStatus } from '../../../types/meeting.types';
import { useMeeting } from '../../../hooks/useMeeting';
import { ErrorCode } from '../../../backend/shared/constants/error-codes';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock useMeeting hook
jest.mock('../../../hooks/useMeeting');
const mockUseMeeting = useMeeting as jest.MockedFunction<typeof useMeeting>;

// Helper function to render component with theme
const renderWithTheme = (
  ui: React.ReactNode,
  theme = lightTheme
) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

// Mock meeting data factory
const createMockMeeting = (overrides?: Partial<WebMeeting>): WebMeeting => ({
  id: 'test-meeting-id',
  organizerId: 'organizer-1',
  title: 'Test Meeting',
  startTime: new Date('2023-01-01T10:00:00Z'),
  endTime: new Date('2023-01-01T11:00:00Z'),
  status: 'IN_PROGRESS',
  participants: [
    {
      id: 'participant-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'ORGANIZER',
      joinTime: new Date('2023-01-01T10:00:00Z'),
      leaveTime: new Date('2023-01-01T11:00:00Z'),
      isActive: true,
      isSpeaking: false
    }
  ],
  metadata: {
    teamsId: 'teams-meeting-1',
    transcriptionEnabled: true,
    recordingEnabled: false,
    autoMinutesEnabled: true,
    processingStatus: ProcessingStatus.PROCESSING_TRANSCRIPTION,
    processingProgress: 0
  },
  uiState: {
    isControlsVisible: true,
    isStatusOverlayVisible: false,
    selectedTab: 'TRANSCRIPTION',
    errorMessage: null
  },
  ...overrides
});

describe('Transcription Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    mockUseMeeting.mockReturnValue({
      meeting: null,
      isLoading: true,
      error: null,
      connectionStatus: 'CONNECTED',
      startMeeting: jest.fn(),
      endMeeting: jest.fn(),
      toggleTranscription: jest.fn(),
      retryConnection: jest.fn(),
      clearError: jest.fn()
    });

    const { container } = renderWithTheme(
      <Transcription meetingId="test-meeting-id" />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading transcription')).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('displays transcription content with speaker labels', async () => {
    const mockMeeting = createMockMeeting({
      transcription: [
        {
          id: 'chunk-1',
          speakerId: 'participant-1',
          content: 'Hello, this is a test transcription',
          timestamp: new Date('2023-01-01T10:00:10Z')
        }
      ]
    });

    mockUseMeeting.mockReturnValue({
      meeting: mockMeeting,
      isLoading: false,
      error: null,
      connectionStatus: 'CONNECTED',
      startMeeting: jest.fn(),
      endMeeting: jest.fn(),
      toggleTranscription: jest.fn(),
      retryConnection: jest.fn(),
      clearError: jest.fn()
    });

    renderWithTheme(
      <Transcription meetingId="test-meeting-id" />
    );

    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Hello, this is a test transcription')).toBeInTheDocument();
  });

  it('handles real-time transcription updates', async () => {
    const mockMeeting = createMockMeeting();
    let transcriptionUpdates = [];

    mockUseMeeting.mockReturnValue({
      meeting: mockMeeting,
      isLoading: false,
      error: null,
      connectionStatus: 'CONNECTED',
      startMeeting: jest.fn(),
      endMeeting: jest.fn(),
      toggleTranscription: jest.fn(),
      retryConnection: jest.fn(),
      clearError: jest.fn()
    });

    const { rerender } = renderWithTheme(
      <Transcription meetingId="test-meeting-id" />
    );

    // Simulate transcription updates
    transcriptionUpdates = [
      {
        id: 'chunk-1',
        speakerId: 'participant-1',
        content: 'First update',
        timestamp: new Date()
      }
    ];

    mockUseMeeting.mockReturnValue({
      meeting: { ...mockMeeting, transcription: transcriptionUpdates },
      isLoading: false,
      error: null,
      connectionStatus: 'CONNECTED',
      startMeeting: jest.fn(),
      endMeeting: jest.fn(),
      toggleTranscription: jest.fn(),
      retryConnection: jest.fn(),
      clearError: jest.fn()
    });

    rerender(
      <ThemeProvider theme={lightTheme}>
        <Transcription meetingId="test-meeting-id" />
      </ThemeProvider>
    );

    expect(screen.getByText('First update')).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const mockMeeting = createMockMeeting({
      transcription: Array(20).fill(null).map((_, index) => ({
        id: `chunk-${index}`,
        speakerId: 'participant-1',
        content: `Test content ${index}`,
        timestamp: new Date()
      }))
    });

    mockUseMeeting.mockReturnValue({
      meeting: mockMeeting,
      isLoading: false,
      error: null,
      connectionStatus: 'CONNECTED',
      startMeeting: jest.fn(),
      endMeeting: jest.fn(),
      toggleTranscription: jest.fn(),
      retryConnection: jest.fn(),
      clearError: jest.fn()
    });

    renderWithTheme(
      <Transcription meetingId="test-meeting-id" />
    );

    const transcriptionContainer = screen.getByRole('log');
    
    // Test keyboard navigation
    fireEvent.keyDown(transcriptionContainer, { key: 'End' });
    await waitFor(() => {
      expect(transcriptionContainer.scrollTop).toBeGreaterThan(0);
    });

    fireEvent.keyDown(transcriptionContainer, { key: 'Home' });
    await waitFor(() => {
      expect(transcriptionContainer.scrollTop).toBe(0);
    });
  });

  it('meets accessibility requirements', async () => {
    const mockMeeting = createMockMeeting({
      transcription: [
        {
          id: 'chunk-1',
          speakerId: 'participant-1',
          content: 'Accessibility test content',
          timestamp: new Date()
        }
      ]
    });

    mockUseMeeting.mockReturnValue({
      meeting: mockMeeting,
      isLoading: false,
      error: null,
      connectionStatus: 'CONNECTED',
      startMeeting: jest.fn(),
      endMeeting: jest.fn(),
      toggleTranscription: jest.fn(),
      retryConnection: jest.fn(),
      clearError: jest.fn()
    });

    const { container } = renderWithTheme(
      <Transcription meetingId="test-meeting-id" highContrast />
    );

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Check ARIA attributes
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByLabelText('Meeting transcription')).toBeInTheDocument();

    // Test high contrast mode
    expect(container.querySelector('[data-high-contrast="true"]')).toBeInTheDocument();
  });

  it('handles error states correctly', () => {
    mockUseMeeting.mockReturnValue({
      meeting: null,
      isLoading: false,
      error: {
        code: ErrorCode.TRANSCRIPTION_ERROR,
        message: 'Failed to process transcription',
        severity: 'ERROR',
        timestamp: new Date()
      },
      connectionStatus: 'ERROR',
      startMeeting: jest.fn(),
      endMeeting: jest.fn(),
      toggleTranscription: jest.fn(),
      retryConnection: jest.fn(),
      clearError: jest.fn()
    });

    renderWithTheme(
      <Transcription meetingId="test-meeting-id" />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to process transcription')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});