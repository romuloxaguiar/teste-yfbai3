import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initializeIcons } from '@fluentui/react';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

// Internal imports
import MainLayout from './layouts/MainLayout';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { MeetingProvider } from './contexts/MeetingContext';

// Lazy-loaded page components
const Meeting = React.lazy(() => import('./pages/Meeting/Meeting'));
const Minutes = React.lazy(() => import('./pages/Minutes/Minutes'));

// Global route constants
const ROUTES = {
  MEETING: '/meeting/:meetingId',
  MINUTES: '/minutes/:meetingId'
} as const;

// Monitoring configuration
const MONITORING_CONFIG = {
  instrumentationKey: process.env.REACT_APP_INSIGHTS_KEY,
  enableDebug: process.env.NODE_ENV === 'development'
} as const;

/**
 * Root application component that provides the application structure,
 * context providers, routing, and Teams integration
 */
const App: React.FC = () => {
  // Initialize application monitoring
  useEffect(() => {
    const appInsights = new ApplicationInsights({
      config: {
        instrumentationKey: MONITORING_CONFIG.instrumentationKey,
        enableAutoRouteTracking: true,
        enableRequestTracing: true,
        enableDebug: MONITORING_CONFIG.enableDebug
      }
    });
    appInsights.loadAppInsights();
    appInsights.trackPageView();
  }, []);

  // Initialize Fluent UI icons
  useEffect(() => {
    initializeIcons();
  }, []);

  // Loading fallback with accessibility support
  const LoadingFallback = () => (
    <div 
      role="status" 
      aria-live="polite"
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}
    >
      <span>Loading...</span>
    </div>
  );

  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <MeetingProvider>
            <MainLayout>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route 
                    path={ROUTES.MEETING} 
                    element={
                      <Meeting />
                    } 
                  />
                  <Route 
                    path={ROUTES.MINUTES} 
                    element={
                      <Minutes />
                    } 
                  />
                  <Route 
                    path="*" 
                    element={
                      <div role="alert">
                        <h1>Page Not Found</h1>
                        <p>The requested page does not exist.</p>
                      </div>
                    } 
                  />
                </Routes>
              </Suspense>
            </MainLayout>
          </MeetingProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;