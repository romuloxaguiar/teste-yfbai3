import React from 'react';
import { createRoot } from 'react-dom/client';
import { initializeIcons } from '@fluentui/react';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ErrorBoundary } from 'react-error-boundary';
import * as microsoftTeams from '@microsoft/teams-js';

import App from './App';

// Constants
const ROOT_ELEMENT_ID = 'root';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const TELEMETRY_KEY = process.env.REACT_APP_APPINSIGHTS_KEY;
const TEAMS_CLIENT_ID = process.env.REACT_APP_TEAMS_CLIENT_ID;

/**
 * Initializes Application Insights for monitoring and telemetry
 */
const initializeTelemetry = (): void => {
  if (!TELEMETRY_KEY) {
    console.warn('Application Insights key not configured');
    return;
  }

  const appInsights = new ApplicationInsights({
    config: {
      instrumentationKey: TELEMETRY_KEY,
      enableAutoRouteTracking: true,
      enableRequestTracing: true,
      enableCorsCorrelation: true,
      correlationHeaderExcludedDomains: ['*.teams.microsoft.com'],
      enableAjaxPerfTracking: true,
      maxAjaxCallsPerView: 500,
      enableUnhandledPromiseRejectionTracking: true,
      enableDebug: IS_DEVELOPMENT
    }
  });

  appInsights.loadAppInsights();
  appInsights.trackPageView();

  // Add to window for global access
  (window as any).appInsights = appInsights;
};

/**
 * Initializes Microsoft Teams SDK and authentication
 */
const initializeTeams = async (): Promise<void> => {
  try {
    if (!TEAMS_CLIENT_ID) {
      throw new Error('Teams Client ID not configured');
    }

    await microsoftTeams.initialize();
    
    // Get Teams context
    const context = await microsoftTeams.getContext();
    
    // Register error handlers
    microsoftTeams.registerOnThemeChangeHandler((theme) => {
      document.body.setAttribute('data-theme', theme);
    });

    // Set up Teams-specific event listeners
    window.addEventListener('error', (event) => {
      microsoftTeams.appInitialization.notifyFailure({
        reason: microsoftTeams.appInitialization.FailedReason.Other,
        message: event.message
      });
    });

    // Notify successful initialization
    await microsoftTeams.appInitialization.notifySuccess();

  } catch (error) {
    console.error('Teams initialization failed:', error);
    throw error;
  }
};

/**
 * Initializes and renders the React application with all necessary providers
 * and error boundaries
 */
const renderApp = (): void => {
  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  // Initialize Fluent UI icons
  initializeIcons();

  // Initialize monitoring and Teams integration
  initializeTelemetry();
  initializeTeams().catch(console.error);

  // Create React root with concurrent mode
  const root = createRoot(rootElement);

  // Error boundary fallback component
  const ErrorFallback = ({ error }: { error: Error }) => (
    <div role="alert" style={{ padding: '20px' }}>
      <h2>Application Error</h2>
      <pre style={{ color: 'red' }}>{error.message}</pre>
      {IS_DEVELOPMENT && <pre>{error.stack}</pre>}
      <button onClick={() => window.location.reload()}>Reload Application</button>
    </div>
  );

  // Render app with error boundary
  root.render(
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={(error) => {
          console.error('Application error:', error);
          (window as any).appInsights?.trackException({ error });
        }}
      >
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// Initialize application
renderApp();