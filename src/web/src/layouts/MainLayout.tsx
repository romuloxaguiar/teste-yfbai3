import React, { useCallback, useEffect, memo } from 'react';
import { ThemeProvider } from 'styled-components';
import { ErrorBoundary } from 'react-error-boundary';

// Internal imports
import { Container, Header, Content, Footer } from './MainLayout.styles';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';

// Interface definitions
interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
}

// Error fallback component
const ErrorFallback = memo(({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div role="alert" aria-live="assertive">
    <h2>Something went wrong:</h2>
    <pre>{error.message}</pre>
    <button onClick={resetErrorBoundary}>Try again</button>
  </div>
));

ErrorFallback.displayName = 'ErrorFallback';

// Main layout component
const MainLayout: React.FC<MainLayoutProps> = memo(({
  children,
  className,
  showHeader = true,
  showFooter = true
}) => {
  const { currentTheme, toggleTheme, isHighContrast, setHighContrast } = useThemeContext();
  const { isAuthenticated, user, authError, clearError } = useAuthContext();

  // Error logging handler
  const handleError = useCallback((error: Error) => {
    console.error('Layout Error:', error);
    clearError?.();
  }, [clearError]);

  // Theme synchronization with Teams
  useEffect(() => {
    const handleTeamsTheme = () => {
      if ((window as any).microsoftTeams) {
        (window as any).microsoftTeams.getContext((context: any) => {
          if (context.theme) {
            setHighContrast(context.theme === 'contrast');
          }
        });
      }
    };

    if ((window as any).microsoftTeams) {
      handleTeamsTheme();
    }
  }, [setHighContrast]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => window.location.reload()}
    >
      <ThemeProvider theme={currentTheme}>
        <Container className={className} role="application">
          {showHeader && (
            <Header role="banner">
              <nav role="navigation" aria-label="Main navigation">
                {isAuthenticated && user && (
                  <div aria-live="polite">
                    Welcome, {user.username}
                  </div>
                )}
                <div>
                  <button
                    onClick={toggleTheme}
                    aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} theme`}
                  >
                    Toggle Theme
                  </button>
                  <button
                    onClick={() => setHighContrast(!isHighContrast)}
                    aria-label={`${isHighContrast ? 'Disable' : 'Enable'} high contrast`}
                  >
                    High Contrast
                  </button>
                </div>
              </nav>
            </Header>
          )}

          <Content
            role="main"
            aria-label="Main content"
            tabIndex={-1}
          >
            {authError && (
              <div role="alert" aria-live="assertive">
                {authError.message}
                <button onClick={clearError}>Dismiss</button>
              </div>
            )}
            {children}
          </Content>

          {showFooter && (
            <Footer role="contentinfo">
              <p>Automated Meeting Minutes System</p>
              <p>© {new Date().getFullYear()} Your Organization</p>
            </Footer>
          )}
        </Container>
      </ThemeProvider>
    </ErrorBoundary>
  );
});

MainLayout.displayName = 'MainLayout';

export default MainLayout;