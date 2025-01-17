import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from 'styled-components';
import Alert from './Alert';
import { lightTheme, darkTheme, highContrastTheme } from '../../../assets/styles/theme';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Helper function to render Alert with theme context
const renderWithTheme = (ui: React.ReactElement, theme = lightTheme) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Alert Component Visual Tests', () => {
  test('renders with correct styles for each alert type', () => {
    const types = ['success', 'error', 'warning', 'info'] as const;
    
    types.forEach(type => {
      const { rerender } = renderWithTheme(
        <Alert 
          type={type}
          message={`Test ${type} message`}
        />
      );

      const alert = screen.getByTestId(`alert-${type}`);
      const icon = alert.querySelector('svg');

      expect(alert).toBeInTheDocument();
      expect(icon).toBeInTheDocument();
      expect(alert).toHaveTextContent(`Test ${type} message`);
      
      // Clean up before next render
      rerender(<></>);
    });
  });

  test('applies correct theme styles', () => {
    const { rerender } = renderWithTheme(
      <Alert
        type="error"
        message="Test message"
      />
    );

    let alert = screen.getByTestId('alert-error');
    expect(alert).toHaveStyle(`background: ${lightTheme.palette.neutralLighter}`);

    // Test dark theme
    rerender(
      <ThemeProvider theme={darkTheme}>
        <Alert type="error" message="Test message" />
      </ThemeProvider>
    );
    
    alert = screen.getByTestId('alert-error');
    expect(alert).toHaveStyle(`background: ${darkTheme.palette.neutralLighter}`);
  });

  test('supports RTL layout', () => {
    renderWithTheme(
      <Alert
        type="info"
        message="RTL test message"
        dir="rtl"
      />
    );

    const alert = screen.getByTestId('alert-info');
    expect(alert).toHaveAttribute('dir', 'rtl');
  });
});

describe('Alert Component Interaction Tests', () => {
  const onDismiss = jest.fn();
  const onRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles dismiss click', async () => {
    renderWithTheme(
      <Alert
        type="info"
        message="Dismissible alert"
        onDismiss={onDismiss}
      />
    );

    const closeButton = screen.getByLabelText('Close alert');
    await userEvent.click(closeButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('handles keyboard dismissal', async () => {
    renderWithTheme(
      <Alert
        type="info"
        message="Keyboard dismissible alert"
        onDismiss={onDismiss}
      />
    );

    const alert = screen.getByTestId('alert-info');
    fireEvent.keyDown(alert, { key: 'Escape' });
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('handles retry action for error alerts', async () => {
    renderWithTheme(
      <Alert
        type="error"
        message="Error with retry"
        onRetry={onRetry}
      />
    );

    const retryButton = screen.getByLabelText('Retry action');
    await userEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('maintains focus management', async () => {
    renderWithTheme(
      <Alert
        type="error"
        message="Focus test alert"
      />
    );

    const alert = screen.getByTestId('alert-error');
    expect(document.activeElement).toBe(alert);
  });
});

describe('Alert Component Accessibility Tests', () => {
  test('meets WCAG 2.1 accessibility guidelines', async () => {
    const { container } = renderWithTheme(
      <Alert
        type="error"
        message="Accessibility test alert"
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('provides correct ARIA attributes', () => {
    renderWithTheme(
      <Alert
        type="error"
        message="ARIA test alert"
      />
    );

    const alert = screen.getByTestId('alert-error');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
  });

  test('supports screen readers', () => {
    const types = ['success', 'error', 'warning', 'info'] as const;
    
    types.forEach(type => {
      const { rerender } = renderWithTheme(
        <Alert
          type={type}
          message={`Screen reader test ${type}`}
        />
      );

      const alert = screen.getByTestId(`alert-${type}`);
      const role = type === 'error' ? 'alert' : 'status';
      
      expect(alert).toHaveAttribute('role', role);
      expect(alert).toHaveAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

      rerender(<></>);
    });
  });
});

describe('Alert Component Performance Tests', () => {
  test('renders efficiently without unnecessary updates', () => {
    const { rerender } = renderWithTheme(
      <Alert
        type="info"
        message="Performance test"
      />
    );

    const initialRender = screen.getByTestId('alert-info');
    
    // Re-render with same props
    rerender(
      <ThemeProvider theme={lightTheme}>
        <Alert
          type="info"
          message="Performance test"
        />
      </ThemeProvider>
    );

    const secondRender = screen.getByTestId('alert-info');
    expect(initialRender).toBe(secondRender);
  });

  test('cleans up on unmount', () => {
    const { unmount } = renderWithTheme(
      <Alert
        type="info"
        message="Cleanup test"
      />
    );

    unmount();
    expect(screen.queryByTestId('alert-info')).not.toBeInTheDocument();
  });
});