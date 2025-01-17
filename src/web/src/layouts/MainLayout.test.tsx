import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ErrorBoundary } from 'react-error-boundary';
import MainLayout from './MainLayout';
import { ThemeContext } from '../contexts/ThemeContext';
import { AuthContext } from '../contexts/AuthContext';
import { lightTheme, darkTheme, highContrastTheme } from '../assets/styles/theme';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock window.matchMedia for theme testing
Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock Teams SDK
(window as any).microsoftTeams = {
  initialize: jest.fn(),
  getContext: jest.fn(callback => callback({ theme: 'default' })),
  registerOnThemeChangeHandler: jest.fn(),
};

// Mock auth state
const mockAuthState = {
  isAuthenticated: true,
  user: {
    username: 'testuser@example.com',
    name: 'Test User',
    homeAccountId: '123',
    environment: 'test',
    tenantId: '456',
    localAccountId: '789'
  },
  isLoading: false,
  error: null,
  lastActivity: new Date(),
  sessionExpiry: new Date(Date.now() + 3600000),
  login: jest.fn(),
  logout: jest.fn(),
  getToken: jest.fn(),
  refreshSession: jest.fn(),
  clearError: jest.fn()
};

// Helper function to render component with providers
const renderWithProviders = (
  ui: React.ReactElement,
  {
    theme = lightTheme,
    authState = mockAuthState,
    useErrorBoundary = false
  } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeContext.Provider
      value={{
        currentTheme: theme,
        setTheme: jest.fn(),
        toggleTheme: jest.fn(),
        setHighContrast: jest.fn(),
        isHighContrast: false
      }}
    >
      <AuthContext.Provider value={authState}>
        {useErrorBoundary ? (
          <ErrorBoundary
            fallback={<div>Error Boundary Fallback</div>}
            onError={jest.fn()}
          >
            {children}
          </ErrorBoundary>
        ) : (
          children
        )}
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );

  return {
    ...render(ui, { wrapper: Wrapper }),
    rerender: (newUi: React.ReactElement) => render(newUi, { wrapper: Wrapper })
  };
};

describe('MainLayout Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = renderWithProviders(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    );
    expect(container).toBeInTheDocument();
  });

  it('displays correct layout structure', () => {
    renderWithProviders(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    );

    // Verify header
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(within(header).getByRole('navigation')).toBeInTheDocument();

    // Verify main content
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('aria-label', 'Main content');
    expect(main).toHaveAttribute('tabIndex', '-1');

    // Verify footer
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent('Automated Meeting Minutes System');
  });

  it('handles theme switching correctly', async () => {
    const toggleTheme = jest.fn();
    const setHighContrast = jest.fn();

    renderWithProviders(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>,
      {
        theme: lightTheme
      }
    );

    // Test theme toggle button
    const themeToggle = screen.getByLabelText(/switch to dark theme/i);
    await userEvent.click(themeToggle);
    expect(toggleTheme).toHaveBeenCalled();

    // Test high contrast toggle
    const contrastToggle = screen.getByLabelText(/enable high contrast/i);
    await userEvent.click(contrastToggle);
    expect(setHighContrast).toHaveBeenCalledWith(true);
  });

  it('manages authentication states appropriately', () => {
    renderWithProviders(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    );

    // Verify authenticated user display
    expect(screen.getByText(/welcome, testuser@example.com/i)).toBeInTheDocument();

    // Test with unauthenticated state
    renderWithProviders(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>,
      {
        authState: { ...mockAuthState, isAuthenticated: false, user: null }
      }
    );

    expect(screen.queryByText(/welcome/i)).not.toBeInTheDocument();
  });

  it('handles errors gracefully', () => {
    const ErrorComponent = () => {
      throw new Error('Test error');
    };

    renderWithProviders(
      <MainLayout>
        <ErrorComponent />
      </MainLayout>,
      { useErrorBoundary: true }
    );

    expect(screen.getByText(/error boundary fallback/i)).toBeInTheDocument();
  });

  it('meets accessibility requirements', async () => {
    const { container } = renderWithProviders(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    );

    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Test keyboard navigation
    const main = screen.getByRole('main');
    main.focus();
    expect(document.activeElement).toBe(main);

    // Verify ARIA landmarks
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('supports responsive behavior', () => {
    const { rerender } = renderWithProviders(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    );

    // Test different viewport sizes
    const viewports = [
      { width: 320, height: 568 },  // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1440, height: 900 }  // Desktop
    ];

    viewports.forEach(size => {
      Object.defineProperty(window, 'innerWidth', { value: size.width });
      Object.defineProperty(window, 'innerHeight', { value: size.height });
      window.dispatchEvent(new Event('resize'));

      rerender(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );

      // Verify layout adjustments
      const container = screen.getByRole('application');
      expect(container).toBeInTheDocument();
    });
  });

  it('handles Teams theme synchronization', async () => {
    const teamsContext = { theme: 'dark' };
    (window as any).microsoftTeams.getContext.mockImplementation(callback => 
      callback(teamsContext)
    );

    renderWithProviders(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>
    );

    await waitFor(() => {
      expect(window.microsoftTeams.initialize).toHaveBeenCalled();
      expect(window.microsoftTeams.getContext).toHaveBeenCalled();
    });
  });
});