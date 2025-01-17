import { setupServer } from 'msw/node'; // v1.2.0
import { meetingHandlers, transcriptionHandlers, minutesHandlers } from './handlers';

// Configure default response delay based on environment
const DEFAULT_DELAY = process.env.NODE_ENV === 'test' ? 0 : 1000;

// Enable request logging for debugging if environment variable is set
const ENABLE_LOGGING = process.env.MSW_LOGGING === 'true';

// Combine all handlers into a single array
const handlers = [...meetingHandlers, ...transcriptionHandlers, ...minutesHandlers];

// Create and configure MSW server instance
const server = setupServer(...handlers);

// Configure request logging if enabled
if (ENABLE_LOGGING) {
  server.events.on('request:start', ({ request }) => {
    console.log(`[MSW] ${request.method} ${request.url}`);
  });

  server.events.on('request:match', ({ request, requestId }) => {
    console.log(`[MSW] Request matched: ${requestId}`);
  });

  server.events.on('request:unhandled', ({ request }) => {
    console.warn(`[MSW] Unhandled request: ${request.method} ${request.url}`);
  });

  server.events.on('response:mocked', ({ response, requestId }) => {
    console.log(`[MSW] Response sent for ${requestId}: ${response.status}`);
  });

  server.events.on('request:fail', ({ error, request }) => {
    console.error(`[MSW] Request failed for ${request.method} ${request.url}:`, error);
  });
}

// Configure default response delay
server.events.on('request:match', async ({ response }) => {
  if (DEFAULT_DELAY > 0) {
    await new Promise(resolve => setTimeout(resolve, DEFAULT_DELAY));
  }
  return response;
});

// Configure response validation against type definitions
server.events.on('response:mocked', ({ response }) => {
  try {
    const data = response.clone().json();
    if (!data.success && !data.error) {
      console.error('[MSW] Invalid error response format:', data);
    }
    if (data.success && !data.data) {
      console.error('[MSW] Invalid success response format:', data);
    }
  } catch (error) {
    console.error('[MSW] Response validation failed:', error);
  }
});

// Export configured server instance
export { server };