import { rest } from 'msw'; // v1.2.0
import { HttpStatusCode } from 'http-status-codes'; // v2.2.0
import { v4 as uuidv4 } from 'uuid';
import type { ApiResponse } from '../../src/types/api.types';
import type { WebMeeting } from '../../src/types/meeting.types';
import type { WebMinutes } from '../../src/types/minutes.types';
import { ErrorCode, ErrorSeverity } from '../../../backend/shared/constants/error-codes';
import { MeetingStatus, ParticipantRole } from '../../../backend/shared/types/meeting.types';
import { MinutesStatus, ActionItemStatus, Priority, Impact } from '../../../backend/shared/types/minutes.types';

const BASE_URL = '/api/v1';
const MOCK_DELAY = 500;

// Helper function to create mock meeting data
const createMockMeeting = (overrides?: Partial<WebMeeting>): WebMeeting => {
  const now = new Date();
  return {
    id: uuidv4(),
    organizerId: 'user123',
    title: 'Test Meeting',
    startTime: now,
    endTime: new Date(now.getTime() + 3600000),
    status: MeetingStatus.IN_PROGRESS,
    participants: [
      {
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        role: ParticipantRole.ORGANIZER,
        joinTime: now,
        leaveTime: new Date(now.getTime() + 3600000),
        isActive: true,
        isSpeaking: false
      }
    ],
    metadata: {
      teamsId: 'teams123',
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
    },
    ...overrides
  };
};

// Helper function to create mock minutes data
const createMockMinutes = (overrides?: Partial<WebMinutes>): WebMinutes => {
  return {
    id: uuidv4(),
    meetingId: uuidv4(),
    summary: 'Test meeting summary with key discussion points',
    topics: [
      {
        id: uuidv4(),
        title: 'Project Updates',
        content: 'Discussed current project status and next steps',
        confidence: 0.95,
        subtopics: [],
        isExpanded: true,
        isHighlighted: false
      }
    ],
    actionItems: [
      {
        id: uuidv4(),
        description: 'Follow up on project timeline',
        assigneeId: 'user123',
        dueDate: new Date(),
        status: ActionItemStatus.PENDING,
        confidence: 0.9,
        isEditing: false,
        isSelected: false
      }
    ],
    decisions: [
      {
        id: uuidv4(),
        description: 'Approved new project timeline',
        madeBy: 'John Doe',
        timestamp: new Date(),
        confidence: 0.95,
        isHighlighted: false
      }
    ],
    status: MinutesStatus.GENERATED,
    generatedAt: new Date(),
    uiState: {
      selectedTab: 'SUMMARY',
      isExportModalOpen: false,
      isShareModalOpen: false,
      errorMessage: null
    },
    ...overrides
  };
};

// Meeting handlers
export const meetingHandlers = [
  // GET /meetings/:id
  rest.get(`${BASE_URL}/meetings/:id`, (req, res, ctx) => {
    const response: ApiResponse<WebMeeting> = {
      success: true,
      data: createMockMeeting({ id: req.params.id as string }),
      error: null,
      metadata: {
        timestamp: new Date(),
        requestId: uuidv4(),
        processingTime: 100,
        version: '1.0.0'
      }
    };
    return res(ctx.delay(MOCK_DELAY), ctx.json(response));
  }),

  // POST /meetings
  rest.post(`${BASE_URL}/meetings`, async (req, res, ctx) => {
    const body = await req.json();
    const response: ApiResponse<WebMeeting> = {
      success: true,
      data: createMockMeeting(body),
      error: null,
      metadata: {
        timestamp: new Date(),
        requestId: uuidv4(),
        processingTime: 150,
        version: '1.0.0'
      }
    };
    return res(ctx.delay(MOCK_DELAY), ctx.status(HttpStatusCode.CREATED), ctx.json(response));
  }),

  // PUT /meetings/:id
  rest.put(`${BASE_URL}/meetings/:id`, async (req, res, ctx) => {
    const body = await req.json();
    const response: ApiResponse<WebMeeting> = {
      success: true,
      data: createMockMeeting({ ...body, id: req.params.id as string }),
      error: null,
      metadata: {
        timestamp: new Date(),
        requestId: uuidv4(),
        processingTime: 120,
        version: '1.0.0'
      }
    };
    return res(ctx.delay(MOCK_DELAY), ctx.json(response));
  })
];

// Transcription handlers
export const transcriptionHandlers = [
  // POST /transcription/start
  rest.post(`${BASE_URL}/transcription/start`, async (req, res, ctx) => {
    const response: ApiResponse<{ status: string }> = {
      success: true,
      data: { status: 'STARTED' },
      error: null,
      metadata: {
        timestamp: new Date(),
        requestId: uuidv4(),
        processingTime: 80,
        version: '1.0.0'
      }
    };
    return res(ctx.delay(MOCK_DELAY), ctx.json(response));
  }),

  // POST /transcription/stop
  rest.post(`${BASE_URL}/transcription/stop`, async (req, res, ctx) => {
    const response: ApiResponse<{ status: string }> = {
      success: true,
      data: { status: 'STOPPED' },
      error: null,
      metadata: {
        timestamp: new Date(),
        requestId: uuidv4(),
        processingTime: 90,
        version: '1.0.0'
      }
    };
    return res(ctx.delay(MOCK_DELAY), ctx.json(response));
  })
];

// Minutes handlers
export const minutesHandlers = [
  // GET /minutes/:id
  rest.get(`${BASE_URL}/minutes/:id`, (req, res, ctx) => {
    const response: ApiResponse<WebMinutes> = {
      success: true,
      data: createMockMinutes({ id: req.params.id as string }),
      error: null,
      metadata: {
        timestamp: new Date(),
        requestId: uuidv4(),
        processingTime: 110,
        version: '1.0.0'
      }
    };
    return res(ctx.delay(MOCK_DELAY), ctx.json(response));
  }),

  // POST /minutes/generate
  rest.post(`${BASE_URL}/minutes/generate`, async (req, res, ctx) => {
    const body = await req.json();
    const response: ApiResponse<WebMinutes> = {
      success: true,
      data: createMockMinutes({ meetingId: body.meetingId }),
      error: null,
      metadata: {
        timestamp: new Date(),
        requestId: uuidv4(),
        processingTime: 2500,
        version: '1.0.0'
      }
    };
    return res(ctx.delay(MOCK_DELAY), ctx.json(response));
  }),

  // Error simulation handler
  rest.get(`${BASE_URL}/minutes/error`, (req, res, ctx) => {
    const response: ApiResponse<never> = {
      success: false,
      data: null as never,
      error: {
        code: ErrorCode.AI_PROCESSING_ERROR,
        message: 'Failed to process meeting content',
        details: { reason: 'AI model error' },
        severity: ErrorSeverity.ERROR,
        timestamp: new Date(),
        stackTrace: process.env.NODE_ENV === 'development' ? 'Error stack trace' : undefined
      },
      metadata: {
        timestamp: new Date(),
        requestId: uuidv4(),
        processingTime: 150,
        version: '1.0.0'
      }
    };
    return res(ctx.delay(MOCK_DELAY), ctx.status(HttpStatusCode.INTERNAL_SERVER_ERROR), ctx.json(response));
  })
];