import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { rest } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import Meeting from './Meeting';
import { server } from '../../../test/mocks/server';
import { lightTheme, darkTheme, highContrastTheme } from '../../assets/styles/theme';
import { MeetingStatus, ParticipantRole } from '../../../backend/shared/types/meeting.types';
import { ErrorCode, ErrorSeverity } from '../../../backend/shared/constants/error-codes';
import { HttpStatusCode } from '../../../backend/shared/constants/status-codes';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  send = jest.fn();
  close = jest.fn();
}

// Helper function to render component with providers
const renderWithProviders = (
  ui: React.ReactElement,
  {
    route = '/meetings/test-meeting-id',
    theme = lightTheme,
    initialEntries = [route]
  } = {}
) => {
  (global as any).WebSocket = MockWebSocket;
  
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route path="/meetings/:meetingId" element={ui} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
};

// Mock meeting data
const mockMeeting = {
  id: 'test-meeting-id',
  organizerId: 'organizer-id',
  title: 'Test Meeting',
  startTime: new Date('2023-01-01T10:00:00Z'),
  endTime: new Date('2023-01-01T11:00:00Z'),
  status: MeetingStatus.IN_PROGRESS,
  participants: [
    {
      id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      role: ParticipantRole.ORGANIZER,
      joinTime: new Date('2023-01-01T10:00:00Z'),
      isActive: true,
      isSpeaking: false
    }
  ],
  metadata: {
    teamsId: 'teams-123',
    transcriptionEnabled: true,
    recordingEnabled: false,
    autoMinutesEnabled: true,
    processingStatus: 'IDLE',
    processingProgress: 0
  },
  uiState: {
    isControlsVisible: true,
    isStatusOverlayVisible: false,
    selectedTab: 'TRANSCRIPTION',
    errorMessage: null
  }
};

describe('Meeting Page', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  describe('Initial Rendering', () => {
    it('should show loading state initially', () => {
      renderWithProviders(<Meeting />);
      expect(screen.getByLabelText(/loading meeting data/i)).toBeInTheDocument();
    });

    it('should render meeting details after loading', async () => {
      renderWithProviders(<Meeting />);
      await waitFor(() => {
        expect(screen.getByText(mockMeeting.title)).toBeInTheDocument();
        expect(screen.getByText(/1 participants/i)).toBeInTheDocument();
      });
    });

    it('should render meeting controls when loaded', async () => {
      renderWithProviders(<Meeting />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start transcription/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<Meeting />);
      await waitFor(() => {
        expect(screen.getByText(mockMeeting.title)).toBeInTheDocument();
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<Meeting />);
      await waitFor(() => {
        expect(screen.getByText(mockMeeting.title)).toBeInTheDocument();
      });

      const controls = screen.getByRole('button', { name: /start transcription/i });
      controls.focus();
      expect(document.activeElement).toBe(controls);
    });

    it('should render correctly in high contrast mode', async () => {
      renderWithProviders(<Meeting />, { theme: highContrastTheme });
      await waitFor(() => {
        expect(screen.getByText(mockMeeting.title)).toBeInTheDocument();
      });
      
      const container = screen.getByRole('main');
      expect(container).toHaveStyle({ backgroundColor: '#000000', color: '#ffffff' });
    });

    it('should have proper ARIA labels', async () => {
      renderWithProviders(<Meeting />);
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveAttribute('aria-live', 'polite');
        expect(screen.getByRole('region', { name: /meeting transcription/i })).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Functionality', () => {
    let mockWs: MockWebSocket;

    beforeEach(() => {
      mockWs = new MockWebSocket();
      (global as any).WebSocket = jest.fn(() => mockWs);
    });

    it('should establish WebSocket connection on mount', async () => {
      renderWithProviders(<Meeting />);
      await waitFor(() => {
        expect(global.WebSocket).toHaveBeenCalledWith(
          expect.stringContaining('/meetings/test-meeting-id')
        );
      });
    });

    it('should handle WebSocket messages', async () => {
      renderWithProviders(<Meeting />);
      await waitFor(() => {
        expect(screen.getByText(mockMeeting.title)).toBeInTheDocument();
      });

      const message = {
        type: 'status_update',
        payload: { status: 'recording' }
      };

      mockWs.onmessage?.({ data: JSON.stringify(message) } as MessageEvent);
      
      await waitFor(() => {
        expect(screen.getByText(/recording/i)).toBeInTheDocument();
      });
    });

    it('should handle WebSocket disconnection', async () => {
      renderWithProviders(<Meeting />);
      await waitFor(() => {
        expect(screen.getByText(mockMeeting.title)).toBeInTheDocument();
      });

      mockWs.onclose?.();
      
      await waitFor(() => {
        expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display API error messages', async () => {
      server.use(
        rest.get('*/meetings/:id', (req, res, ctx) => {
          return res(
            ctx.status(HttpStatusCode.INTERNAL_SERVER_ERROR),
            ctx.json({
              success: false,
              error: {
                code: ErrorCode.INTERNAL_SERVER_ERROR,
                message: 'Failed to fetch meeting data',
                severity: ErrorSeverity.ERROR
              }
            })
          );
        })
      );

      renderWithProviders(<Meeting />);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/failed to fetch meeting data/i);
      });
    });

    it('should handle WebSocket errors', async () => {
      renderWithProviders(<Meeting />);
      await waitFor(() => {
        expect(screen.getByText(mockMeeting.title)).toBeInTheDocument();
      });

      const mockWs = new MockWebSocket();
      mockWs.onerror?.(new Event('error'));
      
      await waitFor(() => {
        expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
      });
    });

    it('should show retry option on error', async () => {
      server.use(
        rest.get('*/meetings/:id', (req, res, ctx) => {
          return res(ctx.status(HttpStatusCode.SERVICE_UNAVAILABLE));
        })
      );

      renderWithProviders(<Meeting />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Meeting Controls', () => {
    it('should handle transcription toggle', async () => {
      renderWithProviders(<Meeting />);
      await waitFor(() => {
        expect(screen.getByText(mockMeeting.title)).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start transcription/i });
      await userEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop transcription/i })).toBeInTheDocument();
      });
    });

    it('should disable controls when disconnected', async () => {
      renderWithProviders(<Meeting />);
      await waitFor(() => {
        expect(screen.getByText(mockMeeting.title)).toBeInTheDocument();
      });

      const mockWs = new MockWebSocket();
      mockWs.onclose?.();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start transcription/i })).toBeDisabled();
      });
    });
  });
});